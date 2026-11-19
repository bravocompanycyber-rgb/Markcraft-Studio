'use strict';

/**
 * Markcraft Studio 1.0 — Complete production application
 */

const $ = id => document.getElementById(id);

// ─────────────────────────────────────────────
// PREFERENCES (localStorage)
// ─────────────────────────────────────────────
const PREFS_KEY = 'markcraft-prefs-v1';
const defaultPrefs = {
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
};

function loadPrefsLocal() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...defaultPrefs };
}

function savePrefsLocal(p) {
  // Never persist key in a way that is trivial — still local only
  const { aiApiKey, ...safe } = p;      // the API key lives only in the encrypted main-process store
  localStorage.setItem(PREFS_KEY, JSON.stringify(safe));
}

let prefs = loadPrefsLocal();

async function loadPrefsAsync() {
  if (window.markcraft && window.markcraft.prefsGet) {
    try {
      const remote = await window.markcraft.prefsGet();
      if (remote && typeof remote === 'object') {
        prefs = { ...defaultPrefs, ...remote };
        savePrefsLocal(prefs);
        return prefs;
      }
    } catch (_) {}
  }
  prefs = loadPrefsLocal();
  return prefs;
}

async function persistPrefs(p) {
  prefs = { ...prefs, ...p };
  savePrefsLocal(prefs);
  if (window.markcraft && window.markcraft.prefsSet) {
    try { await window.markcraft.prefsSet(prefs); } catch (_) {}
  }
}

function applyTheme(theme) {
  let resolved = theme;
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved);
}

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const state = {
  schemaVersion: 3,
  id: 'project-' + Date.now(),
  name: 'Untitled identity',
  brief: {
    brand: 'NORTHSTAR',
    descriptor: 'STUDIO',
    industry: 'Business / Company',
    personality: 'Premium & minimal',
    palette: 'Navy & gold',
    notes: ''
  },
  design: null,            // set below from defaultDesign()
  selectedId: null,
  tool: 'select',
  view: 'gallery',
  zoom: 100,
  pan: { x: 0, y: 0 },
  colorMode: 'rgb',
  dirty: false,
  lastWarnings: [],
  lastBBox: null
};

const PALETTES = {
  'Midnight & champagne': ['#c9a227', '#1e2a3a', '#e8d48b'],
  'Navy & gold':          ['#1a365d', '#c9a227', '#e8d48b'],
  'Forest & ivory':       ['#1e3d2f', '#c5b358', '#e8f0e0'],
  'Monochrome':           ['#1a1a1a', '#4a4a4a', '#e8e8e8'],
  'Royal blue & gold':    ['#0f2c5c', '#c9a227', '#e8d48b'],
  'Terracotta & sand':    ['#c47a4a', '#3a2a20', '#f0e0c8'],
  'Deep navy & silver':   ['#1a2a3a', '#8a9aaa', '#d0d8e0'],
  'Emerald & cream':      ['#1a3a30', '#2a8a6a', '#f0ebe0'],
  'Coral & slate':        ['#d46a5a', '#2a3038', '#f0d8d0'],
  'Indigo & amber':       ['#2a2a5a', '#c48a20', '#f0e0b0'],
  'Slate & copper':       ['#2c3e50', '#b87333', '#e8dcc8'],
  'Custom colours':       ['#1a365d', '#c9a227', '#e8d48b']
};

// ─────────────────────────────────────────────
// SYSTEM FONTS
// ─────────────────────────────────────────────
const SYSTEM_FONTS = [
  { label: 'Georgia (Serif)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Palatino / Book Antiqua', value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
  { label: 'Garamond', value: "Garamond, 'EB Garamond', serif" },
  { label: 'Segoe UI (Sans)', value: "'Segoe UI', system-ui, sans-serif" },
  { label: 'Arial', value: "Arial, Helvetica, sans-serif" },
  { label: 'Helvetica', value: "Helvetica, Arial, sans-serif" },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', 'Arial Narrow', sans-serif" },
  { label: 'Verdana', value: "Verdana, Geneva, sans-serif" },
  { label: 'Tahoma', value: "Tahoma, Geneva, sans-serif" },
  { label: 'Calibri', value: "Calibri, 'Segoe UI', sans-serif" },
  { label: 'Candara', value: "Candara, Calibri, sans-serif" },
  { label: 'Century Gothic', value: "'Century Gothic', CenturyGothic, sans-serif" },
  { label: 'Futura / Avenir', value: "Futura, 'Avenir Next', Avenir, sans-serif" },
  { label: 'Impact / Display', value: "Impact, Haettenschweiler, 'Arial Black', sans-serif" },
  { label: 'Arial Black', value: "'Arial Black', Gadget, sans-serif" },
  { label: 'Courier New (Mono)', value: "'Courier New', Courier, monospace" },
  { label: 'Consolas', value: "Consolas, 'Courier New', monospace" },
  { label: 'Lucida Console', value: "'Lucida Console', Monaco, monospace" }
];

state.design = defaultDesign();

function populateFonts() {
  const sel = $('fontFamily');
  if (!sel) return;
  sel.innerHTML = '<option value="">Auto — matched to the concept</option>' + SYSTEM_FONTS.map(f =>
    `<option value="${f.value.replace(/"/g, '&quot;')}">${f.label}</option>`
  ).join('');
  sel.value = state.design.font || '';
}

// ─────────────────────────────────────────────
// COLOUR UTILITIES (RGB ↔ CMYK, harmony)
// ─────────────────────────────────────────────
function hexToRgb(hex) {
  const c = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(c)) return [0, 0, 0];
  return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

function rgbToCmyk(r, g, b) {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1) return [0, 0, 0, 100];
  const c = Math.round(((1 - rr - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gg - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bb - k) / (1 - k)) * 100);
  return [c, m, y, Math.round(k * 100)];
}

