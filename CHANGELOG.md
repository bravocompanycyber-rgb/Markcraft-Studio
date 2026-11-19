# Changelog

## 1.2.0
- New logo engine (`logo-engine.js`, `logo-icons.js`) replaces the single-shape generator.
- Concept gallery: 4 composed logos at a time, choose / favourite / "more like this" / generate more.
- Layered, multi-part marks: backdrops, frames, 55 icons, second-symbol badge, ornaments.
- Finishes: flat, gradient + gloss, 3D extrusion, emboss.
- Measured layout: text widths are computed first and the lockup is auto-fitted (fixes the MASTAHOUSING badge covering the "M").
- Compound names split intelligently (MASTA | HOUSING); monogram initials from the first two words.
- File / Edit / View menus, undo / redo, autosave + restore, working align + pan tools, click-to-select layers with a selection box.
- Exports are tight-cropped; PDF/PNG use the same crop.
- Security: the AI API key is no longer copied into localStorage.
- Project schema v3 (v1.0/1.1 projects migrate automatically).
