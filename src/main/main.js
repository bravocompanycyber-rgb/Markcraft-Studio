'use strict';

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let store = null;

function getStore() {
  if (store) return store;
  try {
    const Store = require('electron-store');
    store = new Store({
      name: 'markcraft-config',
      encryptionKey: 'markcraft-local-v1',
      defaults: {
        theme: 'light',
        defaultBg: 'light',
        grid: 'on',
        pngRes: 2700,
        autosave: 180,
        aiProvider: 'none',
        aiBaseUrl: 'https://api.groq.com/openai/v1',
        aiModel: 'llama-3.3-70b-versatile',
        aiApiKey: '',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'llama3.2'
      }
    });
  } catch (e) {
    store = null;
  }
  return store;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 740,
    title: 'Markcraft Studio',
    backgroundColor: '#f0f2f5',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  const template = [
    { label: 'File', submenu: [{ role: 'quit' }] },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [{
        label: 'About Markcraft Studio',
        click: () => { if (mainWindow) mainWindow.webContents.send('open-about'); }
      }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('prefs-get', () => {
  const s = getStore();
  return s ? s.store : null;
});

ipcMain.handle('prefs-set', (event, data) => {
  const s = getStore();
  if (!s) return false;
  Object.keys(data || {}).forEach(k => s.set(k, data[k]));
  return true;
});

ipcMain.handle('ai-complete', async (event, { provider, prompt, system }) => {
  const s = getStore();
  if (!s) return { error: 'Store not available' };
  const aiProvider = provider || s.get('aiProvider') || 'none';
  if (aiProvider === 'none') return { error: 'AI is disabled in Preferences' };

  try {
    if (aiProvider === 'groq') {
      const key = s.get('aiApiKey') || '';
      if (!key) return { error: 'No Groq API key set in Preferences' };
      const base = (s.get('aiBaseUrl') || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
      const model = s.get('aiModel') || 'llama-3.3-70b-versatile';
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system || 'You are a concise expert logo and brand designer. Reply with clear, practical suggestions only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 900
        })
      });
      if (!res.ok) {
        const t = await res.text();
        return { error: `Groq ${res.status}: ${t.slice(0, 240)}` };
      }
      const json = await res.json();
      return { text: json.choices?.[0]?.message?.content || '' };
    }

    if (aiProvider === 'ollama') {
      const url = (s.get('ollamaUrl') || 'http://localhost:11434').replace(/\/$/, '');
      const model = s.get('ollamaModel') || 'llama3.2';
      const res = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: (system ? system + '\n\n' : '') + prompt,
          stream: false
        })
      });
      if (!res.ok) {
        const t = await res.text();
        return { error: `Ollama ${res.status}: ${t.slice(0, 240)}` };
      }
      const json = await res.json();
      return { text: json.response || '' };
    }
    return { error: 'Unknown AI provider' };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

ipcMain.handle('export-pdf', async (event, payload) => {
  try {
    const { buildBrandPdf } = require('./pdf-export');
    const bytes = await buildBrandPdf(payload);
    const brand = (payload.brand || 'brand').replace(/[^a-z0-9-_]/gi, '-');
    const defaultPath = path.join(app.getPath('documents'), `${brand}-brand-guidelines.pdf`);
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Brand Guidelines PDF',
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { canceled: true };
    fs.writeFileSync(filePath, bytes);
    return { ok: true, path: filePath };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
