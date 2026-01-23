# FormGenie - ERP Print Form Builder

A professional AI-powered tool for designing ERP print forms (Invoices, Packing Slips, Reports) using natural language.

## Features

- **AI Copilot**: Powered by **Gemini 3 Pro**, capable of intelligent code refactoring and styling.
- **Visual Replication**: Upload an image of an existing invoice/form, and the Agent will write the exact HTML/CSS to replicate it.
- **Professional IDE**: Integrated **Monaco Editor** (VS Code core) for professional-grade syntax highlighting, bracket matching, and error detection.
- **Real-time Preview**: Split-view editor with instant HTML/CSS rendering.
- **Smart Context**: The AI understands your current code structure and performs precise "Search & Replace" operations.
- **Print Isolation**: Uses isolated iframe rendering to ensure what you see is exactly what gets printed.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS
- **Editor**: Monaco Editor (via `@monaco-editor/react`)
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Pagination/Printing**: PrintForm.js (`printform-js/printform.js`)
- **Build**: Vite

## Setup & Usage

1. **API Key**: You must provide a valid Google Gemini API Key.
   - Put it in `.env.local` as `VITE_GEMINI_API_KEY=...` (recommended), or set `VITE_GEMINI_API_KEY` in your environment.

2. **Install & Run**:
   - `npm install`
   - `npm run dev`

3. **Build**:
   - `npm run build`
   - Output folder: `dist/`
   - **PrintForm.js output location**: `dist/printform.js` (root of `dist/`)

## How printing works (high-level)

```mermaid
flowchart TD
  A[Generate HTML (.printform)] --> B[Preview iframe loads dist/printform.js]
  B --> C[PrintForm.formatAll pagination]
  C --> D[Multi-page output with repeated header/row header/footer]
```

## SOP (PrintForm.js)

See `docs/PRINTFORM_JS_SOP.md`.

## Models

This project uses `gemini-3-pro-preview` for high-quality code generation and vision capabilities.

## License

MIT
