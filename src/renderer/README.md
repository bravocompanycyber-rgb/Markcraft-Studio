# Renderer

SVG is the single source of truth for the logo.

- `app.js` owns state, concept generation, quality gate, and export.
- All generated markup is escaped.
- Future work: full object model with selectable/transformable nodes, Bézier editing, boolean ops.
