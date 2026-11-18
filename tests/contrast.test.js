'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');

// Minimal pure functions mirrored from the app for unit testing
function luminance(hex) {
  const c = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(c)) return 0;
  const rgb = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('contrast utilities', () => {
  it('black vs white is ~21', () => {
    assert.ok(contrastRatio('#000000', '#ffffff') > 20);
  });
  it('gold on dark is acceptable', () => {
    assert.ok(contrastRatio('#d9b879', '#11151d') > 4);
  });
  it('identical colours give 1', () => {
    assert.strictEqual(Math.round(contrastRatio('#ffffff', '#ffffff')), 1);
  });
});