function cmykToRgb(c, m, y, k) {
  const kk = k / 100;
  const r = 255 * (1 - c / 100) * (1 - kk);
  const g = 255 * (1 - m / 100) * (1 - kk);
  const b = 255 * (1 - y / 100) * (1 - kk);
  return [r, g, b];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      default: h = ((r - g) / d + 4); break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function applyHarmony(type) {
  const [r, g, b] = hexToRgb(state.design.primary);
  const [h, s, l] = rgbToHsl(r, g, b);
  let h2, h3;
  if (type === 'complement') {
    h2 = (h + 180) % 360;
    state.design.secondary = rgbToHex(...hslToRgb(h2, s, clamp(l, 20, 40)));
    state.design.accent = rgbToHex(...hslToRgb(h, Math.max(s - 20, 10), clamp(l + 25, 60, 90)));
  } else if (type === 'analogous') {
    h2 = (h + 30) % 360;
    h3 = (h + 330) % 360;
    state.design.secondary = rgbToHex(...hslToRgb(h2, s, clamp(l - 15, 15, 40)));
    state.design.accent = rgbToHex(...hslToRgb(h3, Math.max(s - 10, 15), clamp(l + 20, 55, 88)));
  } else if (type === 'triad') {
    h2 = (h + 120) % 360;
    h3 = (h + 240) % 360;
    state.design.secondary = rgbToHex(...hslToRgb(h2, s, clamp(l - 10, 18, 42)));
    state.design.accent = rgbToHex(...hslToRgb(h3, Math.max(s - 15, 12), clamp(l + 18, 55, 85)));
  } else if (type === 'mono') {
    state.design.secondary = rgbToHex(...hslToRgb(h, Math.max(s - 30, 5), clamp(l - 25, 12, 35)));
    state.design.accent = rgbToHex(...hslToRgb(h, Math.max(s - 20, 8), clamp(l + 30, 65, 92)));
  }
  syncColorInputs();
  render();
  updateSwatches();
  $('statusMsg').textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' harmony applied';
}

function syncColorInputs() {
  $('primaryColor').value = state.design.primary;
  $('primaryHex').value = state.design.primary;
  $('secondaryColor').value = state.design.secondary;
  $('secondaryHex').value = state.design.secondary;
  $('accentColor').value = state.design.accent;
  $('accentHex').value = state.design.accent;
  updateCmykFromHex('primary', state.design.primary);
  updateCmykFromHex('secondary', state.design.secondary);
}

function updateCmykFromHex(which, hex) {
  const [r, g, b] = hexToRgb(hex);
  const [c, m, y, k] = rgbToCmyk(r, g, b);
  if (which === 'primary') {
    if ($('pC')) { $('pC').value = c; $('pM').value = m; $('pY').value = y; $('pK').value = k; }
  } else {
    if ($('sC')) { $('sC').value = c; $('sM').value = m; $('sY').value = y; $('sK').value = k; }
  }
}

function updateSwatches() {
  const p = state.design.primary;
  const s = state.design.secondary;
  const a = state.design.accent;
  if ($('swatchPrimary')) $('swatchPrimary').style.background = p;
  if ($('swatchSecondary')) $('swatchSecondary').style.background = s;
  if ($('swatchAccent')) $('swatchAccent').style.background = a;
  if ($('swatchGradient')) {
    $('swatchGradient').style.background = `linear-gradient(135deg, ${p}, ${a})`;
  }
}

// ─────────────────────────────────────────────
// SYMBOL ENGINE
// ─────────────────────────────────────────────
function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  }[c]));
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// ENGINE BRIDGE
// The logo is composed by logo-engine.js (measured layout, layered
// icon library, frames, ornaments). app.js only holds UI state.
// ─────────────────────────────────────────────
const Engine = window.MarkcraftEngine;
const IconLib = window.MarkcraftIcons;
const SVG_NS = 'http://www.w3.org/2000/svg';

function defaultDesign() {
  return {
    layout: 'stacked',
    icon: 'monogram',
    frame: 'circle',
    fill: 'solid',
    ornament: 'none',
    finish: 'flat',
    backdrop: 'none',
    badgeIcon: '',
    wordmarkStyle: 'plain',
    fontKey: 'serif',
    font: '',                 // '' = automatic (matched to the concept); otherwise a CSS stack override
    fontWeight: '600',
    caseStyle: 'upper',
    tracking: 4,
    roles: 'std',
    primary: '#1a365d',
    secondary: '#c9a227',
    accent: '#e8d48b',
    gradientMode: 'none',
    scale: 100,
    symbolSize: 100,
    offsetX: 0,
    offsetY: 0,
    align: 'center',
    background: 'light',
    customBg: '#f7f5f0'
  };
}

function artboardBg() {
  const d = state.design;
  if (d.background === 'dark') return '#1a1f28';
  if (d.background === 'custom') return d.customBg || '#f7f5f0';
  return '#ffffff';
}

function liveBrief() {
  const n = $('editName') ? $('editName').value.trim() : '';
  const t = $('editDescriptor') ? $('editDescriptor').value.trim() : null;
  return {
    brand: n || state.brief.brand || 'YOUR BRAND',
    descriptor: t != null ? t : (state.brief.descriptor || '')
  };
}

function designForEngine() {
  const d = { ...state.design };
  if (d.font) d.fontCss = d.font;
  return d;
}

function buildSvg() {
  const r = Engine.render(designForEngine(), liveBrief(), { bg: artboardBg(), idPrefix: 'ed' });
  state.lastWarnings = r.warnings;
  state.lastBBox = r.bbox;
  return r.svg;
}

/** Tight-cropped SVG for export (the artboard is only a working canvas). */
function exportGeometry(padRatio = 0.1) {
  const svg = buildSvg();
  const b = state.lastBBox;
  const pad = Math.max(b.w, b.h) * padRatio;
  const vx = b.x - pad, vy = b.y - pad, vw = b.w + pad * 2, vh = b.h + pad * 2;
  const out = svg.replace('viewBox="0 0 900 600"',
    `viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" width="${Math.round(vw * 2)}" height="${Math.round(vh * 2)}"`);
  return { svg: out, vw, vh };
}

// ─────────────────────────────────────────────
// QUALITY + RENDER
// ─────────────────────────────────────────────
function iconLabel(id) {
  if (!id || id === 'none') return 'None';
  return (IconLib.ICONS[id] && IconLib.ICONS[id].label) || id;
}

function updateQuality() {
  const d = state.design;
  const bg = artboardBg();
  const ratio = contrastRatio(d.primary, bg);
  const brief = liveBrief();
  const items = [];

  if (ratio >= 4.5) items.push(['good', `✓ Strong contrast (${ratio.toFixed(1)}:1)`]);
  else if (ratio >= 3) items.push(['warn', `! Moderate contrast (${ratio.toFixed(1)}:1)`]);
  else items.push(['bad', `✗ Low contrast (${ratio.toFixed(1)}:1) — the engine lightens the ink automatically`]);

  if (!($('editName') && $('editName').value.trim())) items.push(['bad', '✗ Brand name is empty']);
  else if (brief.brand.length > 22) items.push(['warn', '! Long name — consider a stacked or ribbon layout']);
  else items.push(['good', '✓ Brand name length suitable']);

  (state.lastWarnings || []).forEach(w => items.push(['warn', '! ' + w]));

  if (state.lastBBox) {
    const b = state.lastBBox;
    const margin = Math.min(b.x, 900 - (b.x + b.w), b.y, 600 - (b.y + b.h));
    if (margin < 24) items.push(['warn', '! Logo is very close to the artboard edge']);
    else items.push(['good', '✓ Clear space around the logo']);
  }

  if ((d.gradientMode || 'none') === 'none') items.push(['good', '✓ Flat colour — prints clean, scales forever']);
  else items.push(['warn', '! Gradient — check one-colour and small-size versions']);

  const uniq = new Set([d.primary, d.secondary, d.accent].map(c => String(c).toLowerCase())).size;
  items.push([uniq <= 3 ? 'good' : 'warn', `${uniq <= 3 ? '✓' : '!'} ${uniq} brand colour${uniq === 1 ? '' : 's'}`]);
  items.push(['good', '✓ Pure vector — scales infinitely']);

  $('qualityList').innerHTML = items.map(([cls, txt]) => `<li class="${cls}">${escapeXml(txt)}</li>`).join('');
  const issues = items.filter(x => x[0] !== 'good').length;
  $('qualityCount').textContent = issues === 0 ? 'Clean' : issues + (issues === 1 ? ' issue' : ' issues');
  $('contrastText').textContent = ratio >= 4.5
    ? `Excellent · ${ratio.toFixed(1)}:1`
    : `Needs attention · ${ratio.toFixed(1)}:1`;
  $('contrastCard').querySelector('.contrast-indicator').style.background =
    ratio >= 4.5 ? 'var(--accent)' : ratio >= 3 ? 'var(--warn)' : 'var(--danger)';
}

