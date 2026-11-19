'use strict';
/**
 * Markcraft Studio — logo engine
 *
 * generate(brief, opts)  → array of concept recipes (plain JSON, 4 at a time)
 * render(design, brief)  → { svg, bbox, warnings }   (900×600 artboard)
 *
 * A "design" is a recipe + the user's overrides (colours, font, sizes…).
 * Layout is MEASURED: text widths are computed first and the lockup is
 * auto-fitted, so the mark can never cover the name (the old overlap bug).
 */
(function (root, factory) {
  const icons = (typeof module === 'object' && module.exports) ? require('./logo-icons.js') : root.MarkcraftIcons;
  if (typeof module === 'object' && module.exports) module.exports = factory(icons);
  else root.MarkcraftEngine = factory(icons);
})(typeof self !== 'undefined' ? self : this, function (Icons) {

  const W = 900, H = 600;
  const n2 = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ───────────── colour helpers ─────────────
  function hexToRgb(hex) {
    const c = String(hex || '#000000').replace('#', '');
    const f = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
    if (!/^[0-9a-f]{6}$/i.test(f)) return [0, 0, 0];
    return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
  }
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  function lum(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }

  // ───────────── RNG ─────────────
  function hashSeed(str) {
    let h = 1779033703 ^ String(str).length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return (h >>> 0);
  }
  function rngFrom(seed) {
    let a = (typeof seed === 'number' ? seed : hashSeed(String(seed))) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ───────────── fonts ─────────────
  // System fonts only (no paid licences). Each key is a full fallback stack.
  const FONTS = {
    didone: { label: 'Didone display', css: "'Bodoni MT', Didot, 'Playfair Display', 'Times New Roman', serif", w: 0.74 },
    serif: { label: 'Classic serif', css: "Georgia, 'Times New Roman', serif", w: 0.76 },
    garamond: { label: 'Garamond', css: "Garamond, 'EB Garamond', 'Palatino Linotype', Georgia, serif", w: 0.68 },
    palatino: { label: 'Palatino', css: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif", w: 0.74 },
    humanist: { label: 'Humanist sans', css: "'Segoe UI', 'Trebuchet MS', Verdana, sans-serif", w: 0.70 },
    geo: { label: 'Geometric sans', css: "'Century Gothic', Futura, 'Avenir Next', 'Segoe UI', sans-serif", w: 0.80 },
    grotesk: { label: 'Grotesk', css: "Arial, Helvetica, 'Liberation Sans', sans-serif", w: 0.72 },
    heavy: { label: 'Heavy display', css: "'Arial Black', Impact, 'Arial', sans-serif", w: 0.86 },
    condensed: { label: 'Condensed', css: "'Franklin Gothic Medium', 'Arial Narrow', 'Liberation Sans Narrow', Arial, sans-serif", w: 0.60 },
    rounded: { label: 'Friendly rounded', css: "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif", w: 0.74 },
    mono: { label: 'Technical mono', css: "Consolas, 'Courier New', monospace", w: 0.62 }
  };
  const BODY_FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

  // Font pairings: [name font, weight, tracking, case]  +  [descriptor font]
  const PAIRINGS = {
    'Premium & minimal': [['didone', 500, 7, 'upper'], ['garamond', 500, 6, 'upper'], ['geo', 400, 9, 'upper'], ['serif', 400, 6, 'upper']],
    'Bold & modern': [['heavy', 800, 2, 'upper'], ['grotesk', 800, 3, 'upper'], ['condensed', 700, 4, 'upper'], ['geo', 700, 4, 'upper']],
    'Elegant & timeless': [['didone', 600, 5, 'upper'], ['garamond', 600, 5, 'upper'], ['serif', 600, 5, 'upper'], ['palatino', 600, 4, 'upper']],
    'Warm & approachable': [['rounded', 700, 2, 'title'], ['humanist', 700, 2, 'title'], ['serif', 700, 1, 'title'], ['geo', 600, 3, 'upper']],
    'Playful & expressive': [['rounded', 800, 1, 'title'], ['heavy', 800, 0, 'upper'], ['geo', 700, 2, 'title']],
    'Heritage & established': [['serif', 700, 4, 'upper'], ['didone', 700, 4, 'upper'], ['garamond', 700, 4, 'upper'], ['palatino', 700, 4, 'upper']],
    'Technical & precise': [['mono', 700, 5, 'upper'], ['grotesk', 600, 6, 'upper'], ['geo', 600, 6, 'upper'], ['condensed', 600, 5, 'upper']],
    'Luxury & exclusive': [['didone', 500, 11, 'upper'], ['garamond', 500, 10, 'upper'], ['serif', 400, 12, 'upper'], ['geo', 300, 14, 'upper']]
  };
  const DESC_FONT_FOR = { didone: 'humanist', serif: 'humanist', garamond: 'humanist', palatino: 'humanist', mono: 'mono', heavy: 'grotesk', condensed: 'grotesk' };

  // personality → layout / frame / fill / ornament preferences
  const PERSONA = {
    'Premium & minimal': { layouts: ['stacked', 'horizontal', 'wordmark', 'monogram'], frames: ['none', 'circle', 'hexagon', 'squircle'], fills: ['outline', 'duotone', 'solid'], orn: ['none', 'none', 'ticks'], wm: ['plain', 'ruled', 'twotone'] },
    'Bold & modern': { layouts: ['horizontal', 'stacked', 'monogram', 'wordmark'], frames: ['squircle', 'hexagon', 'octagon', 'none'], fills: ['solid', 'solid', 'outline'], orn: ['none'], wm: ['twotone', 'plain', 'underline'] },
    'Elegant & timeless': { layouts: ['stacked', 'badge', 'banner', 'monogram', 'wordmark'], frames: ['circle', 'shield', 'arch', 'ringdots'], fills: ['duotone', 'outline', 'solid'], orn: ['laurel', 'stars', 'ticks'], wm: ['ruled', 'plain', 'firstcap'] },
    'Warm & approachable': { layouts: ['stacked', 'horizontal', 'badge', 'banner'], frames: ['circle', 'squircle', 'arch', 'none'], fills: ['solid', 'duotone'], orn: ['none', 'dots'], wm: ['twotone', 'plain', 'underline'] },
    'Playful & expressive': { layouts: ['stacked', 'monogram', 'horizontal', 'badge'], frames: ['squircle', 'rosette', 'circle', 'none'], fills: ['solid', 'duotone'], orn: ['stars', 'dots'], wm: ['twotone', 'firstcap', 'underline'] },
    'Heritage & established': { layouts: ['badge', 'banner', 'stacked', 'monogram'], frames: ['shield', 'circle', 'rosette', 'arch'], fills: ['solid', 'duotone', 'outline'], orn: ['laurel', 'ticks', 'stars'], wm: ['ruled', 'plain'] },
    'Technical & precise': { layouts: ['horizontal', 'stacked', 'wordmark', 'monogram'], frames: ['hexagon', 'octagon', 'squircle', 'none'], fills: ['solid', 'outline'], orn: ['none', 'ticks'], wm: ['twotone', 'plain', 'underline'] },
    'Luxury & exclusive': { layouts: ['monogram', 'stacked', 'badge', 'banner', 'wordmark'], frames: ['circle', 'diamond', 'ringdots', 'arch'], fills: ['outline', 'duotone', 'solid'], orn: ['laurel', 'stars', 'ticks'], wm: ['ruled', 'plain', 'firstcap'] }
  };

  const PERSONA_FX = {
    'Premium & minimal': { finish: ['flat', 'gradient', 'emboss', 'gradient'], backdrop: ['none', 'none', 'offset', 'rings'] },
    'Bold & modern': { finish: ['3d', 'gradient', '3d', 'flat'], backdrop: ['none', 'offset', 'burst', 'none'] },
    'Elegant & timeless': { finish: ['gradient', 'emboss', '3d', 'gradient'], backdrop: ['none', 'wings', 'rings', 'rays'] },
    'Warm & approachable': { finish: ['gradient', '3d', 'flat', 'emboss'], backdrop: ['offset', 'none', 'swoosh', 'rays'] },
    'Playful & expressive': { finish: ['3d', '3d', 'gradient'], backdrop: ['offset', 'burst', 'swoosh', 'rays'] },
    'Heritage & established': { finish: ['emboss', 'gradient', 'flat', '3d'], backdrop: ['wings', 'none', 'rings', 'burst'] },
    'Technical & precise': { finish: ['flat', 'gradient', '3d', 'emboss'], backdrop: ['none', 'rings', 'offset', 'none'] },
    'Luxury & exclusive': { finish: ['gradient', 'emboss', '3d', 'gradient'], backdrop: ['wings', 'rays', 'none', 'rings'] }
  };

  const LAYOUTS = {
    stacked: 'Stacked (mark above type)',
    horizontal: 'Horizontal (mark + type)',
    badge: 'Circular badge',
    banner: 'Emblem with ribbon',
    monogram: 'Monogram focus',
    wordmark: 'Wordmark'
  };
  const FILLS = { solid: 'Solid (reversed icon)', duotone: 'Tinted + outline', outline: 'Outline' };
  const WORDMARK_STYLES = { plain: 'Plain', twotone: 'Two-tone', underline: 'Accent underline', ruled: 'Between rules', firstcap: 'Drop initial' };

  // ───────────── text measuring ─────────────
  let measurer = null;
  function setMeasurer(fn) { measurer = fn; }
  function browserMeasurer() {
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas').getContext && document.createElement('canvas').getContext('2d');
    if (!cv) return null;
    return (text, css, size, weight) => { cv.font = `${weight} ${size}px ${css}`; return cv.measureText(text).width; };
  }
  function measure(text, fontKey, size, weight, tracking) {
    const f = FONTS[fontKey] || (fontKey === 'body' ? { css: BODY_FONT, w: 0.64 } : FONTS.serif);
    if (!measurer) measurer = browserMeasurer();
    let w;
    if (measurer) w = measurer(text, f.css, size, weight);
    else {
      // heuristic for tests / headless use
      w = 0;
      for (const ch of text) {
        let k = f.w;
        if ('IJ1l|!.,:;\' '.includes(ch)) k *= 0.45;
        else if ('MW@%'.includes(ch)) k *= 1.32;
        else if (ch === ch.toLowerCase() && /[a-z]/.test(ch)) k *= 0.82;
        w += k * size * (weight >= 700 ? 1.1 : 1.04);
      }
    }
    return w + (tracking || 0) * Math.max(0, text.length - 1);
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function applyCase(s, mode) {
    if (mode === 'upper') return s.toUpperCase();
    if (mode === 'lower') return s.toLowerCase();
    if (mode === 'title') return s.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());
    return s;
  }

  // Compound names like MASTAHOUSING → MASTA | HOUSING
  const SUFFIXES = ['HOUSING', 'HOMES', 'HOME', 'PROPERTIES', 'PROPERTY', 'REALTY', 'ESTATES', 'LIVING', 'RENTALS', 'APARTMENTS',
    'TECHNOLOGIES', 'TECHNOLOGY', 'TECH', 'SOFT', 'SOFTWARE', 'LABS', 'LAB', 'DIGITAL', 'SYSTEMS', 'NETWORKS', 'CLOUD', 'DATA',
    'CAPITAL', 'FINANCE', 'FUND', 'BANK', 'PAY', 'INVEST', 'HOLDINGS', 'GROUP', 'PARTNERS', 'ASSOCIATES', 'CONSULTING', 'SOLUTIONS',
    'SERVICES', 'LOGISTICS', 'TRANSPORT', 'EXPRESS', 'CARGO', 'MOTORS', 'AUTO', 'ENERGY', 'POWER', 'SOLAR', 'FARMS', 'FOODS', 'KITCHEN',
    'COFFEE', 'CAFE', 'BAKERY', 'HOTEL', 'HOTELS', 'RESORT', 'STUDIO', 'STUDIOS', 'DESIGN', 'MEDIA', 'FILMS', 'EVENTS', 'HEALTH',
    'CARE', 'CLINIC', 'MEDICAL', 'PHARMA', 'FITNESS', 'WELLNESS', 'BEAUTY', 'SALON', 'FASHION', 'WEAR', 'STORE', 'SHOP', 'MARKET',
    'COLLEGE', 'ACADEMY', 'SCHOOL', 'INSTITUTE', 'TRAINING', 'LEARNING', 'CHURCH', 'MINISTRIES', 'FOUNDATION', 'CONSTRUCTION', 'BUILDERS',
    'ARCHITECTS', 'LAW', 'LEGAL', 'ADVOCATES', 'SPORTS', 'CLUB', 'WORKS', 'HUB', 'HOUSE'];
  function splitBrand(name) {
    const clean = String(name || '').trim().replace(/\s+/g, ' ');
    if (!clean) { const e = ['']; e.sep = ' '; return e; }
    if (clean.includes(' ')) {
      const words = clean.split(' ');
      let r;
      if (words.length === 2) r = words;
      else { const mid = Math.ceil(words.length / 2); r = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]; }
      r.sep = ' ';
      return r;
    }
    const up = clean.toUpperCase();
    for (const s of SUFFIXES.sort((a, b) => b.length - a.length)) {
      if (up.length > s.length + 2 && up.endsWith(s)) { const r = [clean.slice(0, clean.length - s.length), clean.slice(clean.length - s.length)]; r.sep = ''; return r; }
    }
    const one = [clean]; one.sep = ' ';
    return one;
  }
  function initials(name, n = 2) {
    const clean = String(name || '').trim().replace(/\s+/g, ' ');
    const words = clean.split(' ').filter(w => /[\p{L}\p{N}]/u.test(w));
    let letters;
    if (words.length >= 2) letters = words.slice(0, n).map(w => Array.from(w.replace(/^[^\p{L}\p{N}]+/u, ''))[0] || '').join('');
    else { const p = splitBrand(clean); letters = p.map(x => Array.from(x)[0] || '').join(''); }
    return (letters.toUpperCase().slice(0, Math.max(1, n))) || '?';
  }

  // ───────────── palette resolution ─────────────
  function resolvePalette(d, bg) {
    let P = d.primary || '#1a365d', S = d.secondary || '#c9a227', A = d.accent || '#e8d48b';
    if (d.roles === 'swap') { const t = P; P = S; S = t; }
    const bgc = bg || '#ffffff';
    // make sure ink stays readable on the chosen background
    const readable = c => contrast(c, bgc) >= 3;
    let ink = P;
    if (!readable(ink)) ink = [A, S, '#ffffff', '#111111'].find(readable) || (lum(bgc) > 0.4 ? '#111111' : '#ffffff');
    let ink2 = S;
    if (contrast(ink2, bgc) < 1.9) ink2 = [A, P, '#ffffff', '#111111'].find(c => contrast(c, bgc) >= 1.9) || ink;
    const light = mix(A, '#ffffff', 0.72);
    const onFrame = c => (lum(c) > 0.55 ? '#14181f' : (lum(c) > 0.3 ? mix(c, '#000000', 0.78) : light));
    return { P, S, A, bg: bgc, ink, ink2, light, onFrame };
  }

  // ───────────── depth / finish helpers ─────────────
  const FINISHES = { flat: 'Flat', gradient: 'Gradient + gloss', '3d': '3D extruded', emboss: 'Embossed' };
  const BACKDROPS = { none: 'None', offset: 'Offset shadow layer', rays: 'Sun rays', swoosh: 'Swoosh arcs', rings: 'Orbit rings', wings: 'Wings', burst: 'Seal burst' };

  function extrudeFilter(id, dark, steps, dx, dy, shadow) {
    let f = `<filter id="${id}" x="-25%" y="-25%" width="150%" height="165%" color-interpolation-filters="sRGB">`;
    f += `<feFlood flood-color="${dark}" result="fl"/><feComposite in="fl" in2="SourceAlpha" operator="in" result="dk"/>`;
    if (shadow) f += `<feGaussianBlur in="SourceAlpha" stdDeviation="${shadow.blur}" result="bl"/><feOffset in="bl" dx="${shadow.dx}" dy="${shadow.dy}" result="sh"/><feFlood flood-color="#000" flood-opacity="${shadow.op}" result="sf"/><feComposite in="sf" in2="sh" operator="in" result="shadow"/>`;
    for (let i = steps; i >= 1; i--) f += `<feOffset in="dk" dx="${n2(i * dx)}" dy="${n2(i * dy)}" result="e${i}"/>`;
    f += '<feMerge>' + (shadow ? '<feMergeNode in="shadow"/>' : '');
    for (let i = steps; i >= 1; i--) f += `<feMergeNode in="e${i}"/>`;
    return f + '<feMergeNode in="SourceGraphic"/></feMerge></filter>';
  }
  function softShadowFilter(id, blur, dx, dy, op) {
    return `<filter id="${id}" x="-25%" y="-25%" width="150%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/><feOffset in="b" dx="${dx}" dy="${dy}" result="o"/><feFlood flood-color="#000" flood-opacity="${op}" result="c"/><feComposite in="c" in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  }
  const vgrad = (id, top, mid, bot) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/>${mid ? `<stop offset="0.5" stop-color="${mid}"/>` : ''}<stop offset="1" stop-color="${bot}"/></linearGradient>`;

  /** Backdrop layers sit BEHIND the frame (multi-layer depth). Returns {markup, pad} in the 200 grid. */
  function drawBackdrop(kind, pal, frameKey, finish) {
    const c2 = pal.ink2, c1 = pal.ink;
    const fr = Icons.FRAMES[frameKey] || Icons.FRAMES.none;
    if (kind === 'offset') {
      if (!fr.shape) return { markup: `<circle cx="108" cy="110" r="86" fill="${mix(c2, pal.bg, 0.55)}"/><circle cx="100" cy="100" r="86" fill="${mix(c2, pal.bg, 0.82)}"/>`, pad: 0 };
      return { markup: `<g transform="translate(11 11)">${Icons.shapeMarkup(fr.shape, `fill="${c2}"`)}</g><g transform="translate(5.5 5.5)">${Icons.shapeMarkup(fr.shape, `fill="${mix(c2, c1, 0.4)}"`)}</g>`, pad: 0, bottom: 12, right: 12 };
    }
    if (kind === 'rays') {
      let m = '';
      for (let i = 0; i < 28; i++) {
        const a0 = i * 360 / 28 * Math.PI / 180, a1 = a0 + (Math.PI / 28) * 0.9, R = 150;
        m += `<polygon points="100,100 ${n2(100 + R * Math.cos(a0))},${n2(100 + R * Math.sin(a0))} ${n2(100 + R * Math.cos(a1))},${n2(100 + R * Math.sin(a1))}" fill="${c2}" opacity="${i % 2 ? 0.16 : 0.3}"/>`;
      }
      return { markup: m, pad: 50 };
    }
    if (kind === 'swoosh') {
      return { markup: `<path d="M-14 118 C20 214 180 214 214 118 C186 190 14 190 -14 118Z" fill="${c2}"/><path d="M-6 132 C28 222 172 222 206 132 C178 200 22 200 -6 132Z" fill="${c1}" opacity="0.85"/>`, pad: 18, bottom: 30 };
    }
    if (kind === 'rings') {
      return { markup: `<circle cx="100" cy="100" r="112" fill="none" stroke="${c2}" stroke-width="1.8" opacity="0.8"/><circle cx="100" cy="100" r="122" fill="none" stroke="${c2}" stroke-width="1.2" stroke-dasharray="2 6" opacity="0.9"/><circle cx="100" cy="100" r="132" fill="none" stroke="${c2}" stroke-width="0.9" opacity="0.5"/><ellipse cx="100" cy="100" rx="136" ry="40" fill="none" stroke="${c2}" stroke-width="2.4" transform="rotate(-24 100 100)" opacity="0.85"/>`, pad: 36 };
    }
    if (kind === 'wings') {
      let one = '';
      for (let i = 0; i < 7; i++) {
        one += `<ellipse cx="${n2(80 - i * 3)}" cy="0" rx="${n2(62 - i * 4.6)}" ry="${n2(10 - i * 0.55)}" fill="${c2}" opacity="${i % 2 ? 0.72 : 1}" transform="rotate(${n2(-4 - i * 12.5)})"/>`;
      }
      return { markup: `<g transform="translate(102 112)">${one}</g><g transform="translate(98 112) scale(-1 1)">${one}</g>`, pad: 70 };
    }
    if (kind === 'burst') {
      const p = Icons.starPts(100, 100, 128, 114, 20);
      return { markup: `<polygon points="${p.map(q => n2(q[0]) + ',' + n2(q[1])).join(' ')}" fill="${c2}"/><circle cx="100" cy="100" r="108" fill="none" stroke="${pal.bg}" stroke-width="1.6" opacity="0.6"/>`, pad: 30 };
    }
    return { markup: '', pad: 0 };
  }

  // ───────────── mark builder (backdrop + frame + icon + badge + ornament) ─────────────
  /** Builds the emblem at 200×200 native size. Returns { markup, orn, defs, x0,y0,x1,y1 } */
  function buildMark(d, pal, uid, wantLetters) {
    const frameKey = Icons.FRAMES[d.frame] ? d.frame : 'none';
    const fr = Icons.FRAMES[frameKey];
    const fillStyle = d.fill || 'solid';
    const finish = FINISHES[d.finish] ? d.finish : 'flat';
    const rich = finish !== 'flat';
    const grad = !rich && d.gradientMode && d.gradientMode !== 'none';
    const gid = uid + 'g';
    let defs = '';
    let main = pal.ink;
    if (grad) {
      defs += d.gradientMode === 'radial'
        ? `<radialGradient id="${gid}" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="${pal.A}"/><stop offset="0.65" stop-color="${pal.ink}"/></radialGradient>`
        : `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.ink}"/><stop offset="0.55" stop-color="${pal.ink}"/><stop offset="1" stop-color="${pal.A}"/></linearGradient>`;
      main = `url(#${gid})`;
    }
    let accent = pal.ink2, light = null;
    if (rich) {
      defs += vgrad(uid + 'fg', mix(pal.ink, '#ffffff', 0.3), pal.ink, mix(pal.ink, '#000000', 0.34));
      defs += vgrad(uid + 'sg', mix(pal.ink2, '#ffffff', 0.55), pal.ink2, mix(pal.ink2, '#000000', 0.3));
      defs += vgrad(uid + 'lg', '#ffffff', null, mix(pal.light, '#000000', 0.12));
      main = `url(#${uid}fg)`;
      accent = `url(#${uid}sg)`;
      light = `url(#${uid}lg)`;
    }
    let frameFill = main, iconA, iconB, iconC, inset, tint;
    if (frameKey === 'none') {
      iconA = main; iconB = accent; iconC = pal.bg; inset = pal.ink2; tint = 'none';
    } else if (fillStyle === 'solid') {
      const fc = pal.ink;
      iconA = light && lum(pal.onFrame(fc)) > 0.55 ? light : pal.onFrame(fc);
      iconB = (contrast(pal.ink2, fc) >= 2 ? accent : pal.A);
      iconC = rich ? mix(pal.ink, '#000000', 0.1) : (grad ? pal.ink : fc);
      inset = pal.ink2 === fc ? pal.A : pal.ink2; tint = 'none';
    } else if (fillStyle === 'duotone') {
      tint = mix(pal.ink, pal.bg, 0.9);
      iconA = main; iconB = accent; iconC = tint; inset = pal.ink2;
    } else {
      iconA = main; iconB = accent; iconC = pal.bg; inset = pal.ink2; tint = 'none';
    }
    if (iconC === 'none' || !iconC) iconC = '#ffffff';

    const fb = fr.box;
    let frameSvg = '';
    let frameStyle = fillStyle;
    // a see-through outline frame would show the backdrop layers through it: make it opaque
    if (frameKey !== 'none' && fillStyle === 'outline' && d.backdrop && d.backdrop !== 'none') { frameStyle = 'duotone'; tint = pal.bg; iconC = pal.bg; }
    if (frameKey !== 'none') {
      frameSvg = Icons.drawFrame(frameKey, frameStyle, { fill: frameFill, stroke: pal.ink, inset, tint });
      if (rich && fr.shape) {
        defs += `<linearGradient id="${uid}bv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.45"/></linearGradient>`;
        frameSvg += Icons.shapeMarkup(fr.shape, `fill="none" stroke="url(#${uid}bv)" stroke-width="3.4"`, 0.955);
        if (fillStyle === 'solid') {
          defs += `<clipPath id="${uid}cp">${Icons.shapeMarkup(fr.shape, '')}</clipPath><linearGradient id="${uid}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;
          frameSvg += `<g clip-path="url(#${uid}cp)"><ellipse cx="100" cy="-4" rx="150" ry="96" fill="url(#${uid}gl)"/></g>`;
        }
      }
      if (finish === '3d') {
        defs += extrudeFilter(uid + 'xf', mix(pal.ink, '#000000', 0.5), 9, 0.3, 1.0, { blur: 3, dx: 2, dy: 11, op: 0.3 });
        frameSvg = `<g filter="url(#${uid}xf)">${frameSvg}</g>`;
      } else if (finish === 'emboss' || finish === 'gradient') {
        defs += softShadowFilter(uid + 'sf', 3.2, 0, 5, 0.28);
        frameSvg = `<g filter="url(#${uid}sf)">${frameSvg}</g>`;
      }
    }

    let iconSvg = '';
    const letters = d.icon === 'monogram' || wantLetters;
    if (letters) {
      const txt = esc(wantLetters && typeof wantLetters === 'string' ? wantLetters : initials(d.brand || '', d.monoCount || 2));
      const fk = d.monoFont || (d.fontKey && FONTS[d.fontKey] ? d.fontKey : 'didone');
      const size = txt.length > 1 ? fb.h * 0.62 : fb.h * 0.84;
      const letterFill = frameKey === 'none' ? main : (fillStyle === 'solid' ? iconA : main);
      iconSvg += `<text x="${fb.x + fb.w / 2}" y="${fb.y + fb.h / 2 + size * 0.34}" text-anchor="middle" font-family="${FONTS[fk].css}" font-size="${n2(size)}" font-weight="${txt.length > 1 ? 600 : 500}" fill="${letterFill}" letter-spacing="${txt.length > 1 ? -1 : 0}">${txt}</text>`;
      if (frameKey === 'none') iconSvg += `<path d="M${fb.x + 10} ${fb.y + fb.h + 4} H${fb.x + fb.w - 10}" stroke="${pal.ink2}" stroke-width="2.4" stroke-linecap="round"/>`;
    } else {
      const ic = Icons.ICONS[d.icon] && Icons.ICONS[d.icon].draw ? Icons.ICONS[d.icon] : Icons.ICONS.abstract;
      const ratio = (d.iconScale || 100) / 100;
      const sz = Math.min(fb.w, fb.h) * ratio;
      const sc = sz / 100;
      const tx = fb.x + (fb.w - sz) / 2, ty = fb.y + (fb.h - sz) / 2;
      iconSvg += `<g transform="translate(${n2(tx)} ${n2(ty)}) scale(${n2(sc)})" data-icon="${d.icon}">${ic.draw({ a: iconA, b: iconB, c: iconC })}</g>`;
    }
    if (finish === '3d' || finish === 'emboss') {
      const dk = frameKey !== 'none' && fillStyle === 'solid' ? mix(pal.ink, '#000000', 0.55) : mix(pal.ink, '#000000', 0.5);
      defs += extrudeFilter(uid + 'xi', dk, finish === '3d' ? 4 : 2, 0.2, 0.55, { blur: 1.4, dx: 0.6, dy: 3.2, op: 0.3 });
      iconSvg = `<g filter="url(#${uid}xi)">${iconSvg}</g>`;
    }

    // small secondary symbol pinned to the lower-right of the mark
    let badgeSvg = '';
    const bi = d.badgeIcon && d.badgeIcon !== 'none' && d.badgeIcon !== d.icon && Icons.ICONS[d.badgeIcon] && Icons.ICONS[d.badgeIcon].draw ? Icons.ICONS[d.badgeIcon] : null;
    if (bi && !letters) {
      const bx = frameKey === 'none' ? 156 : 160, by = frameKey === 'none' ? 156 : 160, br = 31;
      const disc = pal.ink2 === pal.ink ? pal.A : pal.ink2;
      badgeSvg = `<g>${rich ? '' : ''}<circle cx="${bx}" cy="${by}" r="${br + 5}" fill="${pal.bg === '#ffffff' || lum(pal.bg) > 0.4 ? '#ffffff' : pal.bg}"/><circle cx="${bx}" cy="${by}" r="${br}" fill="${rich ? accent : disc}"/><circle cx="${bx}" cy="${by}" r="${br - 4}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.2"/><g transform="translate(${bx - 19} ${by - 19}) scale(0.38)">${bi.draw({ a: pal.onFrame(disc), b: pal.ink, c: disc })}</g></g>`;
      if (finish !== 'flat') { defs += softShadowFilter(uid + 'bf', 2, 0, 3, 0.3); badgeSvg = badgeSvg.replace('<g>', `<g filter="url(#${uid}bf)">`); }
    }

    const bd = drawBackdrop(d.backdrop, pal, frameKey, finish);
    const orn = Icons.drawOrnament(d.ornament, pal.ink2, frameKey);
    let x0 = 0, y0 = 0, x1 = 200, y1 = 200;
    if (frameKey === 'none') { x0 = fb.x; y0 = fb.y; x1 = fb.x + fb.w; y1 = fb.y + fb.h + (letters ? 8 : 0); }
    if (finish === '3d') { y1 += 14; }
    else if (finish === 'emboss' || finish === 'gradient') { y1 += 6; }
    if (bd.pad) { x0 -= bd.pad; x1 += bd.pad; y0 -= bd.pad * 0.5; y1 += bd.pad * 0.5; }
    if (bd.bottom) y1 = Math.max(y1, 200 + bd.bottom);
    if (bd.right) { x1 = Math.max(x1, 200 + bd.right); }
    if (orn.extraBottom) y1 = Math.max(y1, frameKey === 'none' ? 194 : 224);
    if (orn.pad) { x0 -= orn.pad; x1 += orn.pad; y0 -= orn.pad * 0.2; y1 += orn.pad * 0.7; }
    if (bi && !letters && frameKey === 'none') { x1 = Math.max(x1, 192); y1 = Math.max(y1, 192); }
    return { markup: frameSvg + iconSvg + badgeSvg, orn: bd.markup + orn.markup, defs, x0, y0, x1, y1 };
  }

  // ───────────── text pieces ─────────────
  function nameSpec(d, pal, parts, size, style) {
    const fk = FONTS[d.fontKey] ? d.fontKey : 'serif';
    const font = d.fontCss || FONTS[fk].css;
    const weight = +(d.fontWeight || 600);
    const track = d.tracking == null ? 4 : d.tracking;
    const caseMode = d.caseStyle || 'upper';
    const ps = parts.map(p => applyCase(p, caseMode));
    const segs = [];
    if (style === 'twotone' && ps.length >= 2) {
      segs.push({ t: ps[0], fill: pal.ink, weight: Math.max(weight, 700) });
      segs.push({ t: ps.slice(1).join(' '), fill: pal.ink2, weight: Math.min(weight, 400) });
    } else if (style === 'twotone') {
      const t = ps[0]; const cut = Math.ceil(t.length / 2);
      segs.push({ t: t.slice(0, cut), fill: pal.ink, weight: Math.max(weight, 700) });
      segs.push({ t: t.slice(cut), fill: pal.ink2, weight: Math.min(weight, 400) });
    } else if (style === 'firstcap') {
      const t = ps.join(parts.sep == null ? ' ' : parts.sep);
      segs.push({ t: t.charAt(0), fill: pal.ink2, weight, big: 1.32 });
      segs.push({ t: t.slice(1), fill: pal.ink, weight });
    } else {
      segs.push({ t: ps.join(parts.sep == null ? ' ' : parts.sep), fill: pal.ink, weight });
    }
    function width(sz) {
      let w = 0;
      segs.forEach((s, i) => { w += measure(s.t, fk, sz * (s.big || 1), s.weight, track) + (i < segs.length - 1 ? track : 0); });
      return w;
    }
    return {
      segs, track, font, fk,
      width,
      /** svg text element, anchor middle at (cx, baseline y) */
      markup(sz, cx, y, anchor = 'middle', extra = '') {
        const w = width(sz);
        const x = anchor === 'middle' ? cx + track / 2 : cx;
        const tsp = segs.map(s => `<tspan fill="${s.fill}" font-weight="${s.weight}"${s.big ? ` font-size="${n2(sz * s.big)}"` : ''}>${esc(s.t)}</tspan>`).join('');
        return { w, svg: `<text x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" font-family="${font}" font-size="${n2(sz)}" letter-spacing="${track}" style="text-rendering:geometricPrecision" ${extra}>${tsp}</text>` };
      }
    };
  }
  function tagText(d, pal, text, size, fill, anchor, cx, y, trackOverride) {
    const fk = FONTS[d.fontKey] && DESC_FONT_FOR[d.fontKey] ? DESC_FONT_FOR[d.fontKey] : 'grotesk';
    const css = d.descCss || (fk === 'humanist' || fk === 'grotesk' ? BODY_FONT : FONTS[fk].css);
    const track = trackOverride != null ? trackOverride : clamp(Math.round(size * 0.3), 2, 7);
    const t = applyCase(text, d.tagCase || 'upper');
    const w = measure(t, 'body', size, 500, track);
    const x = anchor === 'middle' ? cx + track / 2 : cx;
    return { w, svg: `<text x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" font-family="${css}" font-size="${n2(size)}" font-weight="500" letter-spacing="${track}" fill="${fill}">${esc(t)}</text>` };
  }
  function flankRules(cx, y, w, color, style) {
    // thin rules (or dots) either side of a centred tagline
    const gap = 14, len = 54;
    if (style === 'dots') {
      return `<circle cx="${n2(cx - w / 2 - gap - 3)}" cy="${n2(y)}" r="2.4" fill="${color}"/><circle cx="${n2(cx + w / 2 + gap + 3)}" cy="${n2(y)}" r="2.4" fill="${color}"/>`;
    }
    return `<path d="M${n2(cx - w / 2 - gap - len)} ${n2(y)} H${n2(cx - w / 2 - gap)} M${n2(cx + w / 2 + gap)} ${n2(y)} H${n2(cx + w / 2 + gap + len)}" stroke="${color}" stroke-width="1.4" stroke-opacity="0.8"/>`;
  }

  // ───────────── layouts ─────────────
  // Each returns { parts:[{layer,svg}], w, h, defs }  in local coords, origin top-left.
  function place(mk, x, y, size) {
    const s = size / 200;
    const bw = (mk.x1 - mk.x0) * s, bh = (mk.y1 - mk.y0) * s;
    const g = `<g transform="translate(${n2(x - mk.x0 * s)} ${n2(y - mk.y0 * s)}) scale(${n2(s)})">`;
    return { w: bw, h: bh, orn: `<g data-layer="ornament" transform="translate(${n2(x - mk.x0 * s)} ${n2(y - mk.y0 * s)}) scale(${n2(s)})">${mk.orn}</g>`,
      frame: `${g}${mk.markup}</g>` };
  }
  function fitSize(spec, start, maxW, min = 22) {
    let s = start;
    while (s > min && spec.width(s) > maxW) s -= 1;
    return s;
  }

  function layoutStacked(d, pal, uid, warn) {
    const parts = splitBrand(d.brand);
    const markSize = 190 * (d.symbolSize / 100);
    const mk = buildMark(d, pal, uid);
    const baseSize = 60;
    const maxW = 640;
    let spec = nameSpec(d, pal, parts, baseSize, d.wordmarkStyle === 'firstcap' || d.wordmarkStyle === 'twotone' ? d.wordmarkStyle : 'plain');
    let sz = fitSize(spec, baseSize, maxW);
    let lines = [{ spec, sz }];
    if (spec.width(sz) > maxW && parts.length >= 2) {
      const s1 = nameSpec(d, pal, [parts[0]], baseSize, 'plain'), s2 = nameSpec(d, pal, [parts.slice(1).join(' ')], baseSize, 'plain');
      const z = Math.min(fitSize(s1, baseSize, maxW), fitSize(s2, baseSize, maxW));
      lines = [{ spec: s1, sz: z }, { spec: s2, sz: z }];
    } else if (sz < baseSize * 0.62) warn.push('Long name — type was reduced to fit. Try the two-line wordmark or Horizontal layout.');
    const m = place(mk, 0, 0, markSize);
    const lineH = lines[0].sz * 1.04;
    let y = m.h + 34 + lines[0].sz * 0.72;
    let W0 = Math.max(m.w, ...lines.map(l => l.spec.width(l.sz)));
    let tagW = 0, tag = null;
    const tagSize = clamp(lines[0].sz * 0.24, 12, 17);
    if (d.descriptor) { tag = tagText(d, pal, d.descriptor, tagSize, pal.ink2, 'middle', 0, 0); tagW = tag.w + 2 * (14 + 54); W0 = Math.max(W0, tagW); }
    const cx = W0 / 2;
    let out = [];
    const mkP = place(mk, cx - m.w / 2, 0, markSize);
    out.push({ layer: 'ornament', svg: mkP.orn });
    out.push({ layer: 'symbol', svg: mkP.frame });
    let nameSvg = '';
    lines.forEach((l, i) => { nameSvg += l.spec.markup(l.sz, cx, y + i * lineH, 'middle').svg; });
    out.push({ layer: 'wordmark', svg: nameSvg });
    let yEnd = y + (lines.length - 1) * lineH;
    if (d.wordmarkStyle === 'underline' && lines.length === 1) {
      const nw = lines[0].spec.width(lines[0].sz);
      out.push({ layer: 'wordmark', svg: `<rect x="${n2(cx - nw / 2)}" y="${n2(yEnd + 14)}" width="${n2(nw * 0.34)}" height="5" rx="2.5" fill="${pal.ink2}"/>` });
      yEnd += 16;
    }
    if (tag) {
      const ty = yEnd + 12 + tagSize + (d.wordmarkStyle === 'underline' ? 6 : 0);
      const t2 = tagText(d, pal, d.descriptor, tagSize, pal.ink2, 'middle', cx, ty);
      out.push({ layer: 'tagline', svg: t2.svg + flankRules(cx, ty - tagSize * 0.35, t2.w, pal.ink2, d.ornament === 'dots' ? 'dots' : 'rules') });
      yEnd = ty;
    }
    return { parts: out, w: W0, h: yEnd + 6, defs: mk.defs };
  }

  function layoutHorizontal(d, pal, uid, warn) {
    const parts = splitBrand(d.brand);
    const markSize = 170 * (d.symbolSize / 100);
    const mk = buildMark(d, pal, uid);
    const m = place(mk, 0, 0, markSize);
    const gap = 44;
    const maxTextW = 560;
    const twoLine = parts.length >= 2 && (d.wordmarkStyle === 'ruled' || d.brand.length > 11);
    let lines, sz;
    if (twoLine) {
      const s1 = nameSpec(d, pal, [parts[0]], 56, d.wordmarkStyle === 'twotone' ? 'plain' : 'plain'), s2 = nameSpec(d, pal, [parts.slice(1).join(' ')], 56, 'plain');
      sz = Math.min(fitSize(s1, 56, maxTextW), fitSize(s2, 56, maxTextW));
      s2.segs.forEach(s => { s.fill = pal.ink2; });
      lines = [{ spec: s1, sz }, { spec: s2, sz }];
    } else {
      const sp = nameSpec(d, pal, parts, 58, d.wordmarkStyle === 'twotone' || d.wordmarkStyle === 'firstcap' ? d.wordmarkStyle : 'plain');
      sz = fitSize(sp, 58, maxTextW);
      lines = [{ spec: sp, sz }];
      if (sz < 40) warn.push('Long name — type was reduced to fit. Try a stacked layout or a shorter name.');
    }
    const tagSize = clamp(sz * 0.26, 12, 17);
    const lh = sz * 1.02;
    const blockH = lines.length * lh + (d.descriptor ? tagSize + 20 : 0);
    const textW = Math.max(...lines.map(l => l.spec.width(l.sz)), d.descriptor ? measure(d.descriptor.toUpperCase(), 'body', tagSize, 500, 4) : 0);
    const H0 = Math.max(m.h, blockH);
    const my = (H0 - m.h) / 2;
    const mkP = place(mk, 0, my, markSize);
    const x0 = m.w + gap;
    const top = (H0 - blockH) / 2;
    const out = [{ layer: 'ornament', svg: mkP.orn }, { layer: 'symbol', svg: mkP.frame }];
    out.push({ layer: 'symbol', svg: `<path d="M${n2(m.w + gap / 2)} ${n2(H0 * 0.14)} V${n2(H0 * 0.86)}" stroke="${pal.ink2}" stroke-width="1.4" stroke-opacity="0.55"/>` });
    let nameSvg = '';
    lines.forEach((l, i) => { nameSvg += l.spec.markup(l.sz, x0, top + l.sz * 0.74 + i * lh, 'start').svg; });
    out.push({ layer: 'wordmark', svg: nameSvg });
    if (d.descriptor) {
      const ty = top + lines.length * lh + tagSize + 8;
      const t = tagText(d, pal, d.descriptor, tagSize, pal.ink2, 'start', x0, ty);
      out.push({ layer: 'tagline', svg: t.svg });
    }
    return { parts: out, w: x0 + textW, h: H0, defs: mk.defs };
  }

  function layoutMonogram(d, pal, uid, warn) {
    const dd = Object.assign({}, d, { icon: 'monogram' });
    if (!dd.frame || dd.frame === 'none') dd.frame = 'circle';
    const mk = buildMark(dd, pal, uid);
    const markSize = 190 * (d.symbolSize / 100);
    const m = place(mk, 0, 0, markSize);
    const parts = splitBrand(d.brand);
    const sp = nameSpec(d, pal, [parts.join(parts.sep == null ? ' ' : parts.sep)], 44, 'plain');
    const sz = fitSize(sp, 44, 620, 20);
    const tagSize = clamp(sz * 0.3, 12, 16);
    let W0 = Math.max(m.w, sp.width(sz));
    const cx = W0 / 2;
    const mkP = place(mk, cx - m.w / 2, 0, markSize);
    const out = [{ layer: 'ornament', svg: mkP.orn }, { layer: 'symbol', svg: mkP.frame }];
    const ny = m.h + 30 + sz * 0.72;
    out.push({ layer: 'wordmark', svg: sp.markup(sz, cx, ny, 'middle').svg });
    let yEnd = ny;
    if (d.descriptor) {
      const ty = ny + 14 + tagSize;
      const t = tagText(d, pal, d.descriptor, tagSize, pal.ink2, 'middle', cx, ty);
      W0 = Math.max(W0, t.w + 136);
      out.push({ layer: 'tagline', svg: t.svg + flankRules(cx, ty - tagSize * 0.35, t.w, pal.ink2, 'rules') });
      yEnd = ty;
    }
    return { parts: out, w: W0, h: yEnd + 6, defs: mk.defs };
  }

  function layoutWordmark(d, pal, uid, warn) {
    const parts = splitBrand(d.brand);
    const style = d.wordmarkStyle || 'plain';
    const maxW = 700;
    const micro = d.icon && d.icon !== 'monogram' && (d.microIcon !== false);
    const out = [];
    let yCursor = 0, W0 = 0;
    let mk = null, mkSize = 0;
    if (micro) {
      mk = buildMark(Object.assign({}, d, { frame: 'none', ornament: 'none', backdrop: 'none', badgeIcon: '' }), pal, uid);
      mkSize = 140 * (d.symbolSize / 100);
    }
    let lines;
    if (style === 'ruled' && parts.length >= 2 && false) lines = null;
    const sp = nameSpec(d, pal, parts, 84, style === 'twotone' || style === 'firstcap' ? style : 'plain');
    let sz = fitSize(sp, 84, maxW, 26);
    if (sz < 52) warn.push('Long name — type was reduced to fit.');
    const nameW = sp.width(sz);
    W0 = Math.max(nameW, 360);
    const cx = W0 / 2;
    if (mk) {
      const m = place(mk, cx - (mkSize * (mk.x1 - mk.x0) / 200) / 2, 0, mkSize);
      out.push({ layer: 'symbol', svg: m.frame });
      yCursor = m.h + 20;
    }
    if (style === 'ruled') {
      out.push({ layer: 'ornament', svg: `<path d="M${n2(cx - nameW / 2 - 10)} ${n2(yCursor)} H${n2(cx + nameW / 2 + 10)}" stroke="${pal.ink}" stroke-width="2.4"/><path d="M${n2(cx - nameW / 2 - 10)} ${n2(yCursor + 6)} H${n2(cx + nameW / 2 + 10)}" stroke="${pal.ink2}" stroke-width="1"/>` });
      yCursor += 22;
    }
    const baseline = yCursor + sz * 0.74;
    out.push({ layer: 'wordmark', svg: sp.markup(sz, cx, baseline, 'middle').svg });
    yCursor = baseline + sz * 0.18;
    if (style === 'ruled') {
      out.push({ layer: 'ornament', svg: `<path d="M${n2(cx - nameW / 2 - 10)} ${n2(yCursor + 6)} H${n2(cx + nameW / 2 + 10)}" stroke="${pal.ink2}" stroke-width="1"/><path d="M${n2(cx - nameW / 2 - 10)} ${n2(yCursor + 12)} H${n2(cx + nameW / 2 + 10)}" stroke="${pal.ink}" stroke-width="2.4"/>` });
      yCursor += 14;
    }
    if (style === 'underline') {
      out.push({ layer: 'ornament', svg: `<rect x="${n2(cx - nameW / 2)}" y="${n2(yCursor + 8)}" width="${n2(nameW)}" height="3" fill="${pal.ink}"/><rect x="${n2(cx - nameW / 2)}" y="${n2(yCursor + 8)}" width="${n2(nameW * 0.28)}" height="3" fill="${pal.ink2}"/>` });
      yCursor += 12;
    }
    if (d.descriptor) {
      const tagSize = clamp(sz * 0.2, 12, 18);
      const ty = yCursor + 20 + tagSize * 0.7;
      const t = tagText(d, pal, d.descriptor, tagSize, pal.ink2, 'middle', cx, ty, clamp(Math.round(tagSize * 0.42), 3, 9));
      W0 = Math.max(W0, t.w + 136);
      out.push({ layer: 'tagline', svg: t.svg + (style === 'ruled' || style === 'underline' ? '' : flankRules(cx, ty - tagSize * 0.35, t.w, pal.ink2, 'rules')) });
      yCursor = ty;
    }
    return { parts: out, w: W0, h: yCursor + 6, defs: mk ? mk.defs : '' };
  }

  // Circular badge: name arcs over the top, descriptor under, emblem in the middle
  function layoutBadge(d, pal, uid, warn) {
    const parts = splitBrand(d.brand);
    const name = applyCase(parts.join(parts.sep == null ? ' ' : parts.sep), d.caseStyle || 'upper');
    const R = 170, band0 = 112;            // outer ring / inner disc radius
    const bandW = R - band0;
    const cxy = R + 10;
    const fk = FONTS[d.fontKey] ? d.fontKey : 'serif';
    const weight = +(d.fontWeight || 600);
    const track = d.tracking == null ? 4 : d.tracking;
    const bandMid = (band0 + R) / 2;
    // fit the name along the top arc (up to ~170°)
    let sz = 40;
    const arcLenFor = r => r * Math.PI * 0.62;
    let rTop;
    const capH = s => s * 0.72;
    while (sz > 16) {
      rTop = band0 + (bandW - capH(sz)) / 2;
      if (measure(name, fk, sz, weight, track) <= arcLenFor(rTop + capH(sz) / 2)) break;
      sz -= 1;
    }
    if (name.length > 24) warn.push('Very long name for a circular badge — consider the ribbon or stacked layout.');
    rTop = band0 + (bandW - capH(sz)) / 2;
    const tw = measure(name, fk, sz, weight, track);
    const font = d.fontCss || FONTS[fk].css;
    const pid = uid + 'top', pid2 = uid + 'bot';
    const wantBottom = !!d.descriptor;
    const tagSize = 14;
    const tagT = wantBottom ? applyCase(d.descriptor, 'upper') : '';
    const rBot = R - (bandW - capH(tagSize)) / 2;
    const cx = cxy, cy = cxy;
    const solid = (d.fill || 'solid') === 'solid';
    const ringFill = solid ? pal.ink : 'none';
    const textFill = solid ? pal.onFrame(pal.ink) : pal.ink;
    const tagFill = solid ? (contrast(pal.ink2, pal.ink) >= 2 ? pal.ink2 : pal.A) : pal.ink2;
    let svg = '';
    svg += solid
      ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${ringFill}"/><circle cx="${cx}" cy="${cy}" r="${R - 7}" fill="none" stroke="${tagFill}" stroke-width="1.4" stroke-opacity="0.8"/><circle cx="${cx}" cy="${cy}" r="${band0}" fill="${pal.bg === '#ffffff' || lum(pal.bg) > 0.4 ? '#ffffff' : pal.bg}" stroke="${tagFill}" stroke-width="1.4"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${pal.ink}" stroke-width="5.5"/><circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="none" stroke="${pal.ink2}" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${band0}" fill="none" stroke="${pal.ink}" stroke-width="2.4"/><circle cx="${cx}" cy="${cy}" r="${band0 - 7}" fill="none" stroke="${pal.ink2}" stroke-width="1"/>`;
    // inner emblem (never framed twice)
    const innerD = Object.assign({}, d, { frame: 'none', ornament: 'none', fill: 'outline', backdrop: 'none', badgeIcon: '' });
    const mk = buildMark(innerD, Object.assign({}, pal), uid + 'i');
    const iconSize = band0 * 1.42;
    const s = iconSize / 200;
    const bx = (mk.x0 + mk.x1) / 2, by = (mk.y0 + mk.y1) / 2;
    const emblem = `<g transform="translate(${n2(cx - bx * s)} ${n2(cy - by * s)}) scale(${n2(s)})">${mk.markup}</g>`;
    // arcs
    svg += `<defs><path id="${pid}" d="M${n2(cx - rTop)} ${cy} A${n2(rTop)} ${n2(rTop)} 0 0 1 ${n2(cx + rTop)} ${cy}"/>`;
    if (wantBottom) svg += `<path id="${pid2}" d="M${n2(cx - rBot)} ${cy} A${n2(rBot)} ${n2(rBot)} 0 0 0 ${n2(cx + rBot)} ${cy}"/>`;
    svg += `</defs>`;
    const parts2 = [];
    const nameTxt = `<text font-family="${font}" font-size="${n2(sz)}" font-weight="${weight}" letter-spacing="${track}" fill="${textFill}" text-anchor="middle"><textPath href="#${pid}" startOffset="50%">${esc(name)}</textPath></text>`;
    let tagTxt = '';
    if (wantBottom) tagTxt = `<text font-family="${BODY_FONT}" font-size="${tagSize}" font-weight="600" letter-spacing="4" fill="${tagFill}" text-anchor="middle"><textPath href="#${pid2}" startOffset="50%">${esc(tagT)}</textPath></text>`;
    // separator stars at 9 and 3 o'clock
    const starR = 7;
    const stars = [[cx - bandMid, cy], [cx + bandMid, cy]].map(([x, y]) => `<polygon points="${Icons.starPts(x, y, starR, starR * 0.42).map(p => n2(p[0]) + ',' + n2(p[1])).join(' ')}" fill="${tagFill}"/>`).join('');
    parts2.push({ layer: 'symbol', svg: svg + emblem });
    parts2.push({ layer: 'wordmark', svg: nameTxt });
    parts2.push({ layer: 'tagline', svg: tagTxt });
    parts2.push({ layer: 'ornament', svg: stars });
    return { parts: parts2, w: 2 * cxy, h: 2 * cxy, defs: mk.defs };
  }

  // Emblem on top, ribbon banner carrying the name
  function layoutBanner(d, pal, uid, warn) {
    const dd = Object.assign({}, d);
    if (!dd.frame || dd.frame === 'none') dd.frame = 'shield';
    const mk = buildMark(dd, pal, uid);
    const markSize = 180 * (d.symbolSize / 100);
    const m = place(mk, 0, 0, markSize);
    const parts = splitBrand(d.brand);
    const sp = nameSpec(d, pal, [parts.join(parts.sep == null ? ' ' : parts.sep)], 42, 'plain');
    const sz = fitSize(sp, 42, 520, 20);
    const nameW = sp.width(sz);
    const padX = 36, hh = sz * 1.55;
    const bw = nameW + padX * 2;
    const W0 = Math.max(bw + 80, m.w + 40);
    const cx = W0 / 2;
    const out = [];
    const mkP = place(mk, cx - m.w / 2, 0, markSize);
    out.push({ layer: 'ornament', svg: mkP.orn });
    out.push({ layer: 'symbol', svg: mkP.frame });
    const by = m.h - 12;
    const solid = (d.fill || 'solid') !== 'outline';
    const rib = pal.ink, dark = mix(pal.ink, '#000000', 0.35);
    const x0 = cx - bw / 2, x1 = cx + bw / 2;
    let rb = '';
    rb += `<polygon points="${pts4([[x0 - 36, by + 10], [x0 + 8, by + 10], [x0 + 8, by + hh + 10], [x0 - 36, by + hh + 10], [x0 - 22, by + hh / 2 + 10]])}" fill="${dark}"/>`;
    rb += `<polygon points="${pts4([[x1 + 36, by + 10], [x1 - 8, by + 10], [x1 - 8, by + hh + 10], [x1 + 36, by + hh + 10], [x1 + 22, by + hh / 2 + 10]])}" fill="${dark}"/>`;
    rb += `<polygon points="${pts4([[x0, by], [x1, by], [x1, by + hh], [x0, by + hh]])}" fill="${rib}"/>`;
    rb += `<polygon points="${pts4([[x0 + 8, by + hh], [x0, by + hh], [x0 + 8, by + hh + 10]])}" fill="${mix(pal.ink, '#000000', 0.6)}"/>`;
    rb += `<polygon points="${pts4([[x1 - 8, by + hh], [x1, by + hh], [x1 - 8, by + hh + 10]])}" fill="${mix(pal.ink, '#000000', 0.6)}"/>`;
    rb += `<path d="M${n2(x0 + 6)} ${n2(by + 5)} H${n2(x1 - 6)} M${n2(x0 + 6)} ${n2(by + hh - 5)} H${n2(x1 - 6)}" stroke="${pal.ink2}" stroke-width="1.2" stroke-opacity="0.8"/>`;
    out.push({ layer: 'ornament', svg: rb });
    const nameInk = pal.onFrame(rib);
    const sp2 = nameSpec(d, Object.assign({}, pal, { ink: nameInk, ink2: nameInk }), [parts.join(parts.sep == null ? ' ' : parts.sep)], sz, 'plain');
    out.push({ layer: 'wordmark', svg: sp2.markup(sz, cx, by + hh / 2 + sz * 0.34, 'middle').svg });
    let yEnd = by + hh + 12;
    let W1 = W0;
    if (d.descriptor) {
      const tagSize = 14;
      const ty = yEnd + 14 + tagSize;
      const t = tagText(d, pal, d.descriptor, tagSize, pal.ink2, 'middle', cx, ty);
      W1 = Math.max(W1, t.w + 136);
      out.push({ layer: 'tagline', svg: t.svg + flankRules(cx, ty - tagSize * 0.35, t.w, pal.ink2, 'rules') });
      yEnd = ty;
    }
    return { parts: out, w: W1, h: yEnd + 6, defs: mk.defs, shiftX: (W1 - W0) / 2 };
  }
  const pts4 = a => a.map(p => n2(p[0]) + ',' + n2(p[1])).join(' ');

  const LAYOUT_FN = { stacked: layoutStacked, horizontal: layoutHorizontal, monogram: layoutMonogram, wordmark: layoutWordmark, badge: layoutBadge, banner: layoutBanner };

  // ───────────── render ─────────────
  function render(design, brief, opts) {
    opts = opts || {};
    const d = Object.assign({
      layout: 'stacked', icon: 'monogram', frame: 'circle', fill: 'solid', ornament: 'none', wordmarkStyle: 'plain',
      fontKey: 'serif', fontWeight: 600, tracking: 4, caseStyle: 'upper', roles: 'std', gradientMode: 'none',
      symbolSize: 100, scale: 100, offsetX: 0, offsetY: 0, align: 'center', finish: 'flat', backdrop: 'none', badgeIcon: ''
    }, design || {});
    d.brand = (brief && brief.brand != null ? brief.brand : d.brand) || '';
    d.descriptor = (brief && brief.descriptor != null ? brief.descriptor : d.descriptor) || '';
    if (!d.brand.trim()) d.brand = 'YOUR BRAND';
    // legacy ids
    if (d.layout === 'seal') d.layout = 'badge';
    if (d.layout === 'seal' || !LAYOUT_FN[d.layout]) d.layout = 'stacked';
    if (Icons.ALIASES[d.icon]) d.icon = Icons.ALIASES[d.icon];
    if (d.icon === 'none') d.icon = null;
    if (d.icon && !Icons.ICONS[d.icon]) d.icon = 'monogram';
    if (d.tracking === 0 && !design.trackingExplicit) { /* 0 is a valid user value */ }
    const pal = resolvePalette(d, opts.bg || null);
    const uid = (opts.idPrefix || 'mk') + '-';
    const warnings = [];
    let layout = d.layout;
    if (layout === 'badge' && d.brand.length > 26) { layout = 'banner'; warnings.push('Name too long for a circular badge — switched to the ribbon layout.'); }
    if (!d.icon && ['badge', 'banner', 'monogram'].indexOf(layout) < 0 && layout !== 'wordmark') layout = 'wordmark';
    const L = LAYOUT_FN[layout](Object.assign({}, d, { icon: d.icon || 'monogram' }), pal, uid, warnings);

    // scale-to-fit, centre in artboard
    const maxW = 740, maxH = 440;
    let k = Math.min(maxW / L.w, maxH / L.h, 1.6) * (d.scale / 100);
    k = Math.min(k, Math.min(840 / L.w, 560 / L.h));       // never leave the artboard
    const lw = L.w * k, lh = L.h * k;
    let tx = (W - lw) / 2;
    if (d.align === 'left') tx = 70;
    else if (d.align === 'right') tx = W - 70 - lw;
    tx += d.offsetX || 0;
    const ty = (H - lh) / 2 + (d.offsetY || 0);
    const sx = L.shiftX || 0;
    if (k < 0.62) warnings.push('Lockup was scaled down a lot to fit — consider a shorter name or another layout.');

    // group by layer
    const layers = {};
    L.parts.forEach(p => { (layers[p.layer] = layers[p.layer] || []).push(p.svg); });
    const order = ['ornament', 'symbol', 'wordmark', 'tagline'];
    let defsAll = L.defs || '';
    const fx3d = d.finish === '3d';
    if (fx3d) defsAll += extrudeFilter(uid + 'tx', mix(pal.ink, '#000000', 0.55), 4, 0.35, 0.9, { blur: 1.2, dx: 0.8, dy: 3, op: 0.22 });
    const body = order.filter(o => layers[o]).map(o => `<g data-layer="${o}"${fx3d && o === 'wordmark' ? ` filter="url(#${uid}tx)"` : ''}>${layers[o].join('')}</g>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(d.brand)} logo">` +
      `<title>${esc(d.brand)} logo</title>` +
      (defsAll ? `<defs>${defsAll}</defs>` : '') +
      `<g id="${uid}lockup" transform="translate(${n2(tx + sx * k)} ${n2(ty)}) scale(${n2(k)})">${body}</g></svg>`;
    return { svg, bbox: { x: tx, y: ty, w: lw, h: lh }, warnings };
  }

  // ───────────── generation ─────────────
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function weightedPick(rng, items, weightFn) {
    const ws = items.map(weightFn);
    const total = ws.reduce((a, b) => a + b, 0);
    if (total <= 0) return pick(rng, items);
    let r = rng() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  /**
   * generate(brief, { count, seed, history, bias, noGradient })
   * brief: { brand, descriptor, industry, personality, notes, palette:[p,s,a] }
   */
  function generate(brief, opts) {
    opts = opts || {};
    const count = opts.count || 4;
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296);
    const rng = rngFrom(seed);
    const persona = PERSONA[brief.personality] || PERSONA['Premium & minimal'];
    const pairs = PAIRINGS[brief.personality] || PAIRINGS['Premium & minimal'];
    const colors = brief.palette && brief.palette.length ? brief.palette : ['#1a365d', '#c9a227', '#e8d48b'];
    const notes = String(brief.notes || '').toLowerCase();
    const noteIcons = Object.keys(Icons.ICONS).filter(k => k !== 'monogram' && notes.includes(k));
    Object.keys(Icons.ALIASES).forEach(a => { if (notes.includes(a) && Icons.ICONS[Icons.ALIASES[a]]) noteIcons.push(Icons.ALIASES[a]); });
    const biasIcons = (opts.bias || []).map(b => Icons.ALIASES[b] || b).filter(b => Icons.ICONS[b]);
    const industryIcons = (Icons.INDUSTRY_ICONS[brief.industry] || Icons.INDUSTRY_ICONS['Business / Company']).slice();
    const iconPool = [...new Set([...noteIcons, ...biasIcons, ...industryIcons])];
    // a few wild cards from the whole library keep batches fresh
    const all = Object.keys(Icons.ICONS);
    const history = opts.history || {};
    const usedKeys = new Set(history.keys || []);
    const usedLayout = {}, usedIcon = {}, usedFrame = {};
    (history.layouts || []).forEach(l => { usedLayout[l] = (usedLayout[l] || 0) + 1; });
    (history.icons || []).forEach(l => { usedIcon[l] = (usedIcon[l] || 0) + 1; });
    const nameLen = (brief.brand || '').length;

    const out = [];
    let guard = 0;
    while (out.length < count && guard++ < 200) {
      const batchLayouts = out.map(c => c.layout);
      const layout = weightedPick(rng, persona.layouts, l => {
        let w = 3;
        if (batchLayouts.includes(l)) w *= 0.05;
        w /= 1 + (usedLayout[l] || 0) * 0.35;
        if (l === 'badge' && nameLen > 22) w *= 0.1;
        if (l === 'horizontal' && nameLen > 18) w *= 0.4;
        if (l === 'wordmark') w *= 0.45;
        return w;
      });
      const batchIcons = out.map(c => c.icon);
      const icon = weightedPick(rng, iconPool.concat(rng() < 0.35 ? [pick(rng, all)] : []), ic => {
        let w = 1 + (iconPool.indexOf(ic) < 0 ? 0 : Math.max(0, 6 - iconPool.indexOf(ic)) * 0.5);
        if (noteIcons.includes(ic) || biasIcons.includes(ic)) w += 3;
        if (batchIcons.includes(ic)) w *= 0.05;
        w /= 1 + (usedIcon[ic] || 0) * 0.5;
        return w;
      });
      const batchFrames = out.map(c => c.frame);
      let frame = weightedPick(rng, persona.frames, f => (batchFrames.includes(f) ? 0.2 : 2));
      if (layout === 'monogram' && frame === 'none') frame = pick(rng, persona.frames.filter(f => f !== 'none').concat(['circle']));
      if (layout === 'banner' && frame === 'none') frame = 'shield';
      const fill = pick(rng, persona.fills);
      const pairing = pick(rng, pairs);
      const wm = pick(rng, persona.wm);
      const orn = layout === 'wordmark' ? 'none' : pick(rng, persona.orn);
      const useGrad = !opts.noGradient && !/no gradient|flat/.test(notes) && rng() < 0.2 && fill !== 'outline' && colors[0] !== colors[2];
      const useIcon = layout === 'monogram' ? 'monogram' : icon;
      const fx = PERSONA_FX[brief.personality] || PERSONA_FX['Premium & minimal'];
      const finish = opts.finish || pick(rng, fx.finish);
      let backdrop = (layout === 'badge' || layout === 'wordmark') ? 'none' : pick(rng, fx.backdrop);
      if (backdrop === 'rings' && orn !== 'none') backdrop = 'none';
      let badgeIcon = '';
      if (useIcon !== 'monogram' && layout !== 'wordmark' && layout !== 'badge' && rng() < 0.3) {
        const cand = iconPool.filter(x => x !== useIcon && x !== 'monogram');
        if (cand.length) badgeIcon = pick(rng, cand);
      }
      const rec = {
        v: 3, seed: Math.floor(rng() * 4294967296),
        layout, icon: useIcon, frame, fill, ornament: orn, wordmarkStyle: wm,
        fontKey: pairing[0], fontWeight: pairing[1], tracking: pairing[2], caseStyle: pairing[3],
        roles: rng() < 0.18 ? 'swap' : 'std',
        gradientMode: useGrad ? (rng() < 0.7 ? 'linear' : 'radial') : 'none',
        symbolSize: 100, scale: 100, finish, backdrop, badgeIcon
      };
      const key = keyOf(rec);
      if (usedKeys.has(key) || out.some(c => c._key === key)) continue;
      rec._key = key;
      rec.label = labelFor(rec);
      out.push(rec);
    }
    out.forEach(c => { delete c._key; });
    return out;
  }

  function labelFor(r) {
    const lay = { stacked: 'Stacked lockup', horizontal: 'Horizontal lockup', badge: 'Circular badge', banner: 'Ribbon emblem', monogram: 'Monogram', wordmark: 'Wordmark' }[r.layout] || r.layout;
    const ic = r.icon && Icons.ICONS[r.icon] && r.layout !== 'monogram' && r.layout !== 'wordmark' ? ' · ' + Icons.ICONS[r.icon].label : '';
    const fx = { '3d': ' · 3D', gradient: ' · Gloss', emboss: ' · Embossed' }[r.finish] || '';
    return lay + ic + fx;
  }

  function keyOf(r) { return [r.layout, r.icon, r.frame, r.fill, r.ornament, r.fontKey, r.wordmarkStyle, r.finish, r.backdrop, r.badgeIcon].join('|'); }

  /** "More like this": keep the layout/icon family, vary frame, fill, ornament and type */
  function variations(base, brief, opts) {
    opts = opts || {};
    const rng = rngFrom(opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296));
    const persona = PERSONA[brief.personality] || PERSONA['Premium & minimal'];
    const pairs = PAIRINGS[brief.personality] || PAIRINGS['Premium & minimal'];
    const out = [];
    let guard = 0;
    const seen = new Set([keyOf(base)]);
    while (out.length < (opts.count || 4) && guard++ < 100) {
      const r = Object.assign({}, base);
      const roll = rng();
      if (roll < 0.5) r.frame = pick(rng, Object.keys(Icons.FRAMES).filter(f => r.layout === 'monogram' ? f !== 'none' : true));
      r.fill = pick(rng, ['solid', 'duotone', 'outline']);
      r.ornament = r.layout === 'wordmark' ? 'none' : pick(rng, ['none', 'laurel', 'ticks', 'dots', 'stars']);
      const p = pick(rng, pairs); r.fontKey = p[0]; r.fontWeight = p[1]; r.tracking = p[2]; r.caseStyle = p[3];
      r.wordmarkStyle = pick(rng, persona.wm);
      r.roles = rng() < 0.2 ? 'swap' : 'std';
      const fx = PERSONA_FX[brief.personality] || PERSONA_FX['Premium & minimal'];
      r.finish = pick(rng, ['flat', 'gradient', '3d', 'emboss']);
      r.backdrop = (r.layout === 'badge' || r.layout === 'wordmark') ? 'none' : pick(rng, ['none'].concat(fx.backdrop));
      if (r.layout === 'badge' && r.frame === 'none') r.frame = 'circle';
      const k = keyOf(r);
      if (seen.has(k)) continue;
      seen.add(k);
      r.label = labelFor(r);
      out.push(r);
    }
    return out;
  }

  return {
    render, generate, variations, setMeasurer, measure, labelFor, keyOf,
    splitBrand, initials, contrast, mix, lum, hexToRgb, rgbToHex,
    FONTS, LAYOUTS, FILLS, FINISHES, BACKDROPS, WORDMARK_STYLES, PERSONA, PAIRINGS, W, H
  };
});
