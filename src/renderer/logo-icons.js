'use strict';
/**
 * Markcraft Studio — symbol library
 *
 * Every icon is drawn on a 100×100 grid as a layered, multi-part composition
 * (main shape + secondary shape + negative-space cut-outs), not a single glyph.
 * Frames and ornaments are drawn on a 200×200 grid.
 *
 * Colour tokens passed to every icon:
 *   a = main fill     b = secondary / accent fill     c = cut-out colour
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarkcraftIcons = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const n2 = v => Math.round(v * 100) / 100;
  const pts = arr => arr.map(p => n2(p[0]) + ',' + n2(p[1])).join(' ');
  const poly = (arr, fill, x = '') => `<polygon points="${pts(arr)}" fill="${fill}" ${x}/>`;
  const path = (d, fill, x = '') => `<path d="${d}" fill="${fill}" ${x}/>`;
  const line = (d, stroke, w, x = '') =>
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
  const rect = (x, y, w, h, fill, rx = 0, ex = '') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${ex}/>`;
  const circ = (cx, cy, r, fill, ex = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${ex}/>`;
  const ring = (cx, cy, r, stroke, w, ex = '') =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${w}" ${ex}/>`;
  const ell = (cx, cy, rx, ry, fill, ex = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${ex}/>`;
  const rot = (deg, cx, cy, inner) => `<g transform="rotate(${deg} ${cx} ${cy})">${inner}</g>`;

  function starPts(cx, cy, R, r, n = 5, start = -90) {
    const out = [];
    for (let i = 0; i < n * 2; i++) {
      const ang = (start + i * 180 / n) * Math.PI / 180;
      const rad = i % 2 === 0 ? R : r;
      out.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
    }
    return out;
  }
  function ngon(cx, cy, R, n, start = -90) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const ang = (start + i * 360 / n) * Math.PI / 180;
      out.push([cx + R * Math.cos(ang), cy + R * Math.sin(ang)]);
    }
    return out;
  }

  // ───────────────────────── ICONS ─────────────────────────
  const ICONS = {};
  const def = (id, label, draw) => { ICONS[id] = { id, label, draw }; };

  def('house', 'House', ({ a, b, c }) =>
    rect(66, 22, 9, 18, b) +
    path('M50 12 L92 48 H80 V86 H20 V48 H8 Z', a) +
    line('M14 49 L50 17 L86 49', b, 3.2) +
    rect(41, 58, 18, 28, c, 2) + circ(50, 42, 6, c) +
    rect(26, 58, 10, 10, c, 1.5) + rect(64, 58, 10, 10, c, 1.5));

  def('roof', 'Rooftops', ({ a, b, c }) =>
    path('M6 52 L40 18 L74 52 H62 L40 31 L18 52 Z', a) +
    path('M30 64 L60 34 L94 68 H82 L60 47 L42 64 Z', b) +
    rect(22, 62, 28, 24, a, 1.5) + rect(30, 70, 12, 16, c, 1.5) +
    rect(58, 70, 24, 16, b, 1.5, 'opacity="0.55"'));

  def('building', 'Tower', ({ a, b, c }) => {
    let w = '';
    for (let r = 0; r < 6; r++) for (let k = 0; k < 2; k++) w += rect(36 + k * 14, 24 + r * 10.5, 8, 6, c, 1);
    return rect(62, 42, 22, 46, b) + rect(28, 12, 38, 76, a) + poly([[28, 12], [47, 4], [66, 12]], a) +
      line('M47 4 V-4', b, 2.2) + w +
      rect(66, 50, 6, 5, c, 1) + rect(66, 62, 6, 5, c, 1) + rect(66, 74, 6, 5, c, 1) +
      rect(10, 86, 80, 4, a, 2);
  });

  def('skyline', 'Skyline', ({ a, b, c }) => {
    let s = '';
    const bars = [[8, 56, 14, 32, b], [24, 34, 16, 54, a], [42, 16, 18, 72, a], [62, 40, 14, 48, b], [78, 52, 14, 36, a]];
    bars.forEach(([x, y, w, h, f]) => { s += rect(x, y, w, h, f, 1.2); });
    s += poly([[42, 16], [51, 6], [60, 16]], a) + line('M51 6 V0', b, 2);
    [[28, 42], [28, 56], [28, 70], [47, 26], [47, 42], [47, 58], [47, 74], [66, 48], [66, 62], [66, 76], [82, 60], [82, 74], [12, 64], [12, 76]]
      .forEach(([x, y]) => { s += rect(x, y, 5, 6, c, 1); });
    return s + rect(4, 88, 92, 4, a, 2);
  });

  def('key', 'Key', ({ a, b, c }) => rot(-42, 50, 50,
    ring(26, 50, 17, a, 10) + circ(26, 50, 7, b) +
    rect(40, 45.5, 50, 9, a, 2) + rect(70, 54, 7, 14, a, 1.5) + rect(81, 54, 7, 10, a, 1.5) +
    rect(46, 48.5, 18, 3, c)));

  def('columns', 'Columns', ({ a, b, c }) => {
    let s = poly([[8, 34], [50, 10], [92, 34]], a) + rect(10, 37, 80, 7, b) + circ(50, 24, 5, c);
    [16, 34, 54, 72].forEach(x => { s += rect(x, 48, 12, 32, a) + rect(x + 3, 50, 1.6, 28, c) + rect(x + 7.4, 50, 1.6, 28, c); });
    return s + rect(8, 82, 84, 6, b) + rect(4, 88, 92, 5, a);
  });

  def('nodes', 'Network', ({ a, b }) => {
    const o = [[16, 30], [84, 26], [86, 74], [38, 88], [12, 66]];
    let s = '';
    o.forEach(p => { s += line(`M50 50 L${p[0]} ${p[1]}`, a, 3.2); });
    s += line('M16 30 L84 26', a, 2, 'opacity="0.45"') + line('M86 74 L38 88', a, 2, 'opacity="0.45"') + line('M12 66 L16 30', a, 2, 'opacity="0.45"');
    o.forEach((p, i) => { s += circ(p[0], p[1], i % 2 ? 8 : 6.5, i % 2 ? b : a); });
    return s + circ(50, 50, 15, a) + circ(50, 50, 6.5, b);
  });

  def('circuit', 'Circuit', ({ a, b, c }) => {
    let s = '';
    [34, 50, 66].forEach(v => {
      s += line(`M${v} 12 V30`, b, 3.4) + line(`M${v} 70 V88`, b, 3.4) + line(`M12 ${v} H30`, b, 3.4) + line(`M70 ${v} H88`, b, 3.4);
      s += circ(v, 10, 3.6, b) + circ(v, 90, 3.6, b) + circ(10, v, 3.6, b) + circ(90, v, 3.6, b);
    });
    return s + rect(26, 26, 48, 48, a, 8) + rect(37, 37, 26, 26, c, 4) + rect(44, 44, 12, 12, b, 2) +
      line('M37 50 H26', c, 0.01);
  });

  def('cube', 'Cube', ({ a, b, c }) =>
    poly([[50, 8], [88, 29], [50, 50], [12, 29]], b) +
    poly([[12, 33], [48, 54], [48, 94], [12, 73]], a) +
    poly([[88, 33], [52, 54], [52, 94], [88, 73]], a, 'opacity="0.72"') +
    poly([[50, 18], [72, 30], [50, 42], [28, 30]], c, 'opacity="0.35"'));

  def('growth', 'Growth', ({ a, b, c }) =>
    rect(10, 62, 15, 26, a, 2) + rect(30, 48, 15, 40, a, 2) + rect(50, 34, 15, 54, a, 2) + rect(70, 18, 15, 70, b, 2) +
    line('M10 46 L34 30 L52 38 L86 8', c, 9) + line('M10 46 L34 30 L52 38 L86 8', b, 4.5) +
    poly([[88, 4], [96, 22], [76, 16]], b));

  def('coin', 'Coin', ({ a, b, c }) =>
    circ(50, 50, 40, a) + ring(50, 50, 33, c, 2.6) +
    poly(starPts(50, 50, 20, 8.5), b) + circ(50, 50, 5, c) +
    path('M14 50 A36 36 0 0 1 50 14', 'none', `stroke="${c}" stroke-width="0"`));

  def('pulse', 'Pulse', ({ a, b, c }) =>
    path('M36 8 H64 V36 H92 V64 H64 V92 H36 V64 H8 V36 H36 Z', a, 'stroke-linejoin="round"') +
    line('M8 50 H32 L40 32 L50 70 L58 44 L64 50 H92', c, 6) + line('M8 50 H32 L40 32 L50 70 L58 44 L64 50 H92', b, 2.6));

  def('droplet', 'Droplet', ({ a, b, c }) =>
    path('M50 8 C50 8 18 42 18 62 A32 32 0 0 0 82 62 C82 42 50 8 50 8Z', a) +
    path('M50 8 C50 8 82 42 82 62 A32 32 0 0 1 50 94 C66 78 66 46 50 8Z', b) +
    path('M32 62 C32 74 40 82 50 84', 'none', `stroke="${c}" stroke-width="4" stroke-linecap="round"`));

  def('flame', 'Flame', ({ a, b, c }) =>
    path('M52 6 C60 26 82 36 82 62 A32 32 0 0 1 18 62 C18 48 28 40 34 30 C36 42 42 46 46 44 C40 30 44 16 52 6Z', a) +
    path('M50 44 C57 56 68 62 68 74 A18 18 0 0 1 32 74 C32 64 42 58 50 44Z', b) +
    path('M50 66 C54 72 58 74 58 80 A8 8 0 0 1 42 80 C42 74 47 72 50 66Z', c));

  def('cup', 'Coffee cup', ({ a, b, c }) =>
    line('M32 8 C26 16 38 20 32 28', b, 4) + line('M48 6 C42 14 54 18 48 26', b, 4) + line('M64 8 C58 16 70 20 64 28', b, 4) +
    path('M14 36 H72 V58 A24 24 0 0 1 48 82 H38 A24 24 0 0 1 14 58 Z', a) +
    line('M72 42 H78 A10 10 0 0 1 78 64 H70', a, 7) +
    rect(8, 86, 74, 6, b, 3) + path('M26 48 H60', 'none', `stroke="${c}" stroke-width="3" stroke-linecap="round"`));

  def('leaf', 'Leaf', ({ a, b, c }) =>
    path('M16 84 C14 42 42 12 88 12 C90 56 62 88 16 84Z', a) +
    path('M16 84 C14 42 42 12 88 12 L16 84Z', c, 'opacity="0.22"') +
    line('M20 80 C42 58 62 38 80 20', c, 3.4) + line('M44 58 L46 40', c, 2.4) + line('M58 46 L74 48', c, 2.4) +
    line('M16 84 L8 94', b, 5));

  def('bolt', 'Bolt', ({ a, b }) =>
    poly([[58, 4], [20, 54], [44, 54], [36, 96], [80, 40], [54, 40]], a) +
    poly([[58, 4], [20, 54], [44, 54], [52, 34]], b));

  def('chevron', 'Chevrons', ({ a, b }) =>
    poly([[12, 58], [50, 24], [88, 58], [88, 72], [50, 38], [12, 72]], a) +
    poly([[12, 78], [50, 44], [88, 78], [88, 92], [50, 58], [12, 92]], b) +
    poly([[12, 38], [50, 4], [88, 38], [88, 52], [50, 18], [12, 52]], a, 'opacity="0.5"'));

  def('target', 'Target', ({ a, b, c }) =>
    circ(48, 52, 40, a) + circ(48, 52, 30, c) + circ(48, 52, 21, a) + circ(48, 52, 11, c) + circ(48, 52, 5, b) +
    line('M52 48 L90 10', b, 5) + poly([[84, 4], [96, 16], [86, 20], [80, 14]], b));

  def('book', 'Open book', ({ a, b, c }) =>
    path('M48 26 C38 16 20 14 6 18 V76 C20 72 38 74 48 84Z', a) +
    path('M52 26 C62 16 80 14 94 18 V76 C80 72 62 74 52 84Z', b) +
    line('M14 32 C22 30 32 31 40 36', c, 2.4) + line('M14 44 C22 42 32 43 40 48', c, 2.4) + line('M14 56 C22 54 32 55 40 60', c, 2.4) +
    line('M60 36 C68 31 78 30 86 32', c, 2.4) + line('M60 48 C68 43 78 42 86 44', c, 2.4) +
    poly([[44, 4], [56, 4], [56, 34], [50, 28], [44, 34]], b));

  def('shield', 'Shield', ({ a, b, c }) =>
    path('M50 6 L88 20 V48 C88 70 72 84 50 94 C28 84 12 70 12 48 V20Z', a) +
    path('M50 14 L80 25 V48 C80 65 68 76 50 85 Z', c, 'opacity="0.2"') +
    path('M50 14 L80 25 V48 C80 65 68 76 50 85 C32 76 20 65 20 48 V25Z', 'none', `stroke="${c}" stroke-width="2.4"`) +
    poly(starPts(50, 48, 17, 7), c));

  def('crest', 'Crest', ({ a, b, c }) =>
    path('M50 8 L84 18 V46 C84 68 68 82 50 92 C32 82 16 68 16 46 V18Z', a) +
    rect(46, 22, 8, 56, c) + rect(30, 38, 40, 8, c) + circ(50, 24, 5, b) +
    path('M20 20 Q12 10 4 14 Q10 24 20 28', b) + path('M80 20 Q88 10 96 14 Q90 24 80 28', b));

  def('orbit', 'Orbit', ({ a, b, c }) =>
    ell(50, 50, 44, 15, 'none', `stroke="${b}" stroke-width="5" transform="rotate(-28 50 50)"`) +
    circ(50, 50, 24, a) + path('M30 40 A24 24 0 0 1 56 28', 'none', `stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.6"`) +
    path('M20 66 A44 15 -28 0 0 80 34', 'none', `stroke="${b}" stroke-width="5" stroke-linecap="round" transform="rotate(0)"`) +
    circ(84, 36, 6, b));

  def('ring', 'Unity rings', ({ a, b, c }) =>
    ring(36, 50, 26, a, 9) + ring(64, 50, 26, b, 9) +
    path('M50 29 A26 26 0 0 1 50 71', 'none', `stroke="${a}" stroke-width="9"`));

  def('petal', 'Lotus', ({ a, b, c }) => {
    const pet = (deg, f, op) => rot(deg, 50, 84, path('M50 24 C64 44 64 66 50 84 C36 66 36 44 50 24Z', f, `opacity="${op}"`));
    return pet(-62, b, 0.75) + pet(62, b, 0.75) + pet(-32, a, 1) + pet(32, a, 1) + pet(0, b, 1) +
      path('M12 90 Q50 76 88 90', 'none', `stroke="${a}" stroke-width="4" stroke-linecap="round"`) +
      path('M50 36 C56 48 56 62 50 74 C44 62 44 48 50 36Z', c, 'opacity="0.35"');
  });

  def('arrow', 'Paper plane', ({ a, b, c }) =>
    poly([[6, 46], [94, 8], [64, 92], [48, 60]], a) +
    poly([[48, 60], [94, 8], [34, 50]], b) +
    poly([[48, 60], [64, 92], [56, 62]], c, 'opacity="0.45"'));

  def('star', 'Star', ({ a, b, c }) =>
    poly(starPts(50, 54, 44, 18), a) + poly(starPts(50, 54, 28, 11), b) +
    poly(starPts(50, 54, 12, 5), c));

  def('wave', 'Waves', ({ a, b }) =>
    line('M8 30 C22 14 36 46 50 30 S78 14 92 30', a, 9) +
    line('M8 52 C22 36 36 68 50 52 S78 36 92 52', b, 9) +
    line('M8 74 C22 58 36 90 50 74 S78 58 92 74', a, 9));

  def('tree', 'Tree', ({ a, b, c }) =>
    circ(50, 30, 22, a) + circ(30, 46, 19, a) + circ(70, 46, 19, a) + circ(50, 54, 20, a) +
    circ(44, 24, 7, b, 'opacity="0.7"') + circ(66, 42, 5, b, 'opacity="0.7"') +
    path('M44 92 L47 58 H53 L56 92Z', b) + line('M50 66 L40 54', c, 2.4) + line('M50 70 L62 58', c, 2.4) +
    rect(24, 92, 52, 3.5, a, 2));

  def('mountain', 'Mountains', ({ a, b, c }) =>
    circ(76, 24, 11, b) +
    poly([[4, 88], [38, 22], [72, 88]], a) + poly([[44, 88], [70, 44], [96, 88]], b) +
    poly([[38, 22], [28, 42], [34, 40], [38, 46], [44, 40], [48, 42]], c) +
    rect(4, 88, 92, 4, a, 2));

  def('sun', 'Sun', ({ a, b }) => {
    let r = '';
    for (let i = 0; i < 12; i++) r += rot(i * 30, 50, 50, rect(47.5, 5, 5, i % 2 ? 11 : 17, b, 2.5));
    return r + circ(50, 50, 24, a) + ring(50, 50, 31, a, 2.4);
  });

  def('gear', 'Gear', ({ a, b, c }) => {
    let t = '';
    for (let i = 0; i < 8; i++) t += rot(i * 45, 50, 50, rect(41, 4, 18, 22, a, 3));
    return t + circ(50, 50, 33, a) + circ(50, 50, 20, c) + circ(50, 50, 10, b) + ring(50, 50, 27, b, 2);
  });

  def('scale', 'Scales', ({ a, b, c }) =>
    rect(47, 14, 6, 70, a) + rect(26, 84, 48, 7, b, 2) + circ(50, 12, 6, b) +
    line('M14 28 H86', a, 5) +
    line('M14 28 L4 58 M14 28 L24 58', a, 2.6) + path('M2 58 H26 A12 10 0 0 1 2 58Z', b) +
    line('M86 28 L76 58 M86 28 L96 58', a, 2.6) + path('M74 58 H98 A12 10 0 0 1 74 58Z', b));

  def('cap', 'Graduation', ({ a, b, c }) =>
    poly([[50, 14], [96, 38], [50, 62], [4, 38]], a) +
    path('M24 52 V70 C24 80 76 80 76 70 V52 L50 66 Z', b) +
    line('M88 42 V70', a, 3.4) + circ(88, 74, 5, b) + circ(50, 38, 4, c));

  def('bag', 'Shopping bag', ({ a, b, c }) =>
    path('M28 36 V28 A22 22 0 0 1 72 28 V36', 'none', `stroke="${b}" stroke-width="6" stroke-linecap="round"`) +
    path('M12 34 H88 L84 90 H16 Z', a) + poly(starPts(50, 62, 15, 6), c) + rect(12, 34, 76, 6, b, 2));

  def('heart', 'Heart', ({ a, b, c }) =>
    path('M50 90 C12 62 6 32 26 20 C38 14 47 20 50 28 C53 20 62 14 74 20 C94 32 88 62 50 90Z', a) +
    path('M50 78 C26 58 22 38 34 30 C42 26 48 30 50 36', 'none', `stroke="${c}" stroke-width="3.4" stroke-linecap="round"`) +
    circ(70, 34, 4, b));

  def('cross', 'Cross', ({ a, b, c }) => {
    let r = '';
    for (let i = 0; i < 12; i++) r += rot(i * 30 + 15, 50, 50, rect(49, 2, 2, 12, b, 1));
    return r + rect(41, 12, 18, 76, a, 2) + rect(20, 32, 60, 18, a, 2) + circ(50, 41, 6.5, b) + circ(50, 41, 3, c);
  });

  def('play', 'Play', ({ a, b, c }) =>
    rect(6, 18, 88, 64, a, 14) + poly([[40, 34], [70, 50], [40, 66]], c) +
    path('M14 26 H86', 'none', `stroke="${b}" stroke-width="3" stroke-linecap="round"`) +
    path('M14 74 H86', 'none', `stroke="${b}" stroke-width="3" stroke-linecap="round"`));

  def('lens', 'Aperture', ({ a, b, c }) => {
    let bl = '';
    for (let i = 0; i < 6; i++) bl += rot(i * 60, 50, 50, poly([[50, 50], [50, 14], [72, 22]], c, 'opacity="0.9"'));
    return circ(50, 50, 42, a) + ring(50, 50, 36, b, 2.4) + bl + circ(50, 50, 9, b);
  });

  def('truck', 'Truck', ({ a, b, c }) =>
    rect(6, 28, 56, 44, a, 3) + path('M62 40 H80 L94 54 V72 H62Z', b) + path('M68 46 H78 L86 54 H68Z', c) +
    circ(26, 76, 11, c) + circ(26, 76, 7, a) + circ(76, 76, 11, c) + circ(76, 76, 7, b) +
    line('M10 40 H40', c, 3) + line('M10 50 H30', c, 3) + line('M2 18 H20', b, 3));

  def('wheat', 'Wheat', ({ a, b }) => {
    let g = '';
    for (let i = 0; i < 5; i++) {
      const y = 78 - i * 14;
      g += rot(-35, 50, y, ell(42, y - 6, 5, 11, i % 2 ? b : a)) + rot(35, 50, y, ell(58, y - 6, 5, 11, i % 2 ? a : b));
    }
    return line('M50 92 V14', a, 3.4) + g + ell(50, 10, 5, 11, b);
  });

  def('cloche', 'Cloche', ({ a, b, c }) =>
    circ(50, 20, 6, b) + path('M10 70 A40 40 0 0 1 90 70Z', a) +
    path('M22 58 A30 30 0 0 1 40 38', 'none', `stroke="${c}" stroke-width="3.4" stroke-linecap="round" opacity="0.7"`) +
    rect(4, 72, 92, 7, b, 3.5) + rect(18, 82, 64, 4, a, 2));

  def('hanger', 'Hanger', ({ a, b, c }) =>
    path('M50 34 V26 A9 9 0 1 0 41 17', 'none', `stroke="${b}" stroke-width="5" stroke-linecap="round"`) +
    path('M50 32 L94 66 A8 8 0 0 1 88 80 H12 A8 8 0 0 1 6 66 Z', a) +
    path('M50 48 L76 68 H24Z', c) + line('M16 74 H84', b, 2.2));

  def('diamond', 'Gem', ({ a, b, c }) =>
    poly([[28, 16], [72, 16], [94, 40], [6, 40]], b) +
    poly([[6, 40], [94, 40], [50, 92]], a) +
    poly([[6, 40], [30, 40], [50, 92]], a, 'opacity="0.7"') +
    poly([[28, 16], [38, 40], [50, 16]], c, 'opacity="0.35"') + poly([[72, 16], [62, 40], [50, 16]], c, 'opacity="0.35"') +
    poly([[38, 40], [62, 40], [50, 92]], c, 'opacity="0.22"'));

  def('nib', 'Pen nib', ({ a, b, c }) =>
    path('M50 6 L76 44 L60 94 H40 L24 44Z', a) + rect(36, 70, 28, 8, b) +
    line('M50 40 V74', c, 3.4) + circ(50, 36, 6, c));

  def('dumbbell', 'Dumbbell', ({ a, b, c }) =>
    rect(8, 36, 12, 28, a, 3) + rect(20, 28, 12, 44, a, 3) + rect(68, 28, 12, 44, a, 3) + rect(80, 36, 12, 28, a, 3) +
    rect(32, 45, 36, 10, b, 2) + rect(22, 40, 3, 20, c));

  def('compass', 'Compass', ({ a, b, c }) =>
    circ(50, 50, 42, a) + ring(50, 50, 35, c, 2.2) +
    poly([[50, 14], [60, 50], [50, 86], [40, 50]], b, 'transform="rotate(45 50 50)"') +
    poly([[50, 14], [60, 50], [40, 50]], c, 'transform="rotate(45 50 50)"') + circ(50, 50, 5, a) + circ(50, 50, 2, c));

  def('code', 'Code', ({ a, b, c }) =>
    rect(4, 14, 92, 72, a, 10) + rect(4, 14, 92, 14, b, 10) + rect(4, 22, 92, 6, b) +
    circ(14, 21, 2.6, c) + circ(23, 21, 2.6, c) + circ(32, 21, 2.6, c) +
    line('M32 48 L20 60 L32 72', c, 5) + line('M68 48 L80 60 L68 72', c, 5) + line('M56 44 L44 76', b, 5));

  def('wheel', 'Wheel', ({ a, b, c }) => {
    let sp = '';
    for (let i = 0; i < 5; i++) sp += rot(i * 72, 50, 50, rect(46.5, 18, 7, 32, b, 3));
    return ring(50, 50, 38, a, 12) + sp + circ(50, 50, 11, a) + circ(50, 50, 4.5, c);
  });

  def('car', 'Car', ({ a, b, c }) =>
    path('M6 62 L14 44 Q18 34 30 34 H62 Q72 34 78 44 L92 56 Q96 60 96 68 V72 H6 Z', a) +
    path('M22 44 H44 V56 H16Z', c) + path('M50 44 H66 L76 56 H50Z', c) +
    circ(28, 74, 12, c) + circ(28, 74, 7.5, b) + circ(74, 74, 12, c) + circ(74, 74, 7.5, b) +
    line('M8 60 H18', b, 3));

  def('bricks', 'Bricks', ({ a, b, c }) => {
    let s = '';
    const rows = [[8, 12, 40, 26, a], [52, 12, 40, 26, b], [8, 40, 22, 26, b], [34, 40, 40, 26, a], [78, 40, 14, 26, b], [8, 68, 40, 24, a], [52, 68, 40, 24, b]];
    rows.forEach(([x, y, w, h, f]) => { s += rect(x, y, w, h, f, 2.5); });
    return s;
  });

  def('crane', 'Crane', ({ a, b, c }) =>
    rect(18, 20, 8, 70, a) + line('M18 30 L26 40 L18 50 L26 60 L18 70 L26 80', c, 2.4) +
    rect(4, 14, 90, 8, a, 2) + poly([[18, 6], [26, 6], [22, 0]], b) +
    line('M70 22 V56', b, 2.6) + rect(62, 56, 18, 12, b, 2) + rect(10, 88, 36, 5, a, 2) + rect(4, 20, 16, 6, b));

  def('moon', 'Crescent', ({ a, b, c }) =>
    path('M62 10 A42 42 0 1 0 90 62 A34 34 0 1 1 62 10Z', a) + poly(starPts(74, 28, 10, 4), b) + circ(88, 44, 3, b));

  def('hex', 'Honeycomb', ({ a, b, c }) => {
    const h = (cx, cy, r, f) => poly(ngon(cx, cy, r, 6, -30), f);
    return h(50, 50, 20, a) + h(50, 18, 14, b) + h(78, 34, 14, a, 'opacity="0.8"') + h(78, 66, 14, b) +
      h(50, 82, 14, a) + h(22, 66, 14, b) + h(22, 34, 14, a, 'opacity="0.8"') + circ(50, 50, 7, c);
  });

  def('abstract', 'Abstract', ({ a, b, c }) =>
    path('M10 50 A40 40 0 0 1 50 10 V50Z', a) + path('M50 10 A40 40 0 0 1 90 50 H50Z', b) +
    path('M90 50 A40 40 0 0 1 50 90 V50Z', a) + path('M50 90 A40 40 0 0 1 10 50 H50Z', b, 'opacity="0.6"') +
    circ(50, 50, 9, c));

  // Special: handled by the engine (letters), listed so it appears in the picker
  ICONS.monogram = { id: 'monogram', label: 'Initial monogram', draw: null };

  // Old project / AI keyword aliases → current ids
  const ALIASES = {
    hexagon: 'cube', craft: 'abstract', freeform: 'abstract', none: 'none',
    shield: 'shield', ring: 'ring', 'roof': 'roof', crest: 'crest', petal: 'petal', gem: 'diamond'
  };

  // ───────────────────────── INDUSTRY → ICON MAP ─────────────────────────
  const INDUSTRY_ICONS = {
    'Technology / SaaS': ['nodes', 'circuit', 'cube', 'code', 'orbit', 'hex', 'bolt'],
    'Finance / Fintech': ['growth', 'coin', 'shield', 'columns', 'diamond', 'compass'],
    'Real Estate / Housing': ['house', 'roof', 'building', 'skyline', 'key', 'bricks'],
    'Property Management': ['key', 'building', 'house', 'roof', 'shield', 'skyline'],
    'Construction / Development': ['crane', 'bricks', 'building', 'skyline', 'gear', 'roof'],
    'Architecture / Design': ['columns', 'compass', 'building', 'cube', 'hex', 'skyline'],
    'Hospitality / Hotel': ['cloche', 'key', 'crest', 'star', 'moon', 'diamond'],
    'Food & Beverage': ['flame', 'wheat', 'cloche', 'leaf', 'cup', 'star'],
    'Café / Coffee': ['cup', 'flame', 'wheat', 'leaf', 'cloche', 'sun'],
    'Restaurant': ['cloche', 'flame', 'wheat', 'leaf', 'crest', 'star'],
    'Health / Medical': ['pulse', 'droplet', 'heart', 'cross', 'leaf', 'shield'],
    'Wellness / Fitness': ['dumbbell', 'petal', 'bolt', 'mountain', 'sun', 'heart'],
    'Beauty / Salon': ['petal', 'diamond', 'leaf', 'moon', 'heart', 'star'],
    'Fashion / Apparel': ['hanger', 'diamond', 'nib', 'petal', 'star', 'bag'],
    'Education / Training': ['cap', 'book', 'crest', 'columns', 'star', 'tree'],
    'Legal / Law': ['scale', 'columns', 'shield', 'book', 'crest', 'compass'],
    'Consulting': ['compass', 'growth', 'nodes', 'diamond', 'mountain', 'hex'],
    'Sports / Team': ['bolt', 'chevron', 'target', 'star', 'shield', 'mountain'],
    'Automotive': ['wheel', 'car', 'chevron', 'bolt', 'shield', 'gear'],
    'Logistics / Transport': ['truck', 'arrow', 'cube', 'orbit', 'nodes', 'chevron'],
    'Energy / Utilities': ['bolt', 'sun', 'flame', 'droplet', 'gear', 'orbit'],
    'Agriculture': ['wheat', 'leaf', 'tree', 'sun', 'droplet', 'mountain'],
    'Nonprofit / NGO': ['heart', 'tree', 'ring', 'orbit', 'leaf', 'star'],
    'Church / Ministry': ['cross', 'book', 'crest', 'flame', 'moon', 'columns'],
    'Event / Entertainment': ['star', 'play', 'lens', 'flame', 'moon', 'bolt'],
    'Media / Creative': ['lens', 'play', 'nib', 'wave', 'abstract', 'diamond'],
    'Retail / E-commerce': ['bag', 'diamond', 'star', 'cube', 'truck', 'hex'],
    'Personal brand': ['monogram', 'nib', 'star', 'diamond', 'abstract', 'petal'],
    'Business / Company': ['compass', 'shield', 'diamond', 'mountain', 'nodes', 'abstract', 'monogram']
  };

  // ───────────────────────── FRAMES (200×200) ─────────────────────────
  // Each returns the outline geometry as SVG path/polygon data (not coloured),
  // plus the box where the icon should sit.
  const FRAMES = {
    none: { label: 'No frame', box: { x: 20, y: 20, w: 160, h: 160 }, shape: null },
    circle: { label: 'Circle', box: { x: 42, y: 42, w: 116, h: 116 }, shape: { t: 'circle', r: 96 } },
    ringdots: { label: 'Dotted ring', box: { x: 46, y: 46, w: 108, h: 108 }, shape: { t: 'circle', r: 78 }, dots: 96 },
    rosette: { label: 'Rosette', box: { x: 44, y: 44, w: 112, h: 112 }, shape: { t: 'poly', pts: starPts(100, 100, 96, 87, 22) } },
    shield: {
      label: 'Shield', box: { x: 52, y: 40, w: 96, h: 96 },
      shape: { t: 'path', d: 'M100 6 L176 30 V92 C176 138 144 170 100 194 C56 170 24 138 24 92 V30 Z' }
    },
    hexagon: { label: 'Hexagon', box: { x: 48, y: 48, w: 104, h: 104 }, shape: { t: 'poly', pts: ngon(100, 100, 98, 6, -90) } },
    octagon: { label: 'Octagon', box: { x: 44, y: 44, w: 112, h: 112 }, shape: { t: 'poly', pts: ngon(100, 100, 98, 8, -67.5) } },
    squircle: { label: 'Rounded square', box: { x: 40, y: 40, w: 120, h: 120 }, shape: { t: 'rect', x: 8, y: 8, w: 184, h: 184, rx: 48 } },
    arch: {
      label: 'Arch', box: { x: 48, y: 64, w: 104, h: 104 },
      shape: { t: 'path', d: 'M18 194 V92 A82 82 0 0 1 182 92 V194 Z' }
    },
    diamond: { label: 'Diamond', box: { x: 58, y: 58, w: 84, h: 84 }, shape: { t: 'poly', pts: [[100, 2], [198, 100], [100, 198], [2, 100]] } }
  };

  function shapeMarkup(shape, attrs, scale) {
    const tr = scale && scale !== 1 ? ` transform="translate(100 100) scale(${scale}) translate(-100 -100)"` : '';
    if (!shape) return '';
    if (shape.t === 'circle') return `<circle cx="100" cy="100" r="${shape.r}" ${attrs}${tr}/>`;
    if (shape.t === 'poly') return `<polygon points="${pts(shape.pts)}" ${attrs}${tr}/>`;
    if (shape.t === 'path') return `<path d="${shape.d}" ${attrs}${tr}/>`;
    if (shape.t === 'rect') return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="${shape.rx}" ${attrs}${tr}/>`;
    return '';
  }

  /**
   * Draw a frame. style: solid | duotone | outline
   * colors: { fill, stroke, inset }   returns markup in the 200×200 grid
   */
  function drawFrame(type, style, colors) {
    const fr = FRAMES[type] || FRAMES.none;
    if (!fr.shape) return '';
    const { fill, stroke, inset, tint } = colors;
    let out = '';
    if (style === 'solid') {
      out += shapeMarkup(fr.shape, `fill="${fill}"`);
      out += shapeMarkup(fr.shape, `fill="none" stroke="${inset}" stroke-width="1.6" stroke-opacity="0.75"`, 0.9);
    } else if (style === 'duotone') {
      out += shapeMarkup(fr.shape, `fill="${tint}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"`);
      out += shapeMarkup(fr.shape, `fill="none" stroke="${inset}" stroke-width="1.6" stroke-opacity="0.85"`, 0.9);
    } else {
      out += shapeMarkup(fr.shape, `fill="none" stroke="${stroke}" stroke-width="5.5" stroke-linejoin="round"`);
      out += shapeMarkup(fr.shape, `fill="none" stroke="${inset}" stroke-width="1.8"`, 0.9);
    }
    if (fr.dots) {
      for (let i = 0; i < fr.dots; i++) {
        const ang = i * 2 * Math.PI / fr.dots;
        out += `<circle cx="${n2(100 + 91 * Math.cos(ang))}" cy="${n2(100 + 91 * Math.sin(ang))}" r="2.3" fill="${stroke}"/>`;
      }
      out += `<circle cx="100" cy="100" r="98" fill="none" stroke="${stroke}" stroke-width="2"/>`;
    }
    return out;
  }

  // ───────────────────────── ORNAMENTS ─────────────────────────
  const ORNAMENTS = { none: 'None', laurel: 'Laurel wreath', ticks: 'Ticks ring', stars: 'Stars', dots: 'Dots' };

  /** Returns { markup, pad } — pad is how far it extends beyond the 200 box. */
  function drawOrnament(type, color, frameType) {
    if (type === 'laurel') {
      let m = '';
      const R = frameType === 'none' ? 100 : 114;
      const rad = Math.PI / 180;
      for (const sd of [-1, 1]) {
        const pt = ph => [100 + sd * R * Math.sin(ph * rad), 100 + R * Math.cos(ph * rad)];
        const p0 = pt(24), p1 = pt(136);
        m += `<path d="M${n2(p0[0])} ${n2(p0[1])} A${R} ${R} 0 0 ${sd > 0 ? 0 : 1} ${n2(p1[0])} ${n2(p1[1])}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
        for (let i = 0; i < 8; i++) {
          const ph = 30 + i * 13.5;
          const [x, y] = pt(ph);
          const tang = Math.atan2(-Math.sin(ph * rad), sd * Math.cos(ph * rad)) / rad;
          const len = 14 - i * 0.7;
          m += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(len)}" ry="${n2(len * 0.36)}" fill="${color}" transform="rotate(${n2(tang + sd * 34)} ${n2(x)} ${n2(y)})"/>`;
          m += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(len)}" ry="${n2(len * 0.36)}" fill="${color}" transform="rotate(${n2(tang - sd * 34)} ${n2(x)} ${n2(y)}) translate(${sd * 2} ${-2})" opacity="0.65"/>`;
        }
      }
      return { markup: m, pad: 34 };
    }
    if (type === 'ticks' && ['shield', 'arch', 'diamond', 'squircle', 'none'].indexOf(frameType) >= 0) return { markup: '', pad: 0 };
    if (type === 'ticks') {
      let m = '';
      for (let i = 0; i < 90; i++) {
        const a = i * 4 * Math.PI / 180, long = i % 5 === 0;
        const r1 = 104, r2 = long ? 113 : 108;
        m += `<line x1="${n2(100 + r1 * Math.cos(a))}" y1="${n2(100 + r1 * Math.sin(a))}" x2="${n2(100 + r2 * Math.cos(a))}" y2="${n2(100 + r2 * Math.sin(a))}" stroke="${color}" stroke-width="${long ? 1.8 : 0.9}"/>`;
      }
      return { markup: m, pad: 14 };
    }
    if (type === 'stars') {
      const cy = frameType === 'none' ? 100 : 100;
      let m = '';
      [[-22, 0], [222, 0]].forEach(([x]) => {
        m += `<polygon points="${starPts(x, cy, 12, 5).map(p => n2(p[0]) + ',' + n2(p[1])).join(' ')}" fill="${color}"/>`;
      });
      [[-14, 52], [214, 52], [-14, 148], [214, 148]].forEach(([x, y]) => {
        m += `<polygon points="${starPts(x, y, 6, 2.6).map(p => n2(p[0]) + ',' + n2(p[1])).join(' ')}" fill="${color}" opacity="0.8"/>`;
      });
      return { markup: m, pad: 36 };
    }
    if (type === 'dots') {
      let m = '';
      for (let i = 0; i < 3; i++) m += `<circle cx="${100 + (i - 1) * 16}" cy="${frameType === 'none' ? 184 : 212}" r="${i === 1 ? 4.2 : 3}" fill="${color}"/>`;
      return { markup: m, pad: 0, extraBottom: 24 };
    }
    return { markup: '', pad: 0 };
  }

  return {
    ICONS, ALIASES, INDUSTRY_ICONS, FRAMES, ORNAMENTS,
    drawFrame, drawOrnament, shapeMarkup, starPts, ngon, poly, path, line, rect, circ,
    iconList: () => Object.values(ICONS).map(i => ({ id: i.id, label: i.label })),
    frameList: () => Object.entries(FRAMES).map(([id, f]) => ({ id, label: f.label }))
  };
});
