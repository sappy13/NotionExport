import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import Store from 'electron-store';
import { NotionExporter } from '../lib/exporter';
import { NotionClient } from '../lib/notion-client';
import { ExportConfig } from '../types';

const store = new Store();
let mainWindow: BrowserWindow;
let notionClient: NotionClient | null = null;
let notionExporter: NotionExporter | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false,
  });

  const isDev = process.argv.includes('--dev');
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../gui/build/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-stored-config', () => {
  return {
    apiKey: store.get('notion.apiKey', ''),
    lastExportDir: store.get('export.lastDir', ''),
  };
});

ipcMain.handle('save-config', (_, config: { apiKey: string }) => {
  store.set('notion.apiKey', config.apiKey);
  
  if (config.apiKey) {
    notionClient = new NotionClient(config.apiKey);
    notionExporter = new NotionExporter(config.apiKey);
  } else {
    notionClient = null;
    notionExporter = null;
  }
  
  return true;
});

ipcMain.handle('test-connection', async () => {
  if (!notionClient) {
    return { success: false, error: 'No API key configured' };
  }

  try {
    const testPageId = 'test-page-id';
    await notionClient.getPage(testPageId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { success: false, error: 'Invalid API key or insufficient permissions' };
    }
    return { success: true };
  }
});

ipcMain.handle('search-notion', async (_, query: string) => {
  if (!notionClient) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const client = (notionClient as any).client;
    const response = await client.search({
      query,
      filter: {
        property: 'object',
        value: 'page'
      },
      page_size: 50
    });

    const pages = response.results.map((page: any) => ({
      id: page.id,
      title: extractTitle(page),
      url: page.url,
      parent: page.parent,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time
    }));

    return { success: true, pages };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
});

ipcMain.handle('get-page-children', async (_, pageId: string) => {
  if (!notionClient) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const childPageIds = await notionClient.getChildPages(pageId);
    const children = await Promise.all(
      childPageIds.map(async (childId) => {
        try {
          const page = await notionClient!.getPage(childId);
          return {
            id: page.id,
            title: page.title,
            url: page.url,
            hasChildren: (await notionClient!.getChildPages(childId)).length > 0
          };
        } catch (error) {
          console.warn(`Failed to get child page ${childId}:`, error);
          return null;
        }
      })
    );

    return {
      success: true,
      children: children.filter(child => child !== null)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get children'
    };
  }
});

ipcMain.handle('select-export-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Export Directory'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    store.set('export.lastDir', selectedPath);
    return { success: true, path: selectedPath };
  }

  return { success: false };
});

ipcMain.handle('export-pages', async (_, options: {
  pageIds: string[];
  outputDir: string;
  formats: ('pdf' | 'docx')[];
  includeChildren: boolean;
}) => {
  if (!notionExporter) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const results = [];
    
    for (const pageId of options.pageIds) {
      const config: ExportConfig = {
        outputDir: options.outputDir,
        formats: options.formats,
        includeSubpages: options.includeChildren
      };

      const result = await notionExporter.exportPage(pageId, config);
      results.push({
        pageId,
        success: result.success,
        files: result.exportedFiles,
        errors: result.errors
      });

      mainWindow.webContents.send('export-progress', {
        completed: results.length,
        total: options.pageIds.length,
        currentPage: pageId
      });
    }

    return {
      success: true,
      results,
      totalFiles: results.reduce((sum, r) => sum + r.files.length, 0)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
});

function extractTitle(page: any): string {
  if (page.properties) {
    const titleProperty = Object.values(page.properties).find(
      (prop: any) => prop.type === 'title'
    ) as any;
    
    if (titleProperty?.title?.length > 0) {
      return titleProperty.title[0].plain_text;
    }
  }

  if (page.child_page?.title) {
    return page.child_page.title;
  }

  return 'Untitled';
}