function render() {
  const svgStr = buildSvg();
  const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    $('statusMsg').textContent = 'Could not draw the logo — check the brand text';
    return;
  }
  const newSvg = doc.documentElement;
  newSvg.id = 'logoSvg';
  const old = $('logoSvg');
  if (old && old.parentNode) old.parentNode.replaceChild(document.importNode(newSvg, true), old);

  const artboard = $('artboard');
  artboard.classList.remove('dark', 'transparent');
  artboard.style.background = '';
  if (state.design.background === 'dark') artboard.classList.add('dark');
  else if (state.design.background === 'transparent') artboard.classList.add('transparent');
  else if (state.design.background === 'custom') artboard.style.background = state.design.customBg;

  updateQuality();
  updateLayers();
  updateSwatches();
  refreshSelection();
  $('canvasStatus').textContent = `Ready · Vector 900×600 · ${state.zoom}%`;
  if (!state._restoring) scheduleHistory();
}

// ─────────────────────────────────────────────
// LAYERS + SELECTION (click a layer or the logo itself)
// ─────────────────────────────────────────────
const LAYER_ORDER = ['wordmark', 'tagline', 'symbol', 'ornament'];

function updateLayers() {
  const list = $('layerList');
  const svg = $('logoSvg');
  if (!list || !svg) return;
  const present = new Set([...svg.querySelectorAll('[data-layer]')].map(e => e.getAttribute('data-layer')));
  const brief = liveBrief();
  const names = {
    wordmark: 'Wordmark · ' + brief.brand,
    tagline: 'Tagline · ' + brief.descriptor,
    symbol: 'Symbol · ' + (state.design.layout === 'monogram' ? 'Monogram' : iconLabel(state.design.icon)),
    ornament: 'Ornaments & rules'
  };
  const layers = LAYER_ORDER.filter(id => present.has(id));
  if (state.selectedId && !present.has(state.selectedId)) state.selectedId = null;
  list.innerHTML = layers.map(id => `
    <li class="layer-item ${state.selectedId === id ? 'selected' : ''}" data-id="${id}">
      <span class="vis">◉</span>
      <span class="name">${escapeXml(names[id])}</span>
    </li>`).join('');
  list.querySelectorAll('.layer-item').forEach(el => {
    el.addEventListener('click', () => selectLayer(el.dataset.id));
  });
}

function selectLayer(id) {
  state.selectedId = state.selectedId === id ? null : id;
  updateLayers();
  refreshSelection();
}

function refreshSelection() {
  const svg = $('logoSvg');
  if (!svg) return;
  svg.querySelectorAll('.sel-box').forEach(n => n.remove());
  const info = $('selectionInfo');
  if (!state.selectedId) { if (info) info.textContent = 'No selection'; return; }
  const els = svg.querySelectorAll(`[data-layer="${state.selectedId}"]`);
  if (!els.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  els.forEach(el => {
    try {
      const b = el.getBBox();
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    } catch (_) {}
  });
  if (!isFinite(x0)) return;
  const r = document.createElementNS(SVG_NS, 'rect');
  const pad = 6;
  r.setAttribute('class', 'sel-box');
  r.setAttribute('x', x0 - pad); r.setAttribute('y', y0 - pad);
  r.setAttribute('width', x1 - x0 + pad * 2); r.setAttribute('height', y1 - y0 + pad * 2);
  r.setAttribute('fill', 'none'); r.setAttribute('stroke', '#2a7de1');
  r.setAttribute('stroke-width', '1.4'); r.setAttribute('stroke-dasharray', '5 4');
  r.setAttribute('vector-effect', 'non-scaling-stroke'); r.setAttribute('pointer-events', 'none');
  els[0].parentNode.appendChild(r);
  if (info) info.textContent = 'Selected: ' + state.selectedId;
}

// ─────────────────────────────────────────────
// UI ⇄ STATE
// ─────────────────────────────────────────────
function fillSelect(id, entries, withBlank) {
  const sel = $(id);
  if (!sel) return;
  sel.innerHTML = (withBlank ? `<option value="">${withBlank}</option>` : '') +
    entries.map(([v, l]) => `<option value="${v}">${escapeXml(l)}</option>`).join('');
}

function populateEngineSelects() {
  fillSelect('composition', Object.entries(Engine.LAYOUTS));
  fillSelect('symbolKind', IconLib.iconList().map(i => [i.id, i.label]).concat([['none', 'None (wordmark only)']]));
  fillSelect('frameKind', IconLib.frameList().map(f => [f.id, f.label]));
  fillSelect('fillStyle', Object.entries(Engine.FILLS));
  fillSelect('ornamentKind', Object.entries(IconLib.ORNAMENTS));
  fillSelect('finishKind', Object.entries(Engine.FINISHES));
  fillSelect('backdropKind', Object.entries(Engine.BACKDROPS));
  fillSelect('secondKind', IconLib.iconList().filter(i => i.id !== 'monogram').map(i => [i.id, i.label]), 'None');
  fillSelect('wordmarkStyle', Object.entries(Engine.WORDMARK_STYLES));
}

function syncUI() {
  const d = state.design;
  const set = (id, v) => { const el = $(id); if (el) el.value = v; };
  set('editName', state.brief.brand || '');
  set('editDescriptor', state.brief.descriptor || '');
  set('fontFamily', d.font || '');
  set('fontWeight', String(d.fontWeight));
  set('caseStyle', d.caseStyle);
  set('tracking', d.tracking); set('trackingVal', d.tracking);
  if ($('trackingVal')) $('trackingVal').textContent = d.tracking;
  set('scale', d.scale); if ($('scaleVal')) $('scaleVal').textContent = d.scale + '%';
  set('symbolSize', d.symbolSize); if ($('symbolSizeVal')) $('symbolSizeVal').textContent = d.symbolSize + '%';
  set('offsetY', d.offsetY); if ($('offsetYVal')) $('offsetYVal').textContent = d.offsetY;
  set('offsetX', d.offsetX); if ($('offsetXVal')) $('offsetXVal').textContent = d.offsetX;
  set('composition', d.layout);
  set('symbolKind', d.icon || 'none');
  set('frameKind', d.frame);
  set('fillStyle', d.fill);
  set('ornamentKind', d.ornament);
  set('finishKind', d.finish || 'flat');
  set('backdropKind', d.backdrop || 'none');
  set('secondKind', d.badgeIcon || '');
  set('wordmarkStyle', d.wordmarkStyle);
  if ($('rolesSwap')) $('rolesSwap').checked = d.roles === 'swap';
  set('gradientMode', d.gradientMode || 'none');
  set('bgMode', d.background);
  if ($('customBgRow')) $('customBgRow').hidden = d.background !== 'custom';
  set('customBgColor', d.customBg); set('customBgHex', d.customBg);
  document.querySelectorAll('.align-btn').forEach(b => b.classList.toggle('active', b.dataset.align === d.align));
  syncColorInputs();
}

// ─────────────────────────────────────────────
// UNDO / REDO  (design + text snapshots)
// ─────────────────────────────────────────────
const hist = { stack: [], idx: -1, timer: null };

function snapshot() {
  const b = liveBrief();
  return JSON.stringify({ brief: { brand: b.brand, descriptor: b.descriptor }, design: state.design });
}
function scheduleHistory() {
  clearTimeout(hist.timer);
  hist.timer = setTimeout(pushHistory, 350);
  state.dirty = true;
}
function pushHistory() {
  clearTimeout(hist.timer);
  const s = snapshot();
  if (hist.stack[hist.idx] === s) return;
  hist.stack = hist.stack.slice(0, hist.idx + 1);
  hist.stack.push(s);
  if (hist.stack.length > 100) hist.stack.shift();
  hist.idx = hist.stack.length - 1;
}
function restoreHistory(i) {
  const o = JSON.parse(hist.stack[i]);
  state.brief.brand = o.brief.brand;
  state.brief.descriptor = o.brief.descriptor;
  state.design = o.design;
  state._restoring = true;
  syncUI();
  render();
  state._restoring = false;
}
function undo() {
  pushHistory();
  if (hist.idx > 0) { hist.idx--; restoreHistory(hist.idx); $('statusMsg').textContent = 'Undo'; }
  else $('statusMsg').textContent = 'Nothing to undo';
}
function redo() {
  clearTimeout(hist.timer);
  if (hist.idx < hist.stack.length - 1) { hist.idx++; restoreHistory(hist.idx); $('statusMsg').textContent = 'Redo'; }
  else $('statusMsg').textContent = 'Nothing to redo';
}

// ─────────────────────────────────────────────
// CONCEPT GALLERY — 4 logos at a time, click to choose
// ─────────────────────────────────────────────
const FAV_KEY = 'markcraft-favs-v1';
const gallery = { pages: [], page: 0, history: { keys: [], layouts: [], icons: [] }, sig: '' };
let favs = (() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (_) { return []; } })();

