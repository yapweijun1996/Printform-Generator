
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
- **Build**: No build step required for dev (ES Modules via `esm.sh`)

## Setup & Usage

1. **API Key**: You must provide a valid Google Gemini API Key.
   - The app expects `process.env.API_KEY` to be injected by your environment.
   - Ensure your API Key has access to the `gemini-3-pro-preview` model.

2. **Running**:
   - Serve the directory using any static server or standard React bundler.
   - The entry point is `index.html`.

## Models

This project uses `gemini-3-pro-preview` for high-quality code generation and vision capabilities.

## License

MIT
