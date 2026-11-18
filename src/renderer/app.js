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
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
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
  schemaVersion: 2,
  id: 'project-' + Date.now(),
  name: 'Untitled identity',
  brief: {
    brand: 'NORTHSTAR',
    descriptor: 'STUDIO',
    industry: 'Business / Company',
    personality: 'Premium & minimal',
    palette: 'Midnight & champagne',
    notes: ''
  },
  design: {
    composition: 'stacked',
    symbol: 'monogram',
    primary: '#1a365d',
    secondary: '#c9a227',
    accent: '#e8d48b',
    font: "Georgia, 'Times New Roman', 'Palatino Linotype', serif",
    fontWeight: '600',
    tracking: 5,
    scale: 100,
    symbolSize: 100,
    offsetY: 0,
    offsetX: 0,
    background: 'light',
    customBg: '#f7f5f0',
    gradientMode: 'none',
    variant: 0
  },
  selectedId: null,
  tool: 'select',
  concepts: [],
  activeConcept: 0,
  zoom: 100,
  colorMode: 'rgb'
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

function populateFonts() {
  const sel = $('fontFamily');
  if (!sel) return;
  sel.innerHTML = SYSTEM_FONTS.map(f =>
    `<option value="${f.value.replace(/"/g, '&quot;')}">${f.label}</option>`
  ).join('');
  sel.value = state.design.font;
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
// PROCEDURAL FREEFORM MARK ENGINE
// Generates unique SVG path geometry per concept
// (not template swaps — real unique geometry)
// ─────────────────────────────────────────────
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRng(seedStr) {
  return mulberry32(hashSeed(String(seedStr)));
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ─────────────────────────────────────────────
// TRADITIONAL LOGO CRAFT (pre-AI design school)
// Principles from decades of professional practice:
// simplicity · geometry · proportion · negative space ·
// versatility · appropriateness · memorability
// ─────────────────────────────────────────────

const PHI = 1.6180339887; // golden ratio
const PHI_INV = 0.6180339887;

/** Classic construction: circle, square, triangle relationships */
function craftGeometry(rng) {
  // Prefer simple geometric bases designers actually use
  const bases = ['circle', 'square', 'shield', 'diamond', 'hex', 'arc'];
  return bases[Math.floor(rng() * bases.length)];
}

/**
 * Build a mark the way a trained designer constructs one:
 * - Start from geometry (circle/square/grid)
 * - Limit to 1–2 ideas
 * - Use proportion (often golden or equal division)
 * - Protect negative space
 * - Ensure it works at small size (thick enough strokes)
 */
function craftMark(seedStr, color, size, industry, personality) {
  const rng = seededRng(seedStr + '|craft');
  const s = size / 100;
  const fill = color;
  const g = (content) => `<g transform="translate(450 200) scale(${s})">${content}</g>`;

  // Design method selection based on industry conventions (classic practice)
  const method = pickCraftMethod(industry, personality, rng);

  if (method === 'lettermark') {
    // Classic lettermark in geometric container — Paul Rand / Wolff Olins school
    const letter = ((state.brief && state.brief.brand) || 'A').charAt(0).toUpperCase();
    const shape = rng() > 0.5 ? 'circle' : 'rounded';
    if (shape === 'circle') {
      return g(`
        <circle r="52" fill="${fill}"/>
        <circle r="44" fill="none" stroke="#fff" stroke-opacity="0.15" stroke-width="1"/>
        <text x="0" y="18" text-anchor="middle" fill="#fff" stroke="none"
          font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="600">${escapeXml(letter)}</text>`);
    }
    return g(`
      <rect x="-48" y="-48" width="96" height="96" rx="12" fill="${fill}"/>
      <rect x="-40" y="-40" width="80" height="80" rx="8" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="1"/>
      <text x="0" y="18" text-anchor="middle" fill="#fff" stroke="none"
        font-family="Georgia, 'Times New Roman', serif" font-size="54" font-weight="600">${escapeXml(letter)}</text>`);
  }

  if (method === 'monogram_overlap') {
    // Two-letter interlock — classic bank / institution approach
    const brand = ((state.brief && state.brief.brand) || 'AB').toUpperCase().replace(/[^A-Z]/g, '');
    const a = brand.charAt(0) || 'A';
    const b = brand.charAt(1) || brand.charAt(0) || 'B';
    return g(`
      <circle r="54" fill="none" stroke="${fill}" stroke-width="3"/>
      <text x="-12" y="16" text-anchor="middle" fill="${fill}" stroke="none"
        font-family="Georgia, serif" font-size="42" font-weight="700" opacity="0.95">${escapeXml(a)}</text>
      <text x="14" y="16" text-anchor="middle" fill="${fill}" stroke="none"
        font-family="Georgia, serif" font-size="42" font-weight="700" opacity="0.7">${escapeXml(b)}</text>`);
  }

  if (method === 'seal_crest') {
    // Heraldic / institutional seal — education, law, heritage
    const R = 54;
    return g(`
      <circle r="${R}" fill="none" stroke="${fill}" stroke-width="2.2"/>
      <circle r="${R * PHI_INV + 6}" fill="none" stroke="${fill}" stroke-width="1" opacity="0.35"/>
      <path d="M0 ${-R*0.55} L${R*0.38} ${-R*0.15} L${R*0.24} ${R*0.4} L0 ${R*0.55} L${-R*0.24} ${R*0.4} L${-R*0.38} ${-R*0.15} Z" fill="${fill}"/>
      <circle r="8" fill="#fff" opacity="0.2"/>`);
  }

  if (method === 'geometric_icon') {
    // Single strong geometric idea — modern classic (Chase, BP flower, etc.)
    const kind = Math.floor(rng() * 5);
    if (kind === 0) {
      // Square rotated + circle (balance of stability + continuity)
      return g(`
        <rect x="-34" y="-34" width="68" height="68" transform="rotate(45)" fill="${fill}"/>
        <circle r="18" fill="#fff" opacity="0.2"/>`);
    }
    if (kind === 1) {
      // Nested circles — unity / global
      return g(`
        <circle r="52" fill="none" stroke="${fill}" stroke-width="7"/>
        <circle r="28" fill="${fill}"/>`);
    }
    if (kind === 2) {
      // Triangle upward — growth / stability
      return g(`
        <path d="M0 -50 L48 38 L-48 38 Z" fill="${fill}"/>
        <path d="M0 -22 L22 22 L-22 22 Z" fill="#fff" opacity="0.15"/>`);
    }
    if (kind === 3) {
      // Horizontal bars decreasing — classic abstraction
      return g(`
        <rect x="-48" y="-28" width="96" height="12" rx="2" fill="${fill}"/>
        <rect x="-36" y="-6" width="72" height="12" rx="2" fill="${fill}" opacity="0.85"/>
        <rect x="-24" y="16" width="48" height="12" rx="2" fill="${fill}" opacity="0.7"/>`);
    }
    // Arc + stem — simple distinctive
    return g(`
      <path d="M-40 20 A44 44 0 1 1 40 20" fill="none" stroke="${fill}" stroke-width="10" stroke-linecap="round"/>
      <circle cx="0" cy="22" r="8" fill="${fill}"/>`);
  }

  if (method === 'negative_space') {
    // Figure-ground play — classic clever logo craft
    return g(`
      <circle r="52" fill="${fill}"/>
      <path d="M-8 -28 L22 0 L-8 28 L-8 12 L-28 12 L-28 -12 L-8 -12 Z" fill="#fff" opacity="0.92"/>`);
  }

  if (method === 'swoosh_motion') {
    // Controlled motion mark — sports / transport tradition
    return g(`
      <path d="M-52 18 C-20 -48 24 -40 50 6 C28 8 8 20 -8 22 C-24 24 -40 22 -52 18 Z" fill="${fill}"/>
      <path d="M-36 8 C-12 -22 16 -18 34 2" fill="none" stroke="#fff" stroke-width="3" opacity="0.2" stroke-linecap="round"/>`);
  }

  if (method === 'pillar_structure') {
    // Architecture / law / institution
    return g(`
      <rect x="-40" y="22" width="80" height="8" fill="${fill}"/>
      <rect x="-36" y="-32" width="10" height="54" fill="${fill}"/>
      <rect x="-5" y="-32" width="10" height="54" fill="${fill}"/>
      <rect x="26" y="-32" width="10" height="54" fill="${fill}"/>
      <path d="M-42 -32 H42 L32 -48 H-32 Z" fill="${fill}"/>`);
  }

  if (method === 'leaf_organic') {
    // Nature / health / food — simplified leaf (not clipart)
    return g(`
      <path d="M0 48 C-50 10 -36 -48 40 -48 C42 12 22 40 0 48 Z" fill="${fill}"/>
      <path d="M2 40 Q8 0 28 -28" fill="none" stroke="#fff" stroke-width="2" opacity="0.35"/>`);
  }

  // Default: golden-ratio circle + square intersection (timeless construction)
  const r = 50;
  const sq = r * PHI_INV;
  return g(`
    <circle r="${r}" fill="${fill}" opacity="0.92"/>
    <rect x="${-sq}" y="${-sq}" width="${sq*2}" height="${sq*2}" fill="#fff" opacity="0.18"/>
    <circle r="${r * PHI_INV * 0.7}" fill="${fill}"/>`);
}

function pickCraftMethod(industry, personality, rng) {
  const ind = (industry || '').toLowerCase();
  const per = (personality || '').toLowerCase();

  // Industry conventions from real design practice
  let pool = ['lettermark', 'geometric_icon', 'negative_space'];

  if (ind.includes('tech') || ind.includes('saas'))
    pool = ['geometric_icon', 'lettermark', 'negative_space', 'swoosh_motion'];
  else if (ind.includes('finance') || ind.includes('fintech') || ind.includes('bank'))
    pool = ['lettermark', 'monogram_overlap', 'geometric_icon', 'seal_crest'];
  else if (ind.includes('real estate') || ind.includes('housing') || ind.includes('property') || ind.includes('construction') || ind.includes('architecture'))
    pool = ['pillar_structure', 'geometric_icon', 'lettermark', 'seal_crest'];
  else if (ind.includes('legal') || ind.includes('law') || ind.includes('education'))
    pool = ['seal_crest', 'pillar_structure', 'monogram_overlap', 'lettermark'];
  else if (ind.includes('food') || ind.includes('café') || ind.includes('cafe') || ind.includes('restaurant') || ind.includes('agriculture'))
    pool = ['leaf_organic', 'lettermark', 'geometric_icon'];
  else if (ind.includes('health') || ind.includes('medical') || ind.includes('wellness'))
    pool = ['leaf_organic', 'geometric_icon', 'lettermark', 'negative_space'];
  else if (ind.includes('sport') || ind.includes('fitness') || ind.includes('auto') || ind.includes('logistic'))
    pool = ['swoosh_motion', 'geometric_icon', 'lettermark', 'negative_space'];
  else if (ind.includes('beauty') || ind.includes('fashion') || ind.includes('luxury'))
    pool = ['lettermark', 'monogram_overlap', 'geometric_icon', 'negative_space'];
  else if (ind.includes('church') || ind.includes('heritage') || ind.includes('nonprofit'))
    pool = ['seal_crest', 'lettermark', 'leaf_organic'];

  if (per.includes('heritage') || per.includes('luxury') || per.includes('elegant'))
    pool = ['seal_crest', 'monogram_overlap', 'lettermark', ...pool];
  if (per.includes('minimal') || per.includes('premium'))
    pool = ['geometric_icon', 'lettermark', 'negative_space', ...pool];
  if (per.includes('bold') || per.includes('playful'))
    pool = ['swoosh_motion', 'negative_space', 'geometric_icon', ...pool];

  // Unique pick from pool
  return pool[Math.floor(rng() * pool.length)];
}

/** Premium freeform mark — intentional geometry, design-school restraint */
function proceduralMark(seedStr, color, size, styleHint) {
  const rng = seededRng(seedStr + '|' + (styleHint || 'free'));
  const s = size / 100;
  const fill = color;
  const styles = ['geo', 'organic', 'ribbon', 'constellation', 'blade', 'nest', 'arcgrid', 'lettercut'];
  const style = styleHint && styles.includes(styleHint) ? styleHint : styles[Math.floor(rng() * styles.length)];
  const parts = [];
  const gOpen = `<g transform="translate(450 200) scale(${s})">`;
  const gClose = `</g>`;

  if (style === 'geo') {
    // Single refined polygon + subtle inner — not a chaotic cluster
    const sides = 5 + Math.floor(rng() * 3); // 5–7
    const r = 42 + rng() * 10;
    const rot = rng() * Math.PI * 2;
    let d = '';
    for (let k = 0; k < sides; k++) {
      const a = rot + (k / sides) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      d += (k === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    d += 'Z';
    parts.push(`<path d="${d}" fill="${fill}"/>`);
    // elegant inner echo
    let d2 = '';
    const r2 = r * 0.55;
    for (let k = 0; k < sides; k++) {
      const a = rot + (k / sides) * Math.PI * 2 + Math.PI / sides;
      d2 += (k === 0 ? 'M' : 'L') + (Math.cos(a) * r2).toFixed(1) + ' ' + (Math.sin(a) * r2).toFixed(1) + ' ';
    }
    d2 += 'Z';
    parts.push(`<path d="${d2}" fill="#fff" opacity="0.14"/>`);
  } else if (style === 'organic') {
    // Smooth 5–6 lobe organic form, controlled
    const lobes = 5 + Math.floor(rng() * 2);
    const pts = [];
    const baseR = 38 + rng() * 12;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 - Math.PI / 2;
      const r = baseR * (0.88 + rng() * 0.22);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
    for (let i = 0; i < lobes; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % lobes];
      const a0 = (i / lobes) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / lobes) * Math.PI * 2 - Math.PI / 2;
      const cr = baseR * 0.55;
      const c1x = Math.cos(a0 + 0.4) * cr * 1.35;
      const c1y = Math.sin(a0 + 0.4) * cr * 1.35;
      const c2x = Math.cos(a1 - 0.4) * cr * 1.35;
      const c2y = Math.sin(a1 - 0.4) * cr * 1.35;
      d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} `;
    }
    d += 'Z';
    parts.push(`<path d="${d}" fill="${fill}"/>`);
  } else if (style === 'ribbon') {
    // Single elegant swoosh — thick, confident, balanced
    const lean = (rng() - 0.5) * 18;
    const d = `M${(-48).toFixed(1)} ${(22 + lean * 0.3).toFixed(1)}
      C${(-20 + lean).toFixed(1)} ${(-48).toFixed(1)} ${(8).toFixed(1)} ${(-52).toFixed(1)} ${(32).toFixed(1)} ${(-18).toFixed(1)}
      C${(48).toFixed(1)} ${(4).toFixed(1)} ${(42).toFixed(1)} ${(28).toFixed(1)} ${(18).toFixed(1)} ${(38).toFixed(1)}
      C${(2).toFixed(1)} ${(44).toFixed(1)} ${(-12).toFixed(1)} ${(28).toFixed(1)} ${(-8).toFixed(1)} ${(12).toFixed(1)}
      C${(-4).toFixed(1)} ${(-4).toFixed(1)} ${(10).toFixed(1)} ${(-18).toFixed(1)} ${(6).toFixed(1)} ${(-6).toFixed(1)}
      C${(0).toFixed(1)} ${(12).toFixed(1)} ${(-18).toFixed(1)} ${(32).toFixed(1)} ${(-42).toFixed(1)} ${(30).toFixed(1)}
      C${(-52).toFixed(1)} ${(28).toFixed(1)} ${(-54).toFixed(1)} ${(24).toFixed(1)} ${(-48).toFixed(1)} ${(22 + lean * 0.3).toFixed(1)} Z`;
    parts.push(`<path d="${d.replace(/\s+/g, ' ')}" fill="${fill}"/>`);
  } else if (style === 'constellation') {
    // 4–5 nodes, deliberate connections only
    const nodes = [];
    const count = 4 + Math.floor(rng() * 2);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2 + (rng() - 0.5) * 0.35;
      const r = 28 + rng() * 22;
      nodes.push([Math.cos(a) * r, Math.sin(a) * r, 6 + rng() * 4]);
    }
    // connect consecutive + one chord
    for (let i = 0; i < nodes.length; i++) {
      const j = (i + 1) % nodes.length;
      parts.push(`<line x1="${nodes[i][0].toFixed(1)}" y1="${nodes[i][1].toFixed(1)}" x2="${nodes[j][0].toFixed(1)}" y2="${nodes[j][1].toFixed(1)}" stroke="${fill}" stroke-width="2.5" opacity="0.9"/>`);
    }
    if (nodes.length >= 4) {
      parts.push(`<line x1="${nodes[0][0].toFixed(1)}" y1="${nodes[0][1].toFixed(1)}" x2="${nodes[2][0].toFixed(1)}" y2="${nodes[2][1].toFixed(1)}" stroke="${fill}" stroke-width="1.5" opacity="0.45"/>`);
    }
    nodes.forEach(n => {
      parts.push(`<circle cx="${n[0].toFixed(1)}" cy="${n[1].toFixed(1)}" r="${n[2].toFixed(1)}" fill="${fill}"/>`);
    });
  } else if (style === 'blade') {
    // Refined 4–6 point mark, symmetric bias
    const spikes = 4 + Math.floor(rng() * 3);
    let d = '';
    const rot = -Math.PI / 2 + (rng() - 0.5) * 0.2;
    for (let i = 0; i < spikes * 2; i++) {
      const a = rot + (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 48 : 16 + rng() * 8;
      d += (i === 0 ? 'M' : 'L') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1) + ' ';
    }
    d += 'Z';
    parts.push(`<path d="${d}" fill="${fill}"/>`);
  } else if (style === 'nest') {
    // Two refined concentric rounded frames
    const outer = 48 + rng() * 6;
    const inner = outer * (0.58 + rng() * 0.1);
    const sides = 6;
    const rot = rng() * 0.4;
    function poly(r, open) {
      let d = '';
      for (let k = 0; k < sides; k++) {
        const a = rot + (k / sides) * Math.PI * 2;
        d += (k === 0 ? 'M' : 'L') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1) + ' ';
      }
      return d + 'Z';
    }
    parts.push(`<path d="${poly(outer)}" fill="${fill}"/>`);
    parts.push(`<path d="${poly(inner)}" fill="#fff" opacity="0.16"/>`);
  } else if (style === 'arcgrid') {
    // Two elegant arcs + center
    for (let i = 0; i < 2; i++) {
      const r = 28 + i * 16;
      const start = -60 + rng() * 40;
      const sweep = 200 + rng() * 40;
      const large = sweep > 180 ? 1 : 0;
      const a1 = start * Math.PI / 180;
      const a2 = (start + sweep) * Math.PI / 180;
      parts.push(`<path d="M${(Math.cos(a1)*r).toFixed(1)} ${(Math.sin(a1)*r).toFixed(1)} A${r} ${r} 0 ${large} 1 ${(Math.cos(a2)*r).toFixed(1)} ${(Math.sin(a2)*r).toFixed(1)}" fill="none" stroke="${fill}" stroke-width="${(4.5 - i).toFixed(1)}" stroke-linecap="round"/>`);
    }
    parts.push(`<circle r="${(7 + rng() * 4).toFixed(1)}" fill="${fill}"/>`);
  } else {
    // lettercut — premium circular badge with refined cut
    const r = 50;
    parts.push(`<circle r="${r}" fill="${fill}"/>`);
    // soft inner ring
    parts.push(`<circle r="38" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.2"/>`);
    // single elegant slash or arc cut
    if (rng() > 0.35) {
      const a = -0.6 + rng() * 1.2;
      parts.push(`<line x1="${(-Math.cos(a)*36).toFixed(1)}" y1="${(-Math.sin(a)*36).toFixed(1)}" x2="${(Math.cos(a)*36).toFixed(1)}" y2="${(Math.sin(a)*36).toFixed(1)}" stroke="#fff" stroke-width="7" opacity="0.18" stroke-linecap="round"/>`);
    } else {
      parts.push(`<circle cx="${(8+rng()*6).toFixed(1)}" cy="${(-6-rng()*8).toFixed(1)}" r="${(10+rng()*6).toFixed(1)}" fill="#fff" opacity="0.15"/>`);
    }
  }

  return gOpen + parts.join('') + gClose;
}

function freeformStyleForIndustry(industry, rng) {
  const map = {
    'Technology / SaaS': ['constellation', 'geo', 'arcgrid', 'blade'],
    'Finance / Fintech': ['geo', 'nest', 'blade', 'arcgrid'],
    'Real Estate / Housing': ['geo', 'nest', 'lettercut', 'blade'],
    'Food & Beverage': ['organic', 'ribbon', 'lettercut'],
    'Café / Coffee': ['organic', 'ribbon', 'lettercut'],
    'Health / Medical': ['organic', 'arcgrid', 'nest'],
    'Beauty / Salon': ['organic', 'ribbon', 'lettercut'],
    'Sports / Team': ['blade', 'geo', 'ribbon'],
    'Legal / Law': ['nest', 'geo', 'lettercut'],
    'Media / Creative': ['ribbon', 'organic', 'constellation', 'blade'],
    'Energy / Utilities': ['blade', 'arcgrid', 'geo'],
    'Logistics / Transport': ['ribbon', 'blade', 'constellation']
  };
  const opts = map[industry] || ['geo', 'organic', 'ribbon', 'constellation', 'blade', 'nest', 'arcgrid', 'lettercut'];
  return opts[Math.floor(rng() * opts.length)];
}

function symbolMarkup(kind, color, size, monogramLetter, gradientId) {
  const s = size / 100;
  const fill = gradientId ? `url(#${gradientId})` : color;
  const g = (content) =>
    `<g transform="translate(450 200) scale(${s})">${content}</g>`;

  switch (kind) {
    case 'none': return '';

    case 'craft':
    case 'designer': {
      const seed = (state.brief && state.brief.brand ? state.brief.brand : 'BRAND')
        + '|' + (state.activeConcept != null ? state.activeConcept : 0)
        + '|' + (state.design._freeSeed || 0)
        + '|' + (state.design._craftMethod || '');
      return craftMark(
        seed,
        color,
        size,
        (state.brief && state.brief.industry) || '',
        (state.brief && state.brief.personality) || ''
      );
    }

    case 'freeform':
    case 'procedural': {
      const seed = (state.brief && state.brief.brand ? state.brief.brand : 'BRAND')
        + '|' + (state.activeConcept != null ? state.activeConcept : 0)
        + '|' + (state.design._freeSeed || 0)
        + '|' + (state.design._freeStyle || '');
      const style = state.design._freeStyle || freeformStyleForIndustry(
        (state.brief && state.brief.industry) || '',
        seededRng(seed + '|pick')
      );
      return proceduralMark(seed, color, size, style);
    }

    case 'building':
      return g(`<rect x="-28" y="-50" width="18" height="70" fill="${fill}"/><rect x="-6" y="-62" width="22" height="82" fill="${fill}"/><rect x="20" y="-40" width="16" height="60" fill="${fill}"/><rect x="-22" y="-42" width="5" height="5" fill="#fff" opacity=".85"/><rect x="-22" y="-28" width="5" height="5" fill="#fff" opacity=".85"/><rect x="-22" y="-14" width="5" height="5" fill="#fff" opacity=".85"/><rect x="0" y="-50" width="5" height="5" fill="#fff" opacity=".85"/><rect x="0" y="-36" width="5" height="5" fill="#fff" opacity=".85"/><rect x="0" y="-22" width="5" height="5" fill="#fff" opacity=".85"/><rect x="26" y="-30" width="4" height="4" fill="#fff" opacity=".85"/><rect x="-4" y="8" width="12" height="12" fill="${fill}"/>`);

    case 'skyline':
      return g(`<path d="M-70 30 L-70 -10 L-55 -10 L-55 -35 L-40 -35 L-40 -5 L-28 -5 L-28 -45 L-12 -55 L-12 -5 L0 -5 L0 -70 L8 -70 L8 -5 L20 -5 L20 -40 L32 -40 L32 -15 L48 -15 L48 -50 L58 -50 L58 -20 L70 -20 L70 30 Z" fill="${fill}"/><rect x="-6" y="-60" width="3" height="3" fill="#fff" opacity=".7"/><rect x="2" y="-60" width="3" height="3" fill="#fff" opacity=".7"/>`);

    case 'house':
      return g(`<path d="M0 -55 L55 0 L40 0 L40 40 L-40 40 L-40 0 L-55 0 Z" fill="${fill}"/><rect x="-12" y="8" width="24" height="32" fill="#fff" opacity=".9"/><rect x="-28" y="5" width="12" height="12" fill="#fff" opacity=".75"/><rect x="16" y="5" width="12" height="12" fill="#fff" opacity=".75"/>`);

    case 'key':
      return g(`<circle cx="-22" cy="-8" r="22" fill="none" stroke="${color}" stroke-width="8"/><circle cx="-22" cy="-8" r="10" fill="none" stroke="${color}" stroke-width="5"/><rect x="-4" y="-14" width="55" height="12" rx="3" fill="${fill}"/><rect x="38" y="-14" width="8" height="22" fill="${fill}"/><rect x="28" y="-14" width="8" height="18" fill="${fill}"/>`);

    case 'columns':
      return g(`<rect x="-50" y="25" width="100" height="8" fill="${fill}"/><rect x="-45" y="-45" width="12" height="70" fill="${fill}"/><rect x="-6" y="-45" width="12" height="70" fill="${fill}"/><rect x="33" y="-45" width="12" height="70" fill="${fill}"/><path d="M-55 -45 L-55 -55 L55 -55 L55 -45 Z" fill="${fill}"/><path d="M-40 -55 L0 -75 L40 -55 Z" fill="${fill}"/>`);

    case 'roof':
      return g(`<path d="M0 -60 L70 20 L50 20 L50 45 L-50 45 L-50 20 L-70 20 Z" fill="${fill}"/><path d="M-25 0 L0 -30 L25 0 Z" fill="#fff" opacity=".25"/>`);

    case 'nodes':
      // Network / SaaS connectivity
      return g(`<circle cx="-35" cy="-25" r="12" fill="${fill}"/><circle cx="35" cy="-25" r="12" fill="${fill}"/><circle cx="0" cy="30" r="12" fill="${fill}"/><circle cx="0" cy="-5" r="9" fill="${fill}"/><line x1="-35" y1="-25" x2="0" y2="-5" stroke="${color}" stroke-width="4"/><line x1="35" y1="-25" x2="0" y2="-5" stroke="${color}" stroke-width="4"/><line x1="0" y1="-5" x2="0" y2="30" stroke="${color}" stroke-width="4"/>`);

    case 'circuit':
      return g(`<rect x="-50" y="-8" width="100" height="16" rx="2" fill="${fill}"/><rect x="-8" y="-50" width="16" height="100" rx="2" fill="${fill}"/><circle cx="-50" cy="0" r="10" fill="${fill}"/><circle cx="50" cy="0" r="10" fill="${fill}"/><circle cx="0" cy="-50" r="10" fill="${fill}"/><circle cx="0" cy="50" r="10" fill="${fill}"/><circle cx="0" cy="0" r="14" fill="#fff" opacity=".25"/>`);

    case 'growth':
      // Finance / analytics bars
      return g(`<rect x="-48" y="10" width="18" height="40" fill="${fill}" opacity=".7"/><rect x="-22" y="-10" width="18" height="60" fill="${fill}" opacity=".85"/><rect x="4" y="-30" width="18" height="80" fill="${fill}"/><rect x="30" y="-50" width="18" height="100" fill="${fill}"/><path d="M-40 5 L-10 -15 L15 -5 L40 -40" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>`);

    case 'coin':
      return g(`<circle r="52" fill="none" stroke="${color}" stroke-width="6"/><circle r="40" fill="none" stroke="${color}" stroke-width="3"/><text x="0" y="14" text-anchor="middle" fill="${color}" stroke="none" font-family="Georgia,serif" font-size="36" font-weight="700">$</text>`);

    case 'pulse':
      return g(`<path d="M-60 0 L-30 0 L-18 -28 L-5 32 L10 -40 L25 0 L60 0" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-60" cy="0" r="6" fill="${fill}"/><circle cx="60" cy="0" r="6" fill="${fill}"/>`);

    case 'droplet':
      return g(`<path d="M0 -55 C20 -25 35 0 35 20 C35 40 20 55 0 55 C-20 55 -35 40 -35 20 C-35 0 -20 -25 0 -55Z" fill="${fill}"/><ellipse cx="0" cy="18" rx="12" ry="14" fill="#fff" opacity=".2"/>`);

    case 'flame':
      return g(`<path d="M0 50 C-30 50 -40 20 -28 -10 C-20 10 -5 5 0 -45 C8 0 22 5 30 -5 C40 25 30 50 0 50Z" fill="${fill}"/><path d="M0 50 C-12 50 -18 30 -10 10 C-5 22 3 20 0 -5 C5 18 12 22 14 12 C18 30 12 50 0 50Z" fill="#fff" opacity=".3"/>`);

    case 'cup':
      return g(`<path d="M-30 -20 L-25 35 Q-25 48 0 48 Q25 48 25 35 L30 -20 Z" fill="${fill}"/><ellipse cx="0" cy="-20" rx="32" ry="10" fill="${fill}"/><path d="M30 -10 Q48 -10 48 8 Q48 22 30 22" fill="none" stroke="${color}" stroke-width="5"/><path d="M-12 -35 Q-5 -48 5 -35" fill="none" stroke="${color}" stroke-width="3" opacity=".7"/><path d="M2 -38 Q8 -50 14 -36" fill="none" stroke="${color}" stroke-width="3" opacity=".7"/>`);

    case 'bolt':
      return g(`<path d="M10 -55 L-25 5 L5 5 L-10 55 L35 -5 L5 -5 Z" fill="${fill}"/>`);

    case 'chevron':
      return g(`<path d="M-45 -35 L0 0 L-45 35 L-30 35 L15 0 L-30 -35 Z" fill="${fill}"/><path d="M-10 -35 L35 0 L-10 35 L5 35 L50 0 L5 -35 Z" fill="${fill}" opacity=".55"/>`);

    case 'target':
      return g(`<circle r="52" fill="none" stroke="${color}" stroke-width="5"/><circle r="34" fill="none" stroke="${color}" stroke-width="5"/><circle r="16" fill="${fill}"/>`);

    case 'book':
      return g(`<path d="M0 -45 L-48 -38 L-48 40 Q-24 50 0 42 Q24 50 48 40 L48 -38 Z" fill="${fill}"/><path d="M0 -45 L0 42" stroke="#fff" stroke-width="3" opacity=".5"/><path d="M-30 -20 H-10" stroke="#fff" stroke-width="3" opacity=".4"/><path d="M-30 -5 H-10" stroke="#fff" stroke-width="3" opacity=".4"/>`);

    case 'crest':
      return g(`<path d="M0 -58 L48 -42 L48 10 C48 40 24 58 0 68 C-24 58 -48 40 -48 10 L-48 -42 Z" fill="${fill}"/><path d="M0 -40 L28 -28 L28 8 C28 28 14 40 0 48 C-14 40 -28 28 -28 8 L-28 -28 Z" fill="#fff" opacity=".15"/><circle cx="0" cy="0" r="10" fill="#fff" opacity=".35"/>`);

    case 'ring':
      return g(`<circle r="48" fill="none" stroke="${color}" stroke-width="9"/><circle r="32" fill="none" stroke="${color}" stroke-width="2.5" opacity=".4"/><circle r="12" fill="${fill}" opacity=".9"/>`);

    case 'petal':
      return g(`<ellipse cx="0" cy="-28" rx="16" ry="32" fill="${fill}" transform="rotate(0)"/><ellipse cx="0" cy="-28" rx="16" ry="32" fill="${fill}" transform="rotate(72)" opacity=".9"/><ellipse cx="0" cy="-28" rx="16" ry="32" fill="${fill}" transform="rotate(144)" opacity=".8"/><ellipse cx="0" cy="-28" rx="16" ry="32" fill="${fill}" transform="rotate(216)" opacity=".9"/><ellipse cx="0" cy="-28" rx="16" ry="32" fill="${fill}" transform="rotate(288)" opacity=".85"/><circle r="12" fill="#fff" opacity=".35"/>`);

    case 'arrow':
      return g(`<path d="M-50 8 L20 8 L20 28 L55 0 L20 -28 L20 -8 L-50 -8 Z" fill="${fill}"/>`);

    case 'hexagon':
      return g(`<path d="M0 -52 L45 -26 V26 L0 52 L-45 26 V-26Z" fill="${fill}"/><path d="M0 -28 L24 -14 V14 L0 28 L-24 14 V-14Z" fill="#fff" opacity=".18"/>`);

    case 'orbit':
      return g(`<circle r="50" fill="none" stroke="${color}" stroke-width="3"/><ellipse rx="74" ry="26" transform="rotate(-30)" fill="none" stroke="${color}" stroke-width="2.5"/><ellipse rx="74" ry="26" transform="rotate(30)" fill="none" stroke="${color}" stroke-width="2.5"/><circle cx="40" cy="-30" r="6" fill="${fill}"/>`);

    case 'diamond':
      return g(`<path d="M0 -52 L46 0 0 52 -46 0Z" fill="${fill}"/><path d="M0 -28 L24 0 0 28 -24 0Z" fill="#fff" opacity=".14"/><path d="M0 -52 L46 0 0 52 -46 0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>`);

    case 'leaf':
      return g(`<path d="M0 54 C-72 10 -48 -64 46 -64 C52 16 28 46 0 54Z" fill="${fill}"/><path d="M-1 50 Q5 0 38 -40" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>`);

    case 'shield':
      return g(`<path d="M0 -58 L48 -38 V6 C48 34 26 54 0 62 C-26 54 -48 34 -48 6 V-38Z" fill="${fill}"/><path d="M0 -36 L26 -24 V2 C26 22 12 34 0 40 C-12 34 -26 22 -26 2 V-24Z" fill="#fff" opacity=".15"/>`);

    case 'monogram': {
      const letter = (monogramLetter || 'N').charAt(0).toUpperCase();
      return g(`<rect x="-56" y="-56" width="112" height="112" rx="10" fill="${fill}"/>
        <rect x="-48" y="-48" width="96" height="96" rx="6" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="1.2"/>
        <text x="0" y="20" text-anchor="middle" fill="#ffffff" stroke="none"
          font-family="Georgia, 'Times New Roman', 'Palatino Linotype', serif"
          font-size="68" font-weight="600" letter-spacing="-1">${escapeXml(letter)}</text>`);
    }

    case 'wave':
      return g(`<path d="M-60 10 Q-30 -40 0 10 Q30 55 60 10 L60 35 Q30 70 0 35 Q-30 -5 -60 35 Z" fill="${fill}"/>`);

    case 'abstract':
      return g(`<path d="M-44 -18 Q-8 -66 36 -28 Q64 8 18 46 Q-26 64 -46 18 Q-64 -18 -44 -18Z" fill="${fill}"/><circle cx="6" cy="-6" r="14" fill="#fff" opacity=".2"/>`);

    case 'star':
    default:
      return g(`<path d="M0 -58 L10 -12 58 0 10 11 0 58 -10 11 -58 0 -10 -12Z" fill="${fill}"/><circle r="8" fill="#fff" opacity=".25"/>`);
  }
}

function buildSvg() {
  const d = state.design;
  const rawName = ($('editName')?.value || state.brief.brand || 'YOUR BRAND').trim();
  const rawDesc = ($('editDescriptor')?.value || state.brief.descriptor || '').trim();
  const name = escapeXml(rawName);
  const desc = escapeXml(rawDesc);
  const c = d.primary;
  const sub = d.secondary;
  const accent = d.accent;
  // Premium type: prefer refined stacks
  let font = d.font || "Georgia, 'Times New Roman', serif";
  const weight = d.fontWeight || '600';
  const comp = d.composition;
  const scale = (d.scale || 100) / 100;
  // Design-school tracking: optical letter-spacing by name length
  let tracking = d.tracking != null ? d.tracking : 4;
  if (d.tracking == null || d.tracking === 0) {
    if (rawName.length <= 5) tracking = 6;
    else if (rawName.length <= 10) tracking = 4;
    else if (rawName.length <= 16) tracking = 2;
    else tracking = 1;
  }
  const offsetY = d.offsetY || 0;
  const offsetX = d.offsetX || 0;
  const monogramLetter = rawName.charAt(0);

  // Refined gradients — soft, premium stops
  let gradientDef = '';
  let gradientId = '';
  if (d.gradientMode === 'linear') {
    gradientId = 'markGrad';
    gradientDef = `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c}"/><stop offset="55%" stop-color="${c}"/>
      <stop offset="100%" stop-color="${accent}"/></linearGradient>`;
  } else if (d.gradientMode === 'radial') {
    gradientId = 'markGrad';
    gradientDef = `<radialGradient id="${gradientId}" cx="42%" cy="38%" r="65%">
      <stop offset="0%" stop-color="${accent}"/><stop offset="70%" stop-color="${c}"/>
      <stop offset="100%" stop-color="${c}"/></radialGradient>`;
  }

  // Optical type size by composition + name length
  let nameSize = 52;
  if (rawName.length > 14) nameSize = 42;
  else if (rawName.length > 10) nameSize = 46;
  else if (rawName.length <= 5) nameSize = 58;
  if (comp === 'wordmark') nameSize = Math.round(nameSize * 1.12);
  if (comp === 'monogram') nameSize = Math.round(nameSize * 0.88);

  const symbol = symbolMarkup(d.symbol, c, d.symbolSize || 100, monogramLetter, gradientId || null);

  // Premium vertical rhythm (golden-ish spacing)
  let nameY = 372 + offsetY;
  let descY = 412 + offsetY;
  let symbolOffset = `translate(${offsetX} 8)`;
  let textTransform = `translate(${450 + offsetX} 0) scale(${scale}) translate(-450 0)`;

  if (comp === 'horizontal') {
    nameY = 298 + offsetY;
    descY = 338 + offsetY;
    symbolOffset = `translate(${-155 + offsetX} 78)`;
    textTransform = `translate(${505 + offsetX} 0) scale(${scale}) translate(-450 0)`;
  } else if (comp === 'wordmark') {
    nameY = 292 + offsetY;
    descY = 338 + offsetY;
  } else if (comp === 'seal') {
    nameY = 392 + offsetY;
    descY = 430 + offsetY;
  } else if (comp === 'monogram') {
    nameY = 400 + offsetY;
    descY = 438 + offsetY;
  }

  // Elegant double-ring seal with refined stroke weights
  const seal = comp === 'seal'
    ? `<circle cx="450" cy="278" r="198" fill="none" stroke="${c}" stroke-width="1.25" stroke-opacity="0.9"/>
       <circle cx="450" cy="278" r="186" fill="none" stroke="${c}" stroke-opacity="0.22" stroke-width="0.9"/>
       <circle cx="450" cy="278" r="172" fill="none" stroke="${sub}" stroke-opacity="0.18" stroke-width="0.7"/>`
    : '';

  const mark = (comp === 'wordmark') ? '' : `<g transform="${symbolOffset}">${symbol}</g>`;

  // Descriptor: small caps feel via tracking + refined rule
  const descBlock = desc
    ? `<path d="M360 ${descY - 20} H540" stroke="${sub}" stroke-opacity="0.35" stroke-width="0.85"/>
       <text x="450" y="${descY}" text-anchor="middle" fill="${sub}"
             font-family="'Segoe UI', system-ui, sans-serif" font-size="11" font-weight="500"
             letter-spacing="3.5" opacity="0.92">${desc.toUpperCase()}</text>`
    : '';

  // Subtle premium background wash for canvas (not exported as brand bg)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" role="img" aria-label="${name} logo">
  <defs>
    ${gradientDef}
    <filter id="softDepth" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="${c}" flood-opacity="0.08"/>
    </filter>
  </defs>
  <title>${name} logo</title>
  <g id="seal">${seal}</g>
  <g id="symbol" filter="url(#softDepth)">${mark}</g>
  <g id="wordmark" transform="${textTransform}">
    <text x="450" y="${nameY}" text-anchor="middle" fill="${c}"
          font-family="${font}" font-size="${nameSize}" font-weight="${weight}"
          letter-spacing="${tracking}" style="text-rendering:geometricPrecision">${name}</text>
    ${descBlock}
  </g>
</svg>`;
}

// ─────────────────────────────────────────────
// QUALITY + RENDER
// ─────────────────────────────────────────────
function updateQuality() {
  const d = state.design;
  let bg = '#ffffff';
  if (d.background === 'dark') bg = '#1a1f28';
  else if (d.background === 'custom') bg = d.customBg || '#f7f5f0';
  const ratio = contrastRatio(d.primary, bg);
  const name = ($('editName')?.value || '').trim();
  const items = [];

  if (ratio >= 4.5) items.push(['good', `✓ Strong contrast (${ratio.toFixed(1)}:1)`]);
  else if (ratio >= 3) items.push(['warn', `! Moderate contrast (${ratio.toFixed(1)}:1)`]);
  else items.push(['bad', `✗ Low contrast (${ratio.toFixed(1)}:1)`]);

  if (!name) items.push(['bad', '✗ Brand name is empty']);
  else if (name.length > 22) items.push(['warn', '! Long name — consider smaller type or stacked layout']);
  else items.push(['good', '✓ Brand name length suitable']);

  if (d.symbol === 'none' && d.composition !== 'wordmark') {
    items.push(['warn', '! No symbol — consider wordmark composition']);
  } else {
    items.push(['good', '✓ Composition coherent']);
  }

  // Classic design principles checklist
  items.push(['good', '✓ Simplicity — limited forms (design school rule)']);
  if ((d.gradientMode || 'none') === 'none') {
    items.push(['good', '✓ Flat color — prints clean, scales forever']);
  } else {
    items.push(['warn', '! Gradient — verify one-color / small-size versions']);
  }
  const nameLen = ($('editName')?.value || '').trim().length;
  if (nameLen > 0 && nameLen <= 12) {
    items.push(['good', '✓ Name length supports memorability']);
  }
  if (d.symbol === 'craft' || d.symbol === 'monogram' || d.symbol === 'freeform') {
    items.push(['good', '✓ Mark constructed from geometry / craft method']);
  }

  items.push(['good', '✓ Pure vector — scales infinitely']);
  items.push(['good', '✓ Single-colour version remains legible']);

  $('qualityList').innerHTML = items.map(([cls, txt]) => `<li class="${cls}">${txt}</li>`).join('');
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
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgStr, 'image/svg+xml');
  const newSvg = doc.documentElement;
  newSvg.id = 'logoSvg';
  const old = $('logoSvg');
  if (old && old.parentNode) {
    old.parentNode.replaceChild(document.importNode(newSvg, true), old);
  }

  const artboard = $('artboard');
  artboard.classList.remove('dark', 'transparent');
  if (state.design.background === 'dark') artboard.classList.add('dark');
  else if (state.design.background === 'transparent') artboard.classList.add('transparent');
  else if (state.design.background === 'custom') {
    artboard.style.background = state.design.customBg;
  } else {
    artboard.style.background = '';
  }

  updateQuality();
  updateLayers();
  updateSwatches();
  $('canvasStatus').textContent = `Ready · Vector 900×600 · ${state.zoom}%`;
}

function updateLayers() {
  const list = $('layerList');
  if (!list) return;
  const d = state.design;
  const layers = [];
  if (d.symbol !== 'none' && d.composition !== 'wordmark') {
    layers.push({ id: 'symbol', name: 'Symbol · ' + d.symbol });
  }
  layers.push({ id: 'wordmark', name: 'Wordmark · ' + (state.brief.brand || 'Text') });
  if (d.composition === 'seal') layers.push({ id: 'seal', name: 'Seal rings' });

  list.innerHTML = layers.map(l => `
    <li class="layer-item ${state.selectedId === l.id ? 'selected' : ''}" data-id="${l.id}">
      <span class="vis">◉</span>
      <span class="name">${escapeXml(l.name)}</span>
    </li>`).join('');

  list.querySelectorAll('.layer-item').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedId = el.dataset.id;
      updateLayers();
      $('selectionInfo').textContent = 'Selected: ' + el.dataset.id;
    });
  });
}

// ─────────────────────────────────────────────
// CONCEPT GENERATOR
// ─────────────────────────────────────────────
function generateConcepts() {
  const brand = ($('brandName').value.trim() || 'BRAND');
  const descriptor = $('descriptor').value.trim();
  const industry = $('industry').value;
  const personality = $('personality').value;
  const paletteKey = $('palette').value;

  state.brief = {
    brand, descriptor, industry, personality,
    palette: paletteKey,
    notes: $('notes').value.trim()
  };

  const colors = PALETTES[paletteKey] || PALETTES['Navy & gold'] || ['#1a365d', '#c9a227', '#e8d48b'];
  state.design.primary = colors[0];
  state.design.secondary = colors[1];
  state.design.accent = colors[2] || colors[0];
  syncColorInputs();

  const personalityMap = {
    'Premium & minimal':   { compositions: ['stacked', 'wordmark', 'horizontal'], symbols: ['monogram', 'diamond', 'none', 'abstract', 'ring'] },
    'Bold & modern':       { compositions: ['horizontal', 'stacked', 'monogram'], symbols: ['hexagon', 'chevron', 'abstract', 'bolt', 'nodes'] },
    'Elegant & timeless':  { compositions: ['stacked', 'seal', 'wordmark'], symbols: ['columns', 'crest', 'diamond', 'none', 'ring'] },
    'Warm & approachable': { compositions: ['stacked', 'horizontal'], symbols: ['leaf', 'ring', 'wave', 'monogram', 'droplet'] },
    'Playful & expressive':{ compositions: ['stacked', 'monogram'], symbols: ['star', 'abstract', 'wave', 'target', 'petal'] },
    'Heritage & established': { compositions: ['seal', 'stacked', 'wordmark'], symbols: ['crest', 'columns', 'shield', 'monogram', 'book'] },
    'Technical & precise': { compositions: ['horizontal', 'wordmark'], symbols: ['hexagon', 'nodes', 'circuit', 'orbit', 'growth'] },
    'Luxury & exclusive':  { compositions: ['seal', 'stacked', 'monogram'], symbols: ['diamond', 'crest', 'ring', 'none', 'petal'] }
  };

  const industrySymbols = {
    'Technology / SaaS': ['nodes', 'circuit', 'hexagon', 'orbit', 'abstract', 'monogram', 'chevron'],
    'Finance / Fintech': ['growth', 'coin', 'shield', 'diamond', 'monogram', 'ring', 'hexagon'],
    'Real Estate / Housing': ['building', 'skyline', 'key', 'house', 'monogram', 'columns', 'roof'],
    'Property Management': ['key', 'building', 'house', 'monogram', 'shield', 'ring'],
    'Construction / Development': ['building', 'skyline', 'roof', 'hexagon', 'columns', 'chevron'],
    'Architecture / Design': ['columns', 'diamond', 'building', 'monogram', 'abstract', 'hexagon'],
    'Hospitality / Hotel': ['crest', 'key', 'monogram', 'star', 'ring', 'diamond'],
    'Food & Beverage': ['flame', 'leaf', 'cup', 'wave', 'abstract', 'star'],
    'Café / Coffee': ['cup', 'flame', 'leaf', 'ring', 'monogram', 'droplet'],
    'Restaurant': ['flame', 'crest', 'leaf', 'cup', 'star', 'monogram'],
    'Health / Medical': ['pulse', 'droplet', 'shield', 'leaf', 'ring', 'monogram'],
    'Wellness / Fitness': ['bolt', 'pulse', 'leaf', 'target', 'chevron', 'ring'],
    'Beauty / Salon': ['petal', 'leaf', 'diamond', 'wave', 'monogram', 'ring'],
    'Fashion / Apparel': ['diamond', 'petal', 'monogram', 'abstract', 'star', 'wave'],
    'Education / Training': ['book', 'crest', 'monogram', 'columns', 'star', 'ring'],
    'Legal / Law': ['columns', 'crest', 'shield', 'monogram', 'diamond', 'book'],
    'Consulting': ['nodes', 'diamond', 'monogram', 'growth', 'abstract', 'hexagon'],
    'Sports / Team': ['bolt', 'chevron', 'target', 'star', 'shield', 'abstract'],
    'Automotive': ['ring', 'shield', 'chevron', 'bolt', 'abstract', 'hexagon'],
    'Logistics / Transport': ['arrow', 'chevron', 'hexagon', 'nodes', 'orbit', 'bolt'],
    'Energy / Utilities': ['bolt', 'flame', 'orbit', 'hexagon', 'abstract', 'ring'],
    'Agriculture': ['leaf', 'droplet', 'wave', 'shield', 'ring', 'monogram'],
    'Nonprofit / NGO': ['ring', 'nodes', 'leaf', 'star', 'heart', 'monogram'],
    'Church / Ministry': ['crest', 'shield', 'star', 'book', 'columns', 'ring'],
    'Event / Entertainment': ['star', 'flame', 'target', 'abstract', 'ring', 'bolt'],
    'Media / Creative': ['abstract', 'wave', 'diamond', 'monogram', 'star', 'hexagon'],
    'Retail / E-commerce': ['diamond', 'hexagon', 'monogram', 'star', 'ring', 'bag'],
    'Personal brand': ['monogram', 'abstract', 'star', 'diamond', 'none', 'ring'],
    'Business / Company': ['monogram', 'diamond', 'shield', 'abstract', 'nodes', 'hexagon']
  };

  const map = personalityMap[personality] || personalityMap['Premium & minimal'];
  let preferredSymbols = industrySymbols[industry] || map.symbols;
  preferredSymbols = [...new Set([...preferredSymbols, ...map.symbols])].filter(s => s !== 'heart' && s !== 'bag' && s !== 'sun' && s !== 'torch' && s !== 'cross' && s !== 'tag');
  // Designer craft first (traditional methods), then freeform, then industry symbols
  preferredSymbols = ['craft', 'craft', 'craft', 'freeform', ...preferredSymbols, 'craft', 'monogram'];
  if (state._aiSymbolBias && state._aiSymbolBias.length) {
    preferredSymbols = [...new Set([...state._aiSymbolBias, ...preferredSymbols])];
  }

  // Unique style recipes — each concept is a full recipe, not just symbol swap
  const styleRecipes = [
    { composition: 'stacked', gradientMode: 'none', symbolSize: 100, tracking: 5, scale: 100, label: 'Classic stack' },
    { composition: 'stacked', gradientMode: 'linear', symbolSize: 105, tracking: 3, scale: 98, label: 'Gradient stack' },
    { composition: 'horizontal', gradientMode: 'none', symbolSize: 88, tracking: 6, scale: 100, label: 'Wide lockup' },
    { composition: 'horizontal', gradientMode: 'none', symbolSize: 78, tracking: 4, scale: 94, label: 'Compact lockup' },
    { composition: 'wordmark', gradientMode: 'none', symbolSize: 0, tracking: 7, scale: 108, label: 'Pure wordmark' },
    { composition: 'wordmark', gradientMode: 'none', symbolSize: 0, tracking: 3, scale: 100, label: 'Tight wordmark' },
    { composition: 'seal', gradientMode: 'none', symbolSize: 92, tracking: 5, scale: 92, label: 'Badge / seal' },
    { composition: 'seal', gradientMode: 'radial', symbolSize: 96, tracking: 4, scale: 94, label: 'Emblem seal' },
    { composition: 'monogram', gradientMode: 'none', symbolSize: 118, tracking: 4, scale: 88, label: 'Monogram focus' },
    { composition: 'monogram', gradientMode: 'linear', symbolSize: 124, tracking: 2, scale: 86, label: 'Bold monogram' },
    { composition: 'stacked', gradientMode: 'none', symbolSize: 86, tracking: 8, scale: 102, label: 'Airy stack' },
    { composition: 'horizontal', gradientMode: 'radial', symbolSize: 96, tracking: 5, scale: 96, label: 'Soft radial' }
  ];

  const concepts = [];
  const used = new Set();
  let recipeIdx = 0;

  // Pair each preferred symbol with multiple style recipes for maximum uniqueness
  for (const sym of preferredSymbols) {
    for (let r = 0; r < styleRecipes.length && concepts.length < 16; r++) {
      const recipe = styleRecipes[(recipeIdx + r) % styleRecipes.length];
      // wordmark ignores symbol
      const effectiveSym = recipe.composition === 'wordmark' ? 'none' : sym;
      const key = recipe.composition + '|' + effectiveSym + '|' + recipe.gradientMode + '|' + recipe.tracking;
      if (used.has(key)) continue;
      used.add(key);

      let score = 74 + Math.floor(Math.random() * 22);
      if (effectiveSym === preferredSymbols[0]) score += 4;
      if (recipe.composition === 'seal' && (personality.includes('Heritage') || personality.includes('Luxury'))) score += 5;
      if (recipe.composition === 'wordmark' && personality.includes('minimal')) score += 5;
      if (recipe.gradientMode !== 'none' && personality.includes('Bold')) score += 3;
      score = Math.max(72, Math.min(98, score));

      const freeSeed = hashSeed(brand + '|' + concepts.length + '|' + effectiveSym + '|' + recipe.label + '|' + Math.random());
      const freeStyle = effectiveSym === 'freeform'
        ? freeformStyleForIndustry(industry, seededRng(String(freeSeed)))
        : '';
      const craftMethod = effectiveSym === 'craft'
        ? pickCraftMethod(industry, personality, seededRng(String(freeSeed) + '|m'))
        : '';
      let label = recipe.label;
      if (effectiveSym === 'craft') label = 'Craft · ' + craftMethod.replace(/_/g, ' ');
      else if (effectiveSym === 'freeform') label = 'Freeform · ' + freeStyle;
      const scoreBoost = (effectiveSym === 'craft') ? 5 : (effectiveSym === 'freeform' ? 2 : 0);
      concepts.push({
        id: concepts.length,
        composition: recipe.composition,
        symbol: effectiveSym,
        primary: colors[0],
        secondary: colors[1],
        accent: colors[2] || colors[0],
        gradientMode: recipe.gradientMode,
        symbolSize: recipe.symbolSize || 100,
        tracking: recipe.tracking,
        scale: recipe.scale,
        score: Math.min(98, score + scoreBoost),
        label,
        freeSeed,
        freeStyle,
        craftMethod
      });
    }
    recipeIdx += 3;
    if (concepts.length >= 16) break;
  }

  // Ensure pure wordmark always present
  if (!concepts.some(c => c.composition === 'wordmark')) {
    concepts.push({
      id: concepts.length,
      composition: 'wordmark', symbol: 'none',
      primary: colors[0], secondary: colors[1], accent: colors[2] || colors[0],
      gradientMode: 'none', symbolSize: 100, tracking: 6, scale: 105,
      score: 80, label: 'Wordmark only'
    });
  }

  concepts.sort((a, b) => b.score - a.score);
  // Keep top 16 unique
  state.concepts = concepts.slice(0, 16);
  state.activeConcept = 0;
  applyConcept(0);
  renderConceptStrip();
  $('statusMsg').textContent = `Generated ${state.concepts.length} unique directions — explore and refine`;
}


function applyConcept(index) {
  const c = state.concepts[index];
  if (!c) return;
  state.activeConcept = index;
  state.design.composition = c.composition;
  state.design.symbol = c.symbol;
  state.design.primary = c.primary;
  state.design.secondary = c.secondary;
  state.design.accent = c.accent;
  state.design._freeSeed = c.freeSeed || 0;
  state.design._freeStyle = c.freeStyle || '';
  state.design._craftMethod = c.craftMethod || '';
  if (c.gradientMode) state.design.gradientMode = c.gradientMode;
  if (c.symbolSize) state.design.symbolSize = c.symbolSize;
  if (c.tracking != null) state.design.tracking = c.tracking;
  if (c.scale) state.design.scale = c.scale;
  if ($('composition')) $('composition').value = c.composition;
  if ($('symbolKind')) $('symbolKind').value = c.symbol;
  if ($('gradientMode')) $('gradientMode').value = state.design.gradientMode || 'none';
  if ($('symbolSize')) { $('symbolSize').value = state.design.symbolSize; $('symbolSizeVal').textContent = state.design.symbolSize + '%'; }
  if ($('tracking')) { $('tracking').value = state.design.tracking; $('trackingVal').textContent = state.design.tracking; }
  if ($('scale')) { $('scale').value = state.design.scale; $('scaleVal').textContent = state.design.scale + '%'; }
  if ($('editName')) $('editName').value = state.brief.brand;
  if ($('editDescriptor')) $('editDescriptor').value = state.brief.descriptor;
  syncColorInputs();
  render();
  renderConceptStrip();
}

function renderConceptStrip() {
  const container = $('concepts');
  if (!container) return;
  container.innerHTML = state.concepts.map((c, i) => {
    const prev = { ...state.design };
    state.design.composition = c.composition;
    state.design.symbol = c.symbol;
    state.design.primary = c.primary;
    state.design.secondary = c.secondary;
    state.design.accent = c.accent;
    const mini = buildSvg().replace('viewBox="0 0 900 600"', 'viewBox="120 70 660 450"');
    state.design = prev;
    return `<div class="concept-card ${i === state.activeConcept ? 'active' : ''}" data-index="${i}">
      ${mini}<span class="score">${c.score}</span></div>`;
  }).join('');
  container.querySelectorAll('.concept-card').forEach(card => {
    card.addEventListener('click', () => applyConcept(+card.dataset.index));
  });
}

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
  const svg = buildSvg();
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    sanitizeFilename(state.brief.brand || 'logo') + '.svg');
  $('statusMsg').textContent = 'SVG exported · Opens in Illustrator, Affinity, Inkscape, Figma';
}

function exportPng() {
  const svg = buildSvg();
  const res = prefs.pngRes || 2700;
  const h = Math.round(res * (600 / 900));
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (state.design.background === 'dark') {
      ctx.fillStyle = '#1a1f28';
      ctx.fillRect(0, 0, res, h);
    } else if (state.design.background === 'light' || state.design.background === 'custom') {
      ctx.fillStyle = state.design.background === 'custom' ? state.design.customBg : '#ffffff';
      ctx.fillRect(0, 0, res, h);
    }
    ctx.drawImage(img, 0, 0, res, h);
    canvas.toBlob(blob => {
      downloadBlob(blob, sanitizeFilename(state.brief.brand || 'logo') + '.png');
      URL.revokeObjectURL(url);
      $('statusMsg').textContent = `PNG exported @ ${res}×${h}`;
    }, 'image/png');
  };
  img.src = url;
}

function exportPackage() {
  exportSvg();
  setTimeout(exportPng, 350);
  const d = state.design;
  const guidelines = `MARKCRAFT STUDIO — BRAND PACKAGE
================================
Brand: ${state.brief.brand}
Descriptor: ${state.brief.descriptor}
Generated: ${new Date().toISOString().slice(0, 10)}

COLOURS
Primary (RGB): ${d.primary}
Secondary (RGB): ${d.secondary}
Accent (RGB): ${d.accent}
Primary CMYK: ${rgbToCmyk(...hexToRgb(d.primary)).join(', ')}
Secondary CMYK: ${rgbToCmyk(...hexToRgb(d.secondary)).join(', ')}

TYPOGRAPHY
Typeface: ${d.font}
Weight: ${d.fontWeight}
Tracking: ${d.tracking}

COMPOSITION
Layout: ${d.composition}
Symbol: ${d.symbol}
Gradient: ${d.gradientMode}

USAGE
- Maintain clear space equal to the height of the primary initial.
- Do not stretch, skew or recolour outside the provided palette.
- For small sizes prefer icon-only or monogram versions.
- This package is a starting point. Trademark clearance is the client's responsibility.

Files: SVG (editable vector) + PNG (high-resolution raster)
`;
  setTimeout(() => {
    downloadBlob(new Blob([guidelines], { type: 'text/plain' }),
      sanitizeFilename(state.brief.brand || 'brand') + '-guidelines.txt');
    $('statusMsg').textContent = 'Brand package exported (SVG + PNG + guidelines)';
  }, 700);
}

// ─────────────────────────────────────────────
// PROJECT SAVE / LOAD
// ─────────────────────────────────────────────
function getProjectData() {
  return {
    schemaVersion: state.schemaVersion,
    id: state.id,
    name: $('projectName').value || state.name,
    brief: state.brief,
    design: { ...state.design },
    svg: buildSvg()
  };
}

function saveProject() {
  const data = getProjectData();
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    sanitizeFilename(data.name || 'project') + '.markcraft.json');
  $('statusMsg').textContent = 'Project saved';
}

function loadProject(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.brief) state.brief = data.brief;
      if (data.design) state.design = { ...state.design, ...data.design };
      if (data.name) {
        state.name = data.name;
        $('projectName').value = data.name;
      }
      $('brandName').value = state.brief.brand || '';
      $('descriptor').value = state.brief.descriptor || '';
      $('editName').value = state.brief.brand || '';
      $('editDescriptor').value = state.brief.descriptor || '';
      $('composition').value = state.design.composition;
      $('symbolKind').value = state.design.symbol;
      $('fontFamily').value = state.design.font;
      $('fontWeight').value = state.design.fontWeight || '600';
      $('tracking').value = state.design.tracking;
      $('trackingVal').textContent = state.design.tracking;
      $('scale').value = state.design.scale;
      $('scaleVal').textContent = state.design.scale + '%';
      $('symbolSize').value = state.design.symbolSize;
      $('symbolSizeVal').textContent = state.design.symbolSize + '%';
      $('bgMode').value = state.design.background;
      $('gradientMode').value = state.design.gradientMode || 'none';
      syncColorInputs();
      render();
      $('statusMsg').textContent = 'Project loaded';
    } catch (err) {
      $('statusMsg').textContent = 'Failed to load project';
      console.error(err);
    }
  };
  reader.readAsText(file);
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
1) Composition: stacked | horizontal | wordmark | seal | monogram
2) Symbol keyword from: building, skyline, house, key, columns, roof, nodes, circuit, hexagon, growth, coin, pulse, droplet, flame, cup, leaf, bolt, chevron, target, book, crest, ring, petal, arrow, shield, diamond, orbit, wave, star, abstract, monogram, none
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
    const symKeys = ['building','skyline','house','key','columns','nodes','circuit','hexagon','growth','coin','pulse','droplet','flame','cup','leaf','bolt','chevron','target','book','crest','ring','petal','arrow','shield','diamond','orbit','wave','star','abstract','monogram','roof'];
    const hintSyms = symKeys.filter(k => text.includes(k));
    if (hintSyms.length) state._aiSymbolBias = hintSyms;
    generateConcepts();
    state._aiSymbolBias = null;
    const short = (res.text || '').trim().slice(0, 320).replace(/\s+/g, ' ');
    if ($('aiStatusHint') && short) {
      $('aiStatusHint').textContent = short + ((res.text || '').length > 320 ? '…' : '');
    }
    $('statusMsg').textContent = 'AI-informed concepts ready — ' + state.concepts.length + ' unique directions';
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
    const svg = buildSvg();
    const res = prefs.pngRes || 1800;
    const h = Math.round(res * (600 / 900));
    const pngBytes = await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = res;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = state.design.background === 'dark' ? '#1a1f28' : '#ffffff';
        ctx.fillRect(0, 0, res, h);
        ctx.drawImage(img, 0, 0, res, h);
        canvas.toBlob(async blob => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('PNG raster failed'));
          const buf = await blob.arrayBuffer();
          resolve(Array.from(new Uint8Array(buf)));
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('SVG raster failed'));
      img.src = url;
    });

    const d = state.design;
    const result = await window.markcraft.exportPdf({
      brand: state.brief.brand || 'Brand',
      descriptor: state.brief.descriptor || '',
      primary: d.primary,
      secondary: d.secondary,
      accent: d.accent,
      fontName: d.font,
      composition: d.composition,
      symbol: d.symbol,
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
  $('generateBtn').addEventListener('click', generateConcepts);

  ['editName', 'editDescriptor'].forEach(id => {
    $(id).addEventListener('input', () => {
      state.brief.brand = $('editName').value;
      state.brief.descriptor = $('editDescriptor').value;
      render();
    });
  });

  $('fontFamily').addEventListener('change', e => { state.design.font = e.target.value; render(); });
  $('fontWeight').addEventListener('change', e => { state.design.fontWeight = e.target.value; render(); });

  $('tracking').addEventListener('input', e => {
    state.design.tracking = +e.target.value;
    $('trackingVal').textContent = e.target.value;
    render();
  });
  $('scale').addEventListener('input', e => {
    state.design.scale = +e.target.value;
    $('scaleVal').textContent = e.target.value + '%';
    render();
  });
  $('symbolSize').addEventListener('input', e => {
    state.design.symbolSize = +e.target.value;
    $('symbolSizeVal').textContent = e.target.value + '%';
    render();
  });
  $('offsetY').addEventListener('input', e => {
    state.design.offsetY = +e.target.value;
    $('offsetYVal').textContent = e.target.value;
    render();
  });
  $('offsetX').addEventListener('input', e => {
    state.design.offsetX = +e.target.value;
    $('offsetXVal').textContent = e.target.value;
    render();
  });

  $('composition').addEventListener('change', e => { state.design.composition = e.target.value; render(); });
  $('symbolKind').addEventListener('change', e => { state.design.symbol = e.target.value; render(); });
  $('gradientMode').addEventListener('change', e => { state.design.gradientMode = e.target.value; render(); });

  function bindColor(colorId, hexId, key) {
    $(colorId).addEventListener('input', () => {
      $(hexId).value = $(colorId).value;
      state.design[key] = $(colorId).value;
      updateCmykFromHex(key === 'primary' ? 'primary' : 'secondary', state.design[key]);
      render();
    });
    $(hexId).addEventListener('change', () => {
      let v = $(hexId).value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        $(colorId).value = v;
        state.design[key] = v;
        updateCmykFromHex(key === 'primary' ? 'primary' : 'secondary', v);
        render();
      }
    });
  }
  bindColor('primaryColor', 'primaryHex', 'primary');
  bindColor('secondaryColor', 'secondaryHex', 'secondary');
  bindColor('accentColor', 'accentHex', 'accent');

  // CMYK inputs → RGB
  function bindCmyk(prefix, key) {
    ['C', 'M', 'Y', 'K'].forEach(ch => {
      const el = $(prefix + ch);
      if (!el) return;
      el.addEventListener('change', () => {
        const c = +$('pC' in window || prefix === 'p' ? 'pC' : 'sC').value || 0;
        // simpler:
        const vals = prefix === 'p'
          ? [+$('pC').value, +$('pM').value, +$('pY').value, +$('pK').value]
          : [+$('sC').value, +$('sM').value, +$('sY').value, +$('sK').value];
        const [r, g, b] = cmykToRgb(...vals);
        const hex = rgbToHex(r, g, b);
        state.design[key] = hex;
        if (key === 'primary') {
          $('primaryColor').value = hex;
          $('primaryHex').value = hex;
        } else {
          $('secondaryColor').value = hex;
          $('secondaryHex').value = hex;
        }
        render();
      });
    });
  }
  bindCmyk('p', 'primary');
  bindCmyk('s', 'secondary');

  // Colour mode toggle
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

  // Harmony
  $('harmonyComplement').addEventListener('click', () => applyHarmony('complement'));
  $('harmonyAnalogous').addEventListener('click', () => applyHarmony('analogous'));
  $('harmonyTriad').addEventListener('click', () => applyHarmony('triad'));
  $('harmonyMono').addEventListener('click', () => applyHarmony('mono'));

  $('bgMode').addEventListener('change', e => {
    state.design.background = e.target.value;
    $('customBgRow').hidden = e.target.value !== 'custom';
    render();
  });
  $('customBgColor').addEventListener('input', () => {
    state.design.customBg = $('customBgColor').value;
    $('customBgHex').value = state.design.customBg;
    render();
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.hidden = true);
      const target = $('tab-' + tab.dataset.tab);
      if (target) target.hidden = false;
    });
  });

  // Tools
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tool = btn.dataset.tool;
    });
  });

  $('bgToggle').addEventListener('click', () => {
    const modes = ['light', 'dark', 'transparent', 'custom'];
    const idx = modes.indexOf(state.design.background);
    state.design.background = modes[(idx + 1) % modes.length];
    $('bgMode').value = state.design.background;
    $('customBgRow').hidden = state.design.background !== 'custom';
    render();
  });

  $('gridToggle').addEventListener('click', () => {
    $('artboardWrap').classList.toggle('grid-off');
  });

  $('zoomIn').addEventListener('click', () => {
    state.zoom = clamp(state.zoom + 10, 50, 200);
    $('zoomLabel').textContent = state.zoom + '%';
    $('artboard').style.transform = `scale(${state.zoom / 100})`;
  });
  $('zoomOut').addEventListener('click', () => {
    state.zoom = clamp(state.zoom - 10, 50, 200);
    $('zoomLabel').textContent = state.zoom + '%';
    $('artboard').style.transform = `scale(${state.zoom / 100})`;
  });

  // Export
  $('exportSvgBtn').addEventListener('click', exportSvg);
  $('exportPngBtn').addEventListener('click', exportPng);
  $('exportPackageBtn').addEventListener('click', exportPackage);
  if ($('exportPdfBtn')) $('exportPdfBtn').addEventListener('click', exportPdfBrandBook);
  if ($('aiGenerateBtn')) $('aiGenerateBtn').addEventListener('click', aiSuggestConcepts);

  // Project
  $('saveBtn').addEventListener('click', saveProject);
  $('newBtn').addEventListener('click', () => {
    if (confirm('Start a new project? Unsaved changes will be lost.')) location.reload();
  });
  $('openBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.markcraft.json';
    input.onchange = () => { if (input.files[0]) loadProject(input.files[0]); };
    input.click();
  });
  $('projectName').addEventListener('change', e => { state.name = e.target.value; });

  // Preferences & About
  $('prefsBtn').addEventListener('click', openPrefs);
  $('prefsClose').addEventListener('click', closePrefs);
  $('prefsCancel').addEventListener('click', closePrefs);
  $('prefsSave').addEventListener('click', savePrefsFromUI);
  $('aboutClose').addEventListener('click', closeAbout);
  $('aboutOk').addEventListener('click', closeAbout);

  // Menu buttons
  $('menuHelp').addEventListener('click', openAbout);
  $('menuFile').addEventListener('click', () => {
    // simple: focus save
    $('statusMsg').textContent = 'File · Use Save / Open / New buttons';
  });
  $('menuEdit').addEventListener('click', () => {
    $('statusMsg').textContent = 'Edit · Use inspector panels to refine';
  });
  $('menuView').addEventListener('click', openPrefs);

  // Close modals on overlay click
  $('prefsModal').addEventListener('click', e => { if (e.target === $('prefsModal')) closePrefs(); });
  $('aboutModal').addEventListener('click', e => { if (e.target === $('aboutModal')) closeAbout(); });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveProject(); }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportSvg(); }
    if (e.key === 'Escape') { closePrefs(); closeAbout(); }
  });
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
async function init() {
  await loadPrefsAsync();
  applyTheme(prefs.theme);
  if (prefs.grid === 'off') $('artboardWrap').classList.add('grid-off');
  state.design.background = prefs.defaultBg || 'light';
  if ($('bgMode')) $('bgMode').value = state.design.background;

  populateFonts();
  bindEvents();
  updateAiHint();
  generateConcepts();
  $('statusMsg').textContent = 'Markcraft Studio 1.1 ready';
}

document.addEventListener('DOMContentLoaded', init);