function saveFavs() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs.slice(0, 24))); } catch (_) {}
}

function readBriefPanel() {
  const paletteKey = $('palette').value;
  let colors = PALETTES[paletteKey] || PALETTES['Navy & gold'];
  if (paletteKey === 'Custom colours') colors = [state.design.primary, state.design.secondary, state.design.accent];
  return {
    brand: $('brandName').value.trim() || 'BRAND',
    descriptor: $('descriptor').value.trim(),
    industry: $('industry').value,
    personality: $('personality').value,
    notes: $('notes').value.trim(),
    palette: colors.slice(),
    paletteKey
  };
}

function commitBrief(b) {
  state.brief = {
    brand: b.brand, descriptor: b.descriptor, industry: b.industry,
    personality: b.personality, palette: b.paletteKey, notes: b.notes
  };
}

function withColours(rec, colors) {
  return { ...rec, primary: colors[0], secondary: colors[1], accent: colors[2] || colors[0] };
}

function generateRound() {
  const b = readBriefPanel();
  commitBrief(b);
  const sig = [b.brand, b.industry, b.personality, b.notes, b.palette.join()].join('|');
  if (sig !== gallery.sig) {
    gallery.history = { keys: [], layouts: [], icons: [] };
    gallery.pages = [];
    gallery.sig = sig;
  }
  const recs = Engine.generate(b, { count: 4, history: gallery.history, bias: state._aiSymbolBias || [] });
  recs.forEach(r => {
    gallery.history.keys.push(Engine.keyOf(r));
    gallery.history.layouts.push(r.layout);
    gallery.history.icons.push(r.icon);
  });
  gallery.pages.push({ title: 'Fresh concepts', brief: b, items: recs.map(r => withColours(r, b.palette)) });
  gallery.page = gallery.pages.length - 1;
  showGallery();
  $('statusMsg').textContent = `Round ${gallery.pages.length}: 4 new directions — click one to open it`;
}

function generateLike(rec) {
  const pg = gallery.pages[gallery.page];
  const b = pg ? pg.brief : readBriefPanel();
  const vars = Engine.variations(rec, b, { count: 4 });
  gallery.pages.push({ title: 'More like “' + rec.label + '”', brief: b, items: vars.map(r => withColours(r, b.palette)) });
  gallery.page = gallery.pages.length - 1;
  showGallery();
}

function tileSvg(rec, brief, idPrefix) {
  const r = Engine.render(rec, { brand: brief.brand, descriptor: brief.descriptor }, { bg: artboardBg(), idPrefix });
  const b = r.bbox;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const w = Math.max(b.w * 1.12, b.h * 1.12 * 1.55);
  const h = w / 1.55;
  return r.svg.replace('viewBox="0 0 900 600"', `viewBox="${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}"`);
}

function isFav(rec) {
  const k = Engine.keyOf(rec) + '|' + rec.primary + rec.secondary;
  return favs.some(f => Engine.keyOf(f) + '|' + f.primary + f.secondary === k);
}

function renderGallery() {
  const grid = $('galleryGrid');
  if (!grid) return;
  const pg = gallery.pages[gallery.page];
  if (!pg) { grid.innerHTML = ''; return; }
  const bg = artboardBg();
  grid.innerHTML = pg.items.map((rec, i) => `
    <div class="g-card" data-i="${i}">
      <div class="g-art" style="background:${bg}" title="Click to open in the editor">${tileSvg(rec, pg.brief, 'g' + gallery.page + '-' + i)}</div>
      <div class="g-bar">
        <span class="g-label" title="${escapeXml(rec.label)}">${escapeXml(rec.label)}</span>
        <button class="g-fav ${isFav(rec) ? 'on' : ''}" data-act="fav" title="Save to favourites">♥</button>
        <button class="btn subtle tiny" data-act="like">More like this</button>
        <button class="btn primary tiny" data-act="choose">Choose</button>
      </div>
    </div>`).join('');
  $('galTitle').textContent = pg.title;
  $('galPage').textContent = `Round ${gallery.page + 1} of ${gallery.pages.length}`;
  $('galPrev').disabled = gallery.page <= 0;
  $('galNext').disabled = gallery.page >= gallery.pages.length - 1;
}

function chooseConcept(rec, brief) {
  const d = state.design;
  Object.assign(d, {
    layout: rec.layout, icon: rec.icon, frame: rec.frame, fill: rec.fill, ornament: rec.ornament,
    finish: rec.finish || 'flat', backdrop: rec.backdrop || 'none', badgeIcon: rec.badgeIcon || '',
    wordmarkStyle: rec.wordmarkStyle, fontKey: rec.fontKey, font: '', fontWeight: String(rec.fontWeight),
    caseStyle: rec.caseStyle, tracking: rec.tracking, roles: rec.roles, gradientMode: rec.gradientMode || 'none',
    symbolSize: rec.symbolSize || 100, scale: rec.scale || 100, offsetX: 0, offsetY: 0, align: 'center',
    primary: rec.primary, secondary: rec.secondary, accent: rec.accent
  });
  if (brief) { state.brief.brand = brief.brand; state.brief.descriptor = brief.descriptor; }
  state.selectedId = null;
  syncUI();
  showEditor();
  render();
  pushHistory();
  $('statusMsg').textContent = `Opened “${rec.label}” — refine it on the right, or go back to Concepts`;
}

function currentRecipe() {
  const d = state.design;
  return {
    v: 3, layout: d.layout, icon: d.icon, frame: d.frame, fill: d.fill, ornament: d.ornament,
    finish: d.finish, backdrop: d.backdrop, badgeIcon: d.badgeIcon,
    wordmarkStyle: d.wordmarkStyle, fontKey: d.fontKey, fontWeight: +d.fontWeight, tracking: d.tracking,
    caseStyle: d.caseStyle, roles: d.roles, gradientMode: d.gradientMode, symbolSize: d.symbolSize, scale: d.scale,
    primary: d.primary, secondary: d.secondary, accent: d.accent,
    label: Engine.labelFor(d)
  };
}

function toggleFavCurrent() {
  const rec = currentRecipe();
  const k = Engine.keyOf(rec) + '|' + rec.primary + rec.secondary;
  const i = favs.findIndex(f => Engine.keyOf(f) + '|' + f.primary + f.secondary === k);
  if (i >= 0) { favs.splice(i, 1); $('statusMsg').textContent = 'Removed from favourites'; }
  else { favs.unshift(rec); $('statusMsg').textContent = 'Saved to favourites (kept between sessions)'; }
  saveFavs();
  renderFavs();
  renderGallery();
}

