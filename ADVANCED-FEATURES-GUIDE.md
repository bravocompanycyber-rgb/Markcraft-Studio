# Markcraft Studio — Advanced Features Guide
## How to add the remaining professional features (all free)

Everything below is free / open-source. No paid accounts required.

----------------------------------------------------------------
1. FULL BÉZIER NODE EDITING + BOOLEAN OPERATIONS
----------------------------------------------------------------

What you need:
  Paper.js  — excellent SVG path + Bézier + boolean library

Where to get it (free):
  https://github.com/paperjs/paper.js
  or CDN / npm:  npm install paper

Alternative (also free):
  SVG.js + svg.path.js
  https://github.com/svgdotjs/svg.js

How to use in this project:
  - Download paper-full.min.js
  - Put it in src/renderer/lib/paper-full.min.js
  - Add <script src="lib/paper-full.min.js"></script> in index.html
  - Paper.js can load the existing SVG, give you node handles,
    path simplification, and boolean unite/subtract/intersect.

Official docs:
  http://paperjs.org/reference/
  http://paperjs.org/examples/

----------------------------------------------------------------
2. TRUE MULTI-PAGE PDF BRAND BOOKS
----------------------------------------------------------------

What you need:
  pdf-lib  — create multi-page PDFs entirely in the browser / Electron
             (no server, no paid service)

Where to get it (free, MIT license):
  https://github.com/Hopding/pdf-lib
  npm install pdf-lib

How to use:
  - npm install pdf-lib
  - In the renderer (or a preload-exposed module) you can:
      const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
  - Create pages for:
      Cover, Logo versions, Colour palette, Typography,
      Clear space, Incorrect usage, Mockups, etc.
  - Embed the SVG (convert to PNG first or use pdf-lib’s drawing)
  - Save as .pdf with downloadBlob

Docs + examples:
  https://pdf-lib.js.org/
  https://github.com/Hopding/pdf-lib#create-a-new-pdf

Alternative (also free):
  jsPDF  — https://github.com/parallax/jsPDF
  (simpler but less precise for complex layouts)

----------------------------------------------------------------
3. OPTIONAL AI PROVIDER (user’s own key)
----------------------------------------------------------------

Recommended free/cheap options the user can bring their own key for:

A. OpenAI-compatible APIs (user pays only what they use)
   - OpenAI: https://platform.openai.com
   - Groq (very fast, free tier): https://console.groq.com
   - Together.ai, Fireworks, etc.

B. Completely free local option (no key, runs on user’s machine)
   - Ollama: https://ollama.com
     Install Ollama → pull a model → call http://localhost:11434
   - LM Studio: https://lmstudio.ai

How to implement safely in Markcraft:
  - Preferences → “AI Provider”
  - Fields: Base URL, API Key (stored only in localStorage / electron-store)
  - Explicit opt-in checkbox + privacy note
  - Never send data unless the user clicks “Generate with AI”
  - Keep the existing rule-based generator as the default

Example free local call (Ollama):
  fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3.2',
      prompt: 'Suggest 3 logo concept descriptions for a premium coffee brand...'
    })
  })

----------------------------------------------------------------
4. QUICK INSTALL COMMANDS (inside the project folder)
----------------------------------------------------------------

# Bézier / path editing
npm install paper

# Multi-page PDF
npm install pdf-lib

# Optional: better local storage for API keys
npm install electron-store

Then restart the app (npm start).

----------------------------------------------------------------
5. RECOMMENDED ORDER TO ADD THEM
----------------------------------------------------------------

1. pdf-lib          → brand guideline PDF export (high user value)
2. paper.js         → real path/node editing
3. AI (optional)    → only after the above two feel solid

All three are production-quality and used by real commercial tools.
None require paying for a license.
