'use strict';

/**
 * Multi-page brand guideline PDF using pdf-lib (runs in main process)
 */
async function buildBrandPdf(payload) {
  const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

  const {
    brand = 'BRAND',
    descriptor = '',
    primary = '#c9a227',
    secondary = '#2c3e50',
    accent = '#e8d48b',
    fontName = 'Georgia',
    composition = 'stacked',
    symbol = 'star',
    primaryCmyk = [0, 20, 85, 15],
    secondaryCmyk = [70, 45, 30, 45],
    pngBytes = null
  } = payload;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const hexToRgb = (hex) => {
    const c = String(hex).replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(c)) return [0.2, 0.2, 0.2];
    return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255);
  };

  const [pr, pg, pb] = hexToRgb(primary);
  const [sr, sg, sb] = hexToRgb(secondary);
  const [ar, ag, ab] = hexToRgb(accent);

  // Page size A4
  const W = 595;
  const H = 842;
  const margin = 50;

  // ── Page 1: Cover ──
  {
    const page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 180, width: W, height: 180, color: rgb(pr, pg, pb) });
    page.drawText('BRAND GUIDELINES', {
      x: margin, y: H - 80, size: 14, font: fontBold, color: rgb(1, 1, 1)
    });
    page.drawText(brand.toUpperCase(), {
      x: margin, y: H - 130, size: 32, font: fontBold, color: rgb(1, 1, 1)
    });
    if (descriptor) {
      page.drawText(descriptor, {
        x: margin, y: H - 155, size: 12, font, color: rgb(1, 1, 1)
      });
    }
    page.drawText('Markcraft Studio  ·  Generated brand identity package', {
      x: margin, y: 60, size: 10, font, color: rgb(0.4, 0.4, 0.4)
    });
    page.drawText(new Date().toISOString().slice(0, 10), {
      x: margin, y: 44, size: 10, font, color: rgb(0.5, 0.5, 0.5)
    });
  }

  // ── Page 2: Logo showcase ──
  {
    const page = doc.addPage([W, H]);
    page.drawText('01  LOGO', {
      x: margin, y: H - 60, size: 18, font: fontBold, color: rgb(sr, sg, sb)
    });
    page.drawText('Primary mark', {
      x: margin, y: H - 90, size: 12, font, color: rgb(0.3, 0.3, 0.3)
    });

    if (pngBytes && pngBytes.length) {
      try {
        const img = await doc.embedPng(pngBytes);
        const maxW = W - margin * 2;
        const maxH = 280;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const iw = img.width * scale;
        const ih = img.height * scale;
        page.drawImage(img, {
          x: (W - iw) / 2,
          y: H - 120 - ih,
          width: iw,
          height: ih
        });
      } catch (_) {
        page.drawText('[Logo preview unavailable]', {
          x: margin, y: H - 200, size: 11, font, color: rgb(0.5, 0.5, 0.5)
        });
      }
    }

    page.drawText(`Composition: ${composition}`, {
      x: margin, y: 200, size: 11, font, color: rgb(0.25, 0.25, 0.25)
    });
    page.drawText(`Symbol: ${symbol}`, {
      x: margin, y: 184, size: 11, font, color: rgb(0.25, 0.25, 0.25)
    });
    page.drawText(`Typeface reference: ${fontName}`, {
      x: margin, y: 168, size: 11, font, color: rgb(0.25, 0.25, 0.25)
    });
    page.drawText('Clear space: maintain padding equal to the height of the primary initial.', {
      x: margin, y: 140, size: 10, font, color: rgb(0.4, 0.4, 0.4)
    });
    page.drawText('Do not stretch, skew, or recolour the mark outside the approved palette.', {
      x: margin, y: 124, size: 10, font, color: rgb(0.4, 0.4, 0.4)
    });
  }

  // ── Page 3: Colour system ──
  {
    const page = doc.addPage([W, H]);
    page.drawText('02  COLOUR SYSTEM', {
      x: margin, y: H - 60, size: 18, font: fontBold, color: rgb(sr, sg, sb)
    });

    const swatches = [
      { label: 'Primary', hex: primary, cmyk: primaryCmyk, col: rgb(pr, pg, pb) },
      { label: 'Secondary', hex: secondary, cmyk: secondaryCmyk, col: rgb(sr, sg, sb) },
      { label: 'Accent', hex: accent, cmyk: [0, 0, 0, 0], col: rgb(ar, ag, ab) }
    ];

    swatches.forEach((sw, i) => {
      const y = H - 140 - i * 130;
      page.drawRectangle({ x: margin, y: y - 50, width: 90, height: 90, color: sw.col });
      page.drawText(sw.label, { x: margin + 110, y: y + 20, size: 13, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
      page.drawText(`RGB  ${sw.hex.toUpperCase()}`, { x: margin + 110, y: y - 2, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
      if (sw.cmyk && sw.cmyk.length === 4) {
        page.drawText(`CMYK  ${sw.cmyk.map(v => v + '%').join('  ')}`, {
          x: margin + 110, y: y - 20, size: 11, font, color: rgb(0.3, 0.3, 0.3)
        });
      }
    });

    page.drawText('Use primary for the main mark and headlines. Secondary for supporting text and', {
      x: margin, y: 120, size: 10, font, color: rgb(0.4, 0.4, 0.4)
    });
    page.drawText('backgrounds. Accent for highlights and gradients only.', {
      x: margin, y: 104, size: 10, font, color: rgb(0.4, 0.4, 0.4)
    });
  }

  // ── Page 4: Usage notes ──
  {
    const page = doc.addPage([W, H]);
    page.drawText('03  USAGE NOTES', {
      x: margin, y: H - 60, size: 18, font: fontBold, color: rgb(sr, sg, sb)
    });

    const notes = [
      'Minimum size: do not use the full logo smaller than 24 mm wide in print.',
      'Favicon / app icon: use the symbol or monogram alone.',
      'Photography: place the mark on calm areas; avoid busy backgrounds.',
      'Incorrect use: no outlines, no drop shadows, no rotation beyond 0°/90°.',
      'Co-branding: keep clear space between marks; primary mark leads.',
      '',
      'Legal: This document is a design starting point. Trademark and copyright',
      'clearance remain the responsibility of the brand owner. Markcraft Studio',
      'does not guarantee uniqueness of generated marks.'
    ];

    notes.forEach((line, i) => {
      page.drawText(line, {
        x: margin,
        y: H - 110 - i * 22,
        size: 11,
        font,
        color: rgb(0.25, 0.25, 0.25)
      });
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { buildBrandPdf };