function renderFavs() {
  const c = $('concepts');
  if (!c) return;
  const strip = c.closest('.concept-strip');
  if (strip) strip.classList.toggle('empty', !favs.length);
  if (!favs.length) {
    c.innerHTML = '<span class="hint">No favourites yet — tap ♥ on a concept to keep it here.</span>';
    return;
  }
  const brief = liveBrief();
  c.innerHTML = favs.map((f, i) => `
    <div class="concept-card" data-i="${i}" title="${escapeXml(f.label || '')}">${tileSvg(f, brief, 'f' + i)}<button class="fav-x" data-i="${i}" title="Remove">×</button></div>`).join('');
  c.querySelectorAll('.concept-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('fav-x')) {
        favs.splice(+e.target.dataset.i, 1); saveFavs(); renderFavs(); renderGallery(); return;
      }
      chooseConcept(favs[+card.dataset.i], null);
    });
  });
}

function showGallery() {
  state.view = 'gallery';
  $('gallery').hidden = false;
  $('artboardWrap').hidden = true;
  $('canvasFooter').hidden = true;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'gallery'));
  renderGallery();
  renderFavs();
}
function showEditor() {
  state.view = 'editor';
  $('gallery').hidden = true;
  $('artboardWrap').hidden = false;
  $('canvasFooter').hidden = false;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'editor'));
  renderFavs();
}

function bindGallery() {
  $('galMore').addEventListener('click', generateRound);
  $('galPrev').addEventListener('click', () => { if (gallery.page > 0) { gallery.page--; renderGallery(); } });
  $('galNext').addEventListener('click', () => { if (gallery.page < gallery.pages.length - 1) { gallery.page++; renderGallery(); } });
  $('galleryGrid').addEventListener('click', e => {
    const card = e.target.closest('.g-card');
    if (!card) return;
    const pg = gallery.pages[gallery.page];
    const rec = pg.items[+card.dataset.i];
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'fav') {
      const k = Engine.keyOf(rec) + '|' + rec.primary + rec.secondary;
      const idx = favs.findIndex(f => Engine.keyOf(f) + '|' + f.primary + f.secondary === k);
      if (idx >= 0) favs.splice(idx, 1); else favs.unshift(rec);
      saveFavs(); renderGallery(); renderFavs();
      return;
    }
    if (act && act.dataset.act === 'like') { generateLike(rec); return; }
    chooseConcept(rec, pg.brief);
  });
  document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.view === 'gallery') { if (!gallery.pages.length) generateRound(); else showGallery(); }
    else showEditor();
  }));
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────
function sanitizeFilename(name) {
  return String(name).replace(/[^a-z0-9-_]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'logo';
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 250);
}

function exportSvg() {
  const { svg } = exportGeometry();
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + svg;
  downloadBlob(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }),
    sanitizeFilename(liveBrief().brand) + '.svg');
  $('statusMsg').textContent = 'SVG exported (tight crop) · text uses system fonts — install the same font, or convert text to outlines, when sharing';
}

/** Rasterise the tight-cropped logo. Resolves with a PNG Blob. */
function rasterise(res, withBackground) {
  return new Promise((resolve, reject) => {
    const { svg, vw, vh } = exportGeometry();
    const h = Math.round(res * (vh / vw));
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = res;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (withBackground && state.design.background !== 'transparent') {
        ctx.fillStyle = artboardBg();
        ctx.fillRect(0, 0, res, h);
      }
      ctx.drawImage(img, 0, 0, res, h);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        blob ? resolve({ blob, w: res, h }) : reject(new Error('PNG raster failed'));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG raster failed')); };
    img.src = url;
  });
}

async function exportPng() {
  try {
    const res = Math.round((prefs.pngRes || 2700) * 0.75);
    const { blob, w, h } = await rasterise(res, true);
    downloadBlob(blob, sanitizeFilename(liveBrief().brand) + '.png');
    $('statusMsg').textContent = `PNG exported @ ${w}×${h} (tight crop)`;
  } catch (err) {
    $('statusMsg').textContent = 'PNG failed: ' + (err.message || err);
  }
}

async function exportPackage() {
  exportSvg();
  await new Promise(r => setTimeout(r, 350));
  await exportPng();
  const d = state.design;
  const b = liveBrief();
  const guidelines = `MARKCRAFT STUDIO — BRAND PACKAGE
================================
Brand: ${b.brand}
Descriptor: ${b.descriptor}
Generated: ${new Date().toISOString().slice(0, 10)}

COLOURS
Primary (RGB): ${d.primary}   CMYK: ${rgbToCmyk(...hexToRgb(d.primary)).join(', ')}
Secondary (RGB): ${d.secondary}   CMYK: ${rgbToCmyk(...hexToRgb(d.secondary)).join(', ')}
Accent (RGB): ${d.accent}   CMYK: ${rgbToCmyk(...hexToRgb(d.accent)).join(', ')}

TYPOGRAPHY
Typeface: ${d.font || (Engine.FONTS[d.fontKey] ? Engine.FONTS[d.fontKey].css : d.fontKey)}
Weight: ${d.fontWeight}   Tracking: ${d.tracking}   Case: ${d.caseStyle}

COMPOSITION
Layout: ${Engine.LAYOUTS[d.layout] || d.layout}
Symbol: ${iconLabel(d.icon)}   Frame: ${d.frame}   Fill: ${d.fill}   Ornament: ${d.ornament}
Gradient: ${d.gradientMode}

USAGE
- Maintain clear space equal to the height of the primary initial.
- Do not stretch, skew or recolour outside the provided palette.
- For small sizes prefer the symbol or monogram on its own.
- Text is live type set in system fonts. Install the same font on any machine that opens the SVG, or convert text to outlines first.
- This package is a starting point. Trademark clearance is the client's responsibility.

Files: SVG (editable vector) + PNG (high-resolution raster)
`;
  downloadBlob(new Blob([guidelines], { type: 'text/plain' }),
    sanitizeFilename(b.brand) + '-guidelines.txt');
  $('statusMsg').textContent = 'Brand package exported (SVG + PNG + guidelines)';
}

async function copySvg() {
  try {
    await navigator.clipboard.writeText(exportGeometry().svg);
    $('statusMsg').textContent = 'SVG copied to clipboard';
  } catch (_) {
    $('statusMsg').textContent = 'Clipboard not available';
  }
}

// ─────────────────────────────────────────────
// PROJECT SAVE / LOAD / AUTOSAVE
// ─────────────────────────────────────────────
const AUTOSAVE_KEY = 'markcraft-autosave-v3';
let autosaveTimer = null;

function getProjectData() {
  const b = liveBrief();
  return {
    schemaVersion: state.schemaVersion,
    id: state.id,
    name: $('projectName').value || state.name,
    brief: { ...state.brief, brand: b.brand, descriptor: b.descriptor },
    design: { ...state.design },
    svg: buildSvg()
  };
}

function saveProject() {
  const data = getProjectData();
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    sanitizeFilename(data.name || 'project') + '.markcraft.json');
  state.dirty = false;
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch (_) {}
  $('statusMsg').textContent = 'Project saved';
}

