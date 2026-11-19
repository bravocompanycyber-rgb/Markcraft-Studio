'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const E = require('../src/renderer/logo-engine.js');
const I = require('../src/renderer/logo-icons.js');

const PAL = ['#1a365d', '#c9a227', '#e8d48b'];
const brief = (o = {}) => ({ brand: 'MASTAHOUSING', descriptor: 'BEST HOUSING', industry: 'Real Estate / Housing', personality: 'Elegant & timeless', notes: '', palette: PAL, ...o });
const withPal = r => ({ ...r, primary: PAL[0], secondary: PAL[1], accent: PAL[2] });

describe('concept generation', () => {
  it('returns 4 distinct concepts per round with varied layouts', () => {
    const recs = E.generate(brief(), { count: 4, seed: 1 });
    assert.strictEqual(recs.length, 4);
    assert.strictEqual(new Set(recs.map(E.keyOf)).size, 4);
    assert.ok(new Set(recs.map(r => r.layout)).size >= 3, 'layouts should differ within a round');
  });
  it('is deterministic for a seed', () => {
    assert.deepStrictEqual(E.generate(brief(), { count: 4, seed: 42 }), E.generate(brief(), { count: 4, seed: 42 }));
  });
  it('never repeats a concept that is in the history', () => {
    const hist = { keys: [], layouts: [], icons: [] };
    const seen = new Set();
    for (let k = 0; k < 6; k++) {
      E.generate(brief(), { count: 4, seed: 100 + k, history: hist }).forEach(r => {
        assert.ok(!seen.has(E.keyOf(r)), 'duplicate concept across rounds');
        seen.add(E.keyOf(r)); hist.keys.push(E.keyOf(r));
      });
    }
  });
  it('variations keep the layout and icon family', () => {
    const base = E.generate(brief(), { count: 1, seed: 5 })[0];
    E.variations(base, brief(), { count: 4, seed: 1 }).forEach(v => { assert.strictEqual(v.layout, base.layout); assert.strictEqual(v.icon, base.icon); });
  });
});

describe('rendering', () => {
  const names = [['MASTAHOUSING', 'BEST HOUSING'], ['A', ''], ['Bishop Njuguna Training College', 'Excellence in Education'],
    ['KILIMANI HEIGHTS PREMIUM APARTMENTS & SUITES LTD', 'x'], ['Zuri & <Co> "Q"', "it's"], ['Ünïcode Café', 'Crème']];
  it('every layout × finish × backdrop produces well-formed SVG inside the artboard', () => {
    for (const layout of Object.keys(E.LAYOUTS)) for (const finish of Object.keys(E.FINISHES)) for (const backdrop of Object.keys(E.BACKDROPS)) for (const [b, t] of names) {
      const r = E.render(withPal({ layout, finish, backdrop, icon: 'house', frame: 'shield', fill: 'solid' }), { brand: b, descriptor: t }, { bg: '#ffffff' });
      assert.ok(r.svg.startsWith('<svg'), 'svg root');
      assert.ok(!/NaN|undefined|Infinity/.test(r.svg), `bad number in ${layout}/${finish}/${backdrop}/${b}`);
      assert.ok(r.bbox.x >= -1 && r.bbox.y >= -1 && r.bbox.x + r.bbox.w <= 901 && r.bbox.y + r.bbox.h <= 601, `outside artboard: ${layout} ${b}`);
      const opens = (r.svg.match(/<g[ >]/g) || []).length, closes = (r.svg.match(/<\/g>/g) || []).length;
      assert.strictEqual(opens, closes, 'balanced <g>');
    }
  });
  it('every icon draws in every frame', () => {
    for (const icon of Object.keys(I.ICONS)) for (const frame of Object.keys(I.FRAMES)) {
      const r = E.render(withPal({ layout: 'stacked', icon, frame, fill: 'duotone', finish: '3d' }), { brand: 'TEST', descriptor: 'x' });
      assert.ok(r.svg.length > 500);
    }
  });
  it('ids are unique so several logos can share one page', () => {
    const r = E.render(withPal({ layout: 'banner', icon: 'key', frame: 'shield', finish: '3d', backdrop: 'wings', badgeIcon: 'house' }), brief(), { idPrefix: 'q' });
    const ids = [...r.svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(new Set(ids).size, ids.length);
  });
  it('escapes markup in brand names', () => {
    const r = E.render(withPal({ layout: 'stacked' }), { brand: '<script>&', descriptor: '"x"' });
    assert.ok(!r.svg.includes('<script>'));
  });
  it('splits compound names and keeps the original spelling', () => {
    const p = E.splitBrand('MASTAHOUSING');
    assert.deepStrictEqual([...p], ['MASTA', 'HOUSING']);
    assert.strictEqual(p.sep, '');
    assert.strictEqual(E.initials('Bishop Njuguna Training College'), 'BN');
  });
  it('keeps ink readable on a dark artboard', () => {
    const r = E.render({ ...withPal({ layout: 'stacked', icon: 'house', frame: 'none', primary: '#101820' }) }, brief(), { bg: '#101820' });
    assert.ok(!r.svg.includes('fill="#101820"><tspan') );
  });
});

describe('contrast helpers', () => {
  it('black on white is ~21', () => assert.ok(Math.abs(E.contrast('#000000', '#ffffff') - 21) < 0.01));
});
