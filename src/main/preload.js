'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('markcraft', {
  version: '1.2.0',
  platform: process.platform,
  onOpenAbout: (cb) => ipcRenderer.on('open-about', () => cb()),
  prefsGet: () => ipcRenderer.invoke('prefs-get'),
  prefsSet: (data) => ipcRenderer.invoke('prefs-set', data),
  aiComplete: (opts) => ipcRenderer.invoke('ai-complete', opts),
  exportPdf: (payload) => ipcRenderer.invoke('export-pdf', payload)
});
