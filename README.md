# Notion Export Tool

A powerful desktop application for exporting Notion content to hierarchical folder structures with PDF and DOCX formats.

## Features

- **🔐 Secure API Key Storage**: Encrypted storage using AES-256-CBC encryption with automatic migration
- **📁 Hierarchical Export**: Maintains Notion page structure in exported folders
- **📄 Multiple Formats**: Export to PDF and DOCX formats simultaneously
- **🖥️ Modern GUI**: Electron + React interface with Material-UI components
- **📊 Real-time Logging**: Comprehensive logging system with dedicated Logs tab for troubleshooting
- **🔄 Batch Export**: Export multiple pages at once with progress tracking
- **🌳 Child Page Support**: Option to include or exclude child pages recursively
- **⚡ Fast Search**: Search and browse your Notion workspace efficiently
- **🛠️ Debug Tools**: Built-in debugging utilities and comprehensive error handling
- **💾 Configuration Persistence**: Settings automatically saved between sessions

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd NotionExport
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. (Optional) Install globally:
```bash
npm link
```

## Setup

### Get your Notion API token

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name and select your workspace
4. Copy the "Internal Integration Token"
5. Share your pages/databases with the integration

### Configure your environment

Create a `.env` file in the project root:
```bash
NOTION_API_KEY=your_notion_integration_token_here
```

Or use the `--api-key` option with commands.

## Usage

### GUI Application (Recommended)

Launch the desktop application:
```bash
npm run start:gui
```

**Using the GUI:**
1. **Configuration Tab**: Enter your Notion API key and test the connection
   - API keys are automatically encrypted and stored securely
   - Connection testing with detailed feedback
2. **Browse Notion Tab**: Search and browse your Notion workspace
   - Search for pages by title or content
   - Expand page hierarchies to see subpages
   - Select multiple pages using checkboxes
3. **Export Tab**: Configure and run exports
   - Choose output directory
   - Select export formats (PDF, DOCX, or both)
   - Choose whether to include subpages
   - Monitor export progress in real-time
4. **Logs Tab**: Comprehensive application logging and debugging
   - Real-time log streaming
   - Filter logs by level (info, warn, error, debug)
   - Export logs for troubleshooting
   - Clear logs functionality

### CLI Usage

For automation and scripting, use the command-line interface:

#### Export a single page
```bash
# Export page with subpages to PDF and DOCX
npm start page --page-id <page-id> --output ./exports

# Export only PDF format
npm start page --page-id <page-id> --formats pdf --output ./my-export

# Export without subpages
npm start page --page-id <page-id> --no-subpages
```

#### Export a database
```bash
# Export all pages from a database
npm start database --database-id <database-id> --output ./exports

# Export only DOCX format
npm start database --database-id <database-id> --formats docx
```

#### Get help
```bash
npm start setup    # Interactive setup guide
npm start --help   # Show all commands
```

## Command Reference

### Page Export
```bash
notion-export page [options]

Options:
  -p, --page-id <id>      Notion page ID to export (required)
  -o, --output <dir>      Output directory (default: "./exports")
  -f, --formats <formats> Export formats: pdf,docx (default: "pdf,docx")
  --no-subpages          Exclude subpages from export
  -k, --api-key <key>    Notion API key
```

### Database Export
```bash
notion-export database [options]

Options:
  -d, --database-id <id>  Notion database ID to export (required)
  -o, --output <dir>      Output directory (default: "./exports")
  -f, --formats <formats> Export formats: pdf,docx (default: "pdf,docx")
  -k, --api-key <key>    Notion API key
```

## Output Structure

The tool creates a hierarchical folder structure that matches your Notion organization:

```
exports/
├── Page Title/
│   ├── content.md          # Markdown content
│   ├── metadata.json       # Page metadata
│   ├── Page Title.pdf      # PDF export
│   ├── Page Title.docx     # DOCX export
│   └── Subpage Title/      # Nested subpages
│       ├── content.md
│       ├── metadata.json
│       ├── Subpage Title.pdf
│       └── Subpage Title.docx
```

## Development

### Scripts
- `npm run build` - Compile TypeScript and build React GUI
- `npm run start:gui` - Launch the GUI application
- `npm run dev:gui` - Run GUI in development mode
- `npm run dev` - Run CLI in development mode
- `npm run lint` - Run linting
- `npm run type-check` - Check types without compilation

### GUI Development
For GUI development, run the React dev server and Electron separately:
```bash
# Terminal 1: Start React dev server
cd gui && npm start

# Terminal 2: Start Electron in dev mode
npm run dev:electron
```

### Architecture

**Core Library:**
- `src/lib/notion-client.ts` - Notion API integration
- `src/lib/folder-builder.ts` - Hierarchical folder structure creation
- `src/exporters/pdf-exporter.ts` - PDF generation using Puppeteer
- `src/exporters/docx-exporter.ts` - DOCX generation using docx library
- `src/lib/exporter.ts` - Main export orchestration
- `src/index.ts` - CLI interface

**GUI Application:**
- `src/electron/main.ts` - Electron main process
- `src/electron/preload.ts` - Electron preload script for secure IPC
- `gui/src/App.tsx` - Main React application
- `gui/src/components/ConfigurationPanel.tsx` - API key configuration
- `gui/src/components/NotionBrowser.tsx` - Notion content browser
- `gui/src/components/ExportPanel.tsx` - Export configuration and execution

## Requirements

- Node.js 16+ 
- Notion integration token
- Pages/databases shared with your Notion integration

## License

MIT