/** Bring projects saved by 1.0/1.1 (composition + symbol) into the new design model. */
function migrateDesign(old) {
  const d = { ...defaultDesign(), ...(old || {}) };
  if (!old || !old.layout) {
    const map = { stacked: 'stacked', horizontal: 'horizontal', wordmark: 'wordmark', seal: 'badge', monogram: 'monogram' };
    d.layout = map[old && old.composition] || 'stacked';
  }
  if (!old || !old.icon) {
    const s = old && old.symbol;
    d.icon = !s ? 'monogram' : (IconLib.ALIASES[s] || s);
    if (!IconLib.ICONS[d.icon] && d.icon !== 'none') d.icon = 'abstract';
    if (!old || !old.frame) d.frame = d.layout === 'badge' ? 'circle' : (d.icon === 'monogram' ? 'circle' : 'none');
  }
  if (old && old.font && !old.fontKey) d.font = old.font;       // keep the user's explicit typeface
  d.fontWeight = String(d.fontWeight || '600');
  return d;
}

function loadProjectData(data) {
  if (data.brief) state.brief = { ...state.brief, ...data.brief };
  if (data.design) state.design = migrateDesign(data.design);
  if (data.name) { state.name = data.name; $('projectName').value = data.name; }
  $('brandName').value = state.brief.brand || '';
  $('descriptor').value = state.brief.descriptor || '';
  if (state.brief.industry) $('industry').value = state.brief.industry;
  if (state.brief.personality) $('personality').value = state.brief.personality;
  if (state.brief.palette && [...$('palette').options].some(o => o.value === state.brief.palette)) $('palette').value = state.brief.palette;
  $('notes').value = state.brief.notes || '';
  state.selectedId = null;
  syncUI();
  showEditor();
  render();
  pushHistory();
}

function loadProject(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      loadProjectData(JSON.parse(e.target.result));
      state.dirty = false;
      $('statusMsg').textContent = 'Project loaded';
    } catch (err) {
      $('statusMsg').textContent = 'Failed to load project';
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function setupAutosave() {
  clearInterval(autosaveTimer);
  if (!(prefs.autosave > 0)) return;
  autosaveTimer = setInterval(writeAutosave, prefs.autosave * 1000);
}
function writeAutosave() {
  if (!state.dirty || !(prefs.autosave > 0)) return;
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ at: Date.now(), data: getProjectData() }));
    $('statusMsg').textContent = 'Autosaved ' + new Date().toLocaleTimeString();
  } catch (_) {}
}
function offerAutosaveRestore() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const { at, data } = JSON.parse(raw);
    if (confirm(`An autosaved project from ${new Date(at).toLocaleString()} was found.\nRestore it?`)) {
      loadProjectData(data);
      return true;
    }
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (_) {}
  return false;
}

// ─────────────────────────────────────────────
// MENUS
// ─────────────────────────────────────────────
function closeMenus() { document.querySelectorAll('.menu-pop').forEach(m => m.remove()); }

function openMenu(btn, items) {
  closeMenus();
  const pop = document.createElement('div');
  pop.className = 'menu-pop';
  items.forEach(it => {
    if (it === '-') { pop.appendChild(Object.assign(document.createElement('hr'), {})); return; }
    const b = document.createElement('button');
    b.className = 'menu-item';
    b.innerHTML = `<span>${escapeXml(it.label)}</span><kbd>${it.key ? escapeXml(it.key) : ''}</kbd>`;
    b.addEventListener('click', () => { closeMenus(); it.run(); });
    pop.appendChild(b);
  });
  const r = btn.getBoundingClientRect();
  pop.style.left = r.left + 'px';
  pop.style.top = (r.bottom + 4) + 'px';
  document.body.appendChild(pop);
  setTimeout(() => document.addEventListener('click', closeMenus, { once: true }), 0);
}

function applyView() {
  $('artboard').style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom / 100})`;
  $('zoomLabel').textContent = state.zoom + '%';
  $('canvasStatus').textContent = `Ready · Vector 900×600 · ${state.zoom}%`;
}
function zoomBy(delta) { state.zoom = clamp(state.zoom + delta, 30, 300); applyView(); }
function resetView() { state.zoom = 100; state.pan = { x: 0, y: 0 }; applyView(); }

function resetAdjustments() {
  Object.assign(state.design, { scale: 100, symbolSize: 100, offsetX: 0, offsetY: 0, align: 'center' });
  syncUI();
  render();
}

function menuFile() {
  return [
    { label: 'New project', run: () => $('newBtn').click() },
    { label: 'Open…', run: () => $('openBtn').click() },
    { label: 'Save', key: 'Ctrl+S', run: saveProject },
    '-',
    { label: 'Export SVG', key: 'Ctrl+E', run: exportSvg },
    { label: 'Export PNG', run: exportPng },
    { label: 'Brand package', run: exportPackage },
    { label: 'Brand book PDF', run: exportPdfBrandBook }
  ];
}
function menuEdit() {
  return [
    { label: 'Undo', key: 'Ctrl+Z', run: undo },
    { label: 'Redo', key: 'Ctrl+Y', run: redo },
    '-',
    { label: 'Copy SVG to clipboard', run: copySvg },
    { label: 'Save / remove favourite', run: toggleFavCurrent },
    { label: 'Reset size & position', run: resetAdjustments }
  ];
}
function menuView() {
  return [
    { label: 'Concepts (choose from 4)', run: () => { if (!gallery.pages.length) generateRound(); else showGallery(); } },
    { label: 'Editor', run: showEditor },
    '-',
    { label: 'Zoom in', run: () => zoomBy(10) },
    { label: 'Zoom out', run: () => zoomBy(-10) },
    { label: 'Reset view', run: resetView },
    { label: 'Toggle grid', run: () => $('gridToggle').click() },
    { label: 'Cycle background', run: () => $('bgToggle').click() },
    '-',
    { label: 'Preferences…', run: openPrefs }
  ];
}

// ─────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────
function openPrefs() {
  $('prefTheme').value = prefs.theme;
  $('prefBg').value = prefs.defaultBg;
  $('prefGrid').value = prefs.grid;
  $('prefPngRes').value = String(prefs.pngRes);
  $('prefAutosave').value = String(prefs.autosave);
  if ($('prefAiProvider')) $('prefAiProvider').value = prefs.aiProvider || 'none';
  if ($('prefAiKey')) $('prefAiKey').value = prefs.aiApiKey || '';
  if ($('prefAiModel')) $('prefAiModel').value = prefs.aiModel || 'llama-3.3-70b-versatile';
  if ($('prefOllamaUrl')) $('prefOllamaUrl').value = prefs.ollamaUrl || 'http://localhost:11434';
  if ($('prefOllamaModel')) $('prefOllamaModel').value = prefs.ollamaModel || 'llama3.2';
  $('prefsModal').hidden = false;
}

function closePrefs() { $('prefsModal').hidden = true; }

async function savePrefsFromUI() {
  const next = {
    theme: $('prefTheme').value,
    defaultBg: $('prefBg').value,
    grid: $('prefGrid').value,
    pngRes: parseInt($('prefPngRes').value, 10) || 2700,
    autosave: parseInt($('prefAutosave').value, 10) || 0,
    aiProvider: $('prefAiProvider') ? $('prefAiProvider').value : 'none',
    aiApiKey: $('prefAiKey') ? $('prefAiKey').value.trim() : '',
    aiModel: $('prefAiModel') ? $('prefAiModel').value.trim() : 'llama-3.3-70b-versatile',
    ollamaUrl: $('prefOllamaUrl') ? $('prefOllamaUrl').value.trim() : 'http://localhost:11434',
    ollamaModel: $('prefOllamaModel') ? $('prefOllamaModel').value.trim() : 'llama3.2'
  };
  await persistPrefs(next);
  applyTheme(prefs.theme);
  if (prefs.grid === 'off') $('artboardWrap').classList.add('grid-off');
  else $('artboardWrap').classList.remove('grid-off');
  updateAiHint();
  setupAutosave();
  closePrefs();
  $('statusMsg').textContent = 'Preferences saved';
}

function updateAiHint() {
  const el = $('aiStatusHint');
  if (!el) return;
  if (prefs.aiProvider === 'groq') el.textContent = 'AI: Groq (key configured locally)';
  else if (prefs.aiProvider === 'ollama') el.textContent = 'AI: Ollama local';
  else el.textContent = 'AI is optional. Configure in Preferences.';
}

function openAbout() { $('aboutModal').hidden = false; }
function closeAbout() { $('aboutModal').hidden = true; }

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// AI CONCEPT ASSIST (optional)
// ─────────────────────────────────────────────
async function aiSuggestConcepts() {
  if (!window.markcraft || !window.markcraft.aiComplete) {
    $('statusMsg').textContent = 'AI bridge not available';
    return;
  }
  if (!prefs.aiProvider || prefs.aiProvider === 'none') {
    openPrefs();
    $('statusMsg').textContent = 'Enable an AI provider in Preferences first';
    return;
  }
  const brand = $('brandName').value.trim() || 'Brand';
  const industry = $('industry').value;
  const personality = $('personality').value;
  const notes = $('notes').value.trim();
  $('statusMsg').textContent = 'Asking AI for concept directions…';
  if ($('aiGenerateBtn')) $('aiGenerateBtn').disabled = true;
  try {
    const prompt = `Brand name: ${brand}
