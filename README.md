# Notion Export

A powerful command-line tool to export Notion content into hierarchical folder structures with PDF and DOCX formats.

## Features

- 📄 Export individual Notion pages with all subpages
- 🗃️ Export entire Notion databases
- 📁 Creates hierarchical folder structure matching Notion's organization
- 📋 Exports to both PDF and DOCX formats
- 🔧 Easy CLI interface with multiple export options
- 📝 Preserves markdown formatting and metadata

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

### Export a single page
```bash
# Export page with subpages to PDF and DOCX
npm start page --page-id <page-id> --output ./exports

# Export only PDF format
npm start page --page-id <page-id> --formats pdf --output ./my-export

# Export without subpages
npm start page --page-id <page-id> --no-subpages
```

### Export a database
```bash
# Export all pages from a database
npm start database --database-id <database-id> --output ./exports

# Export only DOCX format
npm start database --database-id <database-id> --formats docx
```

### Get help
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
- `npm run build` - Compile TypeScript
- `npm run dev` - Run in development mode
- `npm run lint` - Run linting
- `npm run type-check` - Check types without compilation

### Architecture

- `src/lib/notion-client.ts` - Notion API integration
- `src/lib/folder-builder.ts` - Hierarchical folder structure creation
- `src/exporters/pdf-exporter.ts` - PDF generation using Puppeteer
- `src/exporters/docx-exporter.ts` - DOCX generation using docx library
- `src/lib/exporter.ts` - Main export orchestration
- `src/index.ts` - CLI interface

## Requirements

- Node.js 16+ 
- Notion integration token
- Pages/databases shared with your Notion integration

## License

MIT