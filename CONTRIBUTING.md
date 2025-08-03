# Contributing to Notion Export Tool

Thank you for your interest in contributing to the Notion Export Tool! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- Git
- A Notion account with API access

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/NotionExport.git
   cd NotionExport
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a development environment file:
   ```bash
   cp .env.example .env
   # Add your Notion API key to .env
   ```
5. Build the project:
   ```bash
   npm run build
   ```
6. Test the application:
   ```bash
   npm run start:gui
   ```

## Development Workflow

### Running in Development Mode

For active development with hot reloading:

```bash
# Start React dev server and Electron in development mode
npm run dev:gui
```

This will:
- Start the React development server on port 3000
- Launch Electron with `--dev` flag
- Enable hot reloading for React components
- Open developer tools automatically

### Building and Testing

```bash
# Build TypeScript backend
npx tsc

# Build React frontend
npm run build:react

# Build everything
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Project Structure

```
NotionExport/
├── src/                    # Backend TypeScript code
│   ├── electron/          # Electron main and preload scripts
│   │   ├── main.ts        # Main Electron process
│   │   └── preload.ts     # Preload script for IPC
│   ├── lib/              # Core business logic
│   │   ├── logger.ts      # Logging system
│   │   ├── notion-client.ts # Notion API client
│   │   ├── exporter.ts    # Main export orchestration
│   │   └── folder-builder.ts # Folder structure creation
│   ├── exporters/        # Format-specific exporters
│   │   ├── pdf-exporter.ts # PDF generation
│   │   └── docx-exporter.ts # DOCX generation
│   └── types/            # TypeScript type definitions
├── gui/                   # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ConfigurationPanel.tsx
│   │   │   ├── NotionBrowser.tsx
│   │   │   ├── ExportPanel.tsx
│   │   │   └── LogsPanel.tsx
│   │   ├── types/        # Frontend types
│   │   └── App.tsx       # Main React application
│   └── build/            # Built React app (generated)
└── dist/                 # Compiled TypeScript output (generated)
```

## Coding Guidelines

### TypeScript

- Use strict TypeScript configuration
- Define proper types for all functions and variables
- Avoid `any` types - use proper type definitions
- Use interfaces for object shapes
- Export types that might be used by other modules

### React Components

- Use functional components with hooks
- Follow Material-UI patterns and components
- Implement proper error boundaries
- Use TypeScript for prop types
- Keep components focused and single-purpose

### Electron IPC

- Use `ipcMain.handle` and `ipcRenderer.invoke` for async operations
- Always validate data received through IPC
- Use proper types for IPC payloads
- Handle errors gracefully in IPC handlers

### Logging

- Use the built-in logger for all logging operations
- Include appropriate source context (e.g., 'export', 'config', 'notion-api')
- Use appropriate log levels:
  - `info`: General information and successful operations
  - `warn`: Warnings that don't prevent operation
  - `error`: Errors that prevent operation
  - `debug`: Detailed debugging information

### Error Handling

- Always handle async operations with try/catch
- Provide meaningful error messages
- Log errors with appropriate context
- Don't expose sensitive information in error messages
- Use proper error types and maintain error context

## Testing

### Manual Testing

1. Test the complete workflow:
   - Configuration → Browse → Export
2. Test with different Notion page structures
3. Test both PDF and DOCX export formats
4. Test with and without child pages
5. Verify logging functionality
6. Test error scenarios (invalid API key, network issues, etc.)

### Areas to Test

- **Configuration Panel**: API key encryption, connection testing
- **Notion Browser**: Search, page hierarchy, selection
- **Export Panel**: Directory selection, format options, progress tracking
- **Logs Panel**: Real-time logging, filtering, export functionality
- **Error Handling**: Network failures, invalid inputs, permission issues

## Submitting Changes

### Before Submitting

1. Ensure all code builds without errors:
   ```bash
   npm run build
   ```
2. Test the complete application workflow
3. Check that logging works properly
4. Verify no sensitive information is logged
5. Update documentation if needed

### Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Commit with descriptive messages:
   ```bash
   git commit -m "Add feature: description of what you added"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Create a Pull Request on GitHub

### Pull Request Guidelines

- Provide a clear description of changes
- Reference any related issues
- Include screenshots for UI changes
- Describe testing performed
- Keep PRs focused on a single feature/fix

## Security Considerations

- Never commit API keys or sensitive data
- Use the encrypted storage system for sensitive configuration
- Validate all user inputs
- Handle file system operations securely
- Don't log sensitive information in plain text

## Getting Help

- Check existing issues on GitHub
- Review the documentation in README.md
- Use the Logs tab for debugging
- Ask questions in GitHub Discussions

## Code of Conduct

- Be respectful and constructive
- Focus on what's best for the community
- Show empathy towards other contributors
- Accept constructive criticism gracefully

Thank you for contributing to making the Notion Export Tool better!