Industry: ${industry}
Personality: ${personality}
Notes: ${notes || 'none'}

Invent 6 UNIQUE logo concept directions a demanding client would love. Avoid clichés and generic industry icons.
For each concept list:
1) Layout: stacked | horizontal | badge | banner | monogram | wordmark
2) Symbol keyword from: ${Object.keys(IconLib.ICONS).join(', ')}
3) Why it feels original (one short line)

Push for unexpected but appropriate combinations. No generic house icons unless real-estate and only as one option.`;
    const res = await window.markcraft.aiComplete({
      provider: prefs.aiProvider,
      system: 'You are a senior brand identity designer known for original, non-generic marks. Prefer distinctive geometry and clever letterform ideas over stock symbols.',
      prompt
    });
    if (res.error) {
      $('statusMsg').textContent = 'AI error: ' + res.error;
      return;
    }
    const text = (res.text || '').toLowerCase();
    const symKeys = Object.keys(IconLib.ICONS).filter(k => k !== 'monogram');
    const hintSyms = symKeys.filter(k => text.includes(k));
    if (hintSyms.length) state._aiSymbolBias = hintSyms;
    generateRound();
    state._aiSymbolBias = null;
    const short = (res.text || '').trim().slice(0, 320).replace(/\s+/g, ' ');
    if ($('aiStatusHint') && short) {
      $('aiStatusHint').textContent = short + ((res.text || '').length > 320 ? '…' : '');
    }
    $('statusMsg').textContent = 'AI-informed concepts ready — ' + '4 new directions in the gallery';
    console.log('AI concept response:\n', res.text);
  } catch (err) {
    $('statusMsg').textContent = 'AI failed: ' + (err.message || err);
  } finally {
    if ($('aiGenerateBtn')) $('aiGenerateBtn').disabled = false;
  }
}

// ─────────────────────────────────────────────
// MULTI-PAGE PDF BRAND BOOK
// ─────────────────────────────────────────────
async function exportPdfBrandBook() {
  if (!window.markcraft || !window.markcraft.exportPdf) {
    $('statusMsg').textContent = 'PDF export requires the desktop app bridge';
    return;
  }
  $('statusMsg').textContent = 'Building brand guidelines PDF…';
  try {
    const png = await rasterise(prefs.pngRes || 1800, true);
    const pngBytes = Array.from(new Uint8Array(await png.blob.arrayBuffer()));

    const d = state.design;
    const result = await window.markcraft.exportPdf({
      brand: liveBrief().brand,
      descriptor: liveBrief().descriptor,
      primary: d.primary,
      secondary: d.secondary,
      accent: d.accent,
      fontName: d.font || (Engine.FONTS[d.fontKey] ? Engine.FONTS[d.fontKey].label : d.fontKey),
      composition: Engine.LAYOUTS[d.layout] || d.layout,
      symbol: iconLabel(d.icon),
      primaryCmyk: rgbToCmyk(...hexToRgb(d.primary)),
      secondaryCmyk: rgbToCmyk(...hexToRgb(d.secondary)),
      pngBytes
    });

    if (result.canceled) $('statusMsg').textContent = 'PDF export cancelled';
    else if (result.error) $('statusMsg').textContent = 'PDF error: ' + result.error;
    else $('statusMsg').textContent = 'Brand guidelines PDF saved';
  } catch (err) {
    $('statusMsg').textContent = 'PDF failed: ' + (err.message || err);
    console.error(err);
  }
}

function bindEvents() {
  $('generateBtn').addEventListener('click', generateRound);
  bindGallery();

  // ── text
  ['editName', 'editDescriptor'].forEach(id => {
    $(id).addEventListener('input', () => {
      state.brief.brand = $('editName').value;
      state.brief.descriptor = $('editDescriptor').value;
      render();
    });
  });
  $('fontFamily').addEventListener('change', e => { state.design.font = e.target.value; render(); });
  $('fontWeight').addEventListener('change', e => { state.design.fontWeight = e.target.value; render(); });
  $('caseStyle').addEventListener('change', e => { state.design.caseStyle = e.target.value; render(); });
  $('wordmarkStyle').addEventListener('change', e => { state.design.wordmarkStyle = e.target.value; render(); });

  const slider = (id, key, labelId, suffix = '') => {
    $(id).addEventListener('input', e => {
      state.design[key] = +e.target.value;
      $(labelId).textContent = e.target.value + suffix;
      render();
    });
  };
  slider('tracking', 'tracking', 'trackingVal');
  slider('scale', 'scale', 'scaleVal', '%');
  slider('symbolSize', 'symbolSize', 'symbolSizeVal', '%');
  slider('offsetY', 'offsetY', 'offsetYVal');
  slider('offsetX', 'offsetX', 'offsetXVal');

  // ── structure
  const sel = (id, key) => $(id).addEventListener('change', e => {
    state.design[key] = e.target.value === 'none' && key === 'icon' ? 'none' : e.target.value;
    render();
  });
  sel('composition', 'layout');
  sel('symbolKind', 'icon');
  sel('secondKind', 'badgeIcon');
  sel('frameKind', 'frame');
  sel('fillStyle', 'fill');
  sel('finishKind', 'finish');
  sel('backdropKind', 'backdrop');
  sel('ornamentKind', 'ornament');
  sel('gradientMode', 'gradientMode');
  $('rolesSwap').addEventListener('change', e => { state.design.roles = e.target.checked ? 'swap' : 'std'; render(); });

  document.querySelectorAll('.align-btn').forEach(b => b.addEventListener('click', () => {
    state.design.align = b.dataset.align;
    document.querySelectorAll('.align-btn').forEach(x => x.classList.toggle('active', x === b));
    render();
  }));

  // ── colour
  function bindColor(colorId, hexId, key) {
    $(colorId).addEventListener('input', () => {
      $(hexId).value = $(colorId).value;
      state.design[key] = $(colorId).value;
      if (key !== 'accent') updateCmykFromHex(key, state.design[key]);
      render();
    });
    $(hexId).addEventListener('change', () => {
      let v = $(hexId).value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        $(colorId).value = v;
        state.design[key] = v.toLowerCase();
        if (key !== 'accent') updateCmykFromHex(key, v);
        render();
      } else {
        $(hexId).value = state.design[key];
      }
    });
  }
  bindColor('primaryColor', 'primaryHex', 'primary');
  bindColor('secondaryColor', 'secondaryHex', 'secondary');
  bindColor('accentColor', 'accentHex', 'accent');

  function bindCmyk(prefix, key) {
    ['C', 'M', 'Y', 'K'].forEach(ch => {
      const el = $(prefix + ch);
      if (!el) return;
      el.addEventListener('change', () => {
        const vals = ['C', 'M', 'Y', 'K'].map(c => clamp(+$(prefix + c).value || 0, 0, 100));
        const hex = rgbToHex(...cmykToRgb(...vals));
        state.design[key] = hex;
        $(key + 'Color').value = hex;
        $(key + 'Hex').value = hex;
        render();
      });
    });
  }
  bindCmyk('p', 'primary');
  bindCmyk('s', 'secondary');

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.colorMode = btn.dataset.mode;
      const showCmyk = state.colorMode === 'cmyk';
      $('primaryCmyk').hidden = !showCmyk;
      $('secondaryCmyk').hidden = !showCmyk;
    });
  });
  ['Complement', 'Analogous', 'Triad', 'Mono'].forEach(n =>
    $('harmony' + n).addEventListener('click', () => applyHarmony(n.toLowerCase())));

  $('bgMode').addEventListener('change', e => {
    state.design.background = e.target.value;
    $('customBgRow').hidden = e.target.value !== 'custom';
    render();
    if (state.view === 'gallery') renderGallery();
  });
  $('customBgColor').addEventListener('input', () => {
    state.design.customBg = $('customBgColor').value;
    $('customBgHex').value = state.design.customBg;
    render();
  });
  $('customBgHex').addEventListener('change', () => {
    let v = $('customBgHex').value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-f]{6}$/i.test(v)) { state.design.customBg = v; $('customBgColor').value = v; render(); }
    else $('customBgHex').value = state.design.customBg;
  });

  // ── tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.hidden = true);
      const target = $('tab-' + tab.dataset.tab);
      if (target) target.hidden = false;
    });
  });

  // ── tools, view, canvas
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tool = btn.dataset.tool;
      $('artboardWrap').classList.toggle('pan', state.tool === 'pan');
    });
  });
  $('bgToggle').addEventListener('click', () => {
    const modes = ['light', 'dark', 'transparent', 'custom'];
    state.design.background = modes[(modes.indexOf(state.design.background) + 1) % modes.length];
    $('bgMode').value = state.design.background;
    $('customBgRow').hidden = state.design.background !== 'custom';
    render();
    if (state.view === 'gallery') renderGallery();
  });
  $('gridToggle').addEventListener('click', () => $('artboardWrap').classList.toggle('grid-off'));
  $('zoomIn').addEventListener('click', () => zoomBy(10));
  $('zoomOut').addEventListener('click', () => zoomBy(-10));
  $('zoomLabel').addEventListener('dblclick', resetView);
  $('favBtn').addEventListener('click', toggleFavCurrent);

  const wrap = $('artboardWrap');
  wrap.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 10 : -10);
  }, { passive: false });
  let drag = null;
  wrap.addEventListener('pointerdown', e => {
    if (state.tool !== 'pan') return;
    drag = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', e => {
    if (!drag) return;
    state.pan = { x: e.clientX - drag.x, y: e.clientY - drag.y };
    applyView();
  });
  wrap.addEventListener('pointerup', () => { drag = null; });
  wrap.addEventListener('click', e => {
    if (state.tool !== 'select') return;
    const layer = e.target.closest && e.target.closest('[data-layer]');
    state.selectedId = layer ? layer.getAttribute('data-layer') : null;
    updateLayers();
    refreshSelection();
  });

  // ── export + project
  $('exportSvgBtn').addEventListener('click', exportSvg);
  $('exportPngBtn').addEventListener('click', exportPng);
  $('exportPackageBtn').addEventListener('click', exportPackage);
  if ($('exportPdfBtn')) $('exportPdfBtn').addEventListener('click', exportPdfBrandBook);
  if ($('aiGenerateBtn')) $('aiGenerateBtn').addEventListener('click', aiSuggestConcepts);
  $('saveBtn').addEventListener('click', saveProject);
  $('newBtn').addEventListener('click', () => {
    if (!state.dirty || confirm('Start a new project? Unsaved changes will be lost.')) {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch (_) {}
      state.dirty = false;
      location.reload();
    }
  });
  $('openBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => { if (input.files[0]) loadProject(input.files[0]); };
    input.click();
  });
  $('projectName').addEventListener('change', e => { state.name = e.target.value; });

  // ── dialogs + menus
  $('prefsBtn').addEventListener('click', openPrefs);
  $('prefsClose').addEventListener('click', closePrefs);
  $('prefsCancel').addEventListener('click', closePrefs);
  $('prefsSave').addEventListener('click', savePrefsFromUI);
  $('aboutClose').addEventListener('click', closeAbout);
  $('aboutOk').addEventListener('click', closeAbout);
  $('menuFile').addEventListener('click', e => { e.stopPropagation(); openMenu(e.currentTarget, menuFile()); });
  $('menuEdit').addEventListener('click', e => { e.stopPropagation(); openMenu(e.currentTarget, menuEdit()); });
  $('menuView').addEventListener('click', e => { e.stopPropagation(); openMenu(e.currentTarget, menuView()); });
  $('menuHelp').addEventListener('click', openAbout);
  $('prefsModal').addEventListener('click', e => { if (e.target === $('prefsModal')) closePrefs(); });
  $('aboutModal').addEventListener('click', e => { if (e.target === $('aboutModal')) closeAbout(); });

  // ── keyboard
  document.addEventListener('keydown', e => {
    const t = e.target;
    const typing = t && ((t.tagName === 'INPUT' && !['range', 'color', 'checkbox'].includes(t.type)) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); }
    else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); exportSvg(); }
    else if (mod && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 'Escape') { closePrefs(); closeAbout(); closeMenus(); }
    else if (!typing && !mod && e.key.toLowerCase() === 'g') { state.view === 'gallery' ? showEditor() : (gallery.pages.length ? showGallery() : generateRound()); }
  });
  window.addEventListener('beforeunload', () => { clearTimeout(hist.timer); writeAutosave(); });
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
async function init() {
  if (!Engine || !IconLib) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Logo engine failed to load (logo-engine.js / logo-icons.js).</p>';
    return;
  }
  await loadPrefsAsync();
  applyTheme(prefs.theme);
  if (prefs.grid === 'off') $('artboardWrap').classList.add('grid-off');
  state.design.background = prefs.defaultBg || 'light';
  if ($('bgMode')) $('bgMode').value = state.design.background;

  populateFonts();
  populateEngineSelects();
  bindEvents();
  updateAiHint();
  setupAutosave();
  syncUI();
  const restored = offerAutosaveRestore();
  if (!restored) generateRound();
  else render();
  pushHistory();
  state.dirty = false;
  applyView();
  $('statusMsg').textContent = restored ? 'Autosave restored' : 'Markcraft Studio 1.2 ready — pick one of the 4 concepts';
}

document.addEventListener('DOMContentLoaded', init);
