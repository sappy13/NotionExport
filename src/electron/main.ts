import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import Store from 'electron-store';
import * as crypto from 'crypto';
import { NotionExporter } from '../lib/exporter';
import { NotionClient } from '../lib/notion-client';
import { Logger } from '../lib/logger';
import { ExportConfig } from '../types';

// Simple file logger for debugging startup issues
function debugLog(message: string) {
  try {
    const logPath = path.join(process.cwd(), 'startup-debug.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (error) {
    console.error('Failed to write debug log:', error);
  }
}

debugLog('Starting application initialization');

// Add process error handlers
process.on('uncaughtException', (error) => {
  debugLog(`Uncaught exception: ${error.message}`);
  debugLog(`Stack: ${error.stack}`);
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  debugLog(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  console.error('Unhandled rejection:', reason);
});

debugLog('Process error handlers installed');

const store = new Store();
let mainWindow: BrowserWindow;
let notionClient: NotionClient | null = null;
let notionExporter: NotionExporter | null = null;
let logger: Logger;

debugLog('Global variables initialized');

// Encryption key for API key storage
const ENCRYPTION_KEY = crypto.createHash('sha256').update('notion-export-key').digest();
debugLog('Encryption key created');

function encrypt(text: string): string {
  try {
    debugLog('Starting encryption');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    debugLog('Encryption completed successfully');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    debugLog(`Encryption failed: ${error}`);
    console.error('Encryption failed:', error);
    return text; // Fallback to plain text if encryption fails
  }
}

function decrypt(text: string): string {
  try {
    if (!text.includes(':')) {
      return text; // Assume it's already decrypted/plain text
    }
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return ''; // Return empty string if decryption fails
  }
}

function initializeLogger() {
  try {
    debugLog('Starting logger initialization');
    const userDataPath = app.getPath('userData');
    debugLog(`User data path: ${userDataPath}`);
    const logFile = path.join(userDataPath, 'notion-export.log');
    debugLog(`Log file path: ${logFile}`);
    
    logger = new Logger(logFile);
    debugLog('Logger instance created');
    
    // Set up listener to send logs to renderer
    logger.addListener((entry) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-message', entry);
      }
    });
    debugLog('Logger listener setup complete');
    
    logger.info('Application started', 'main');
    logger.info('Logger initialized successfully', 'main');
    console.log('This is a test console log to verify logging works');
    debugLog('Logger initialization completed successfully');
  } catch (error) {
    debugLog(`Failed to initialize logger: ${error}`);
    console.error('Failed to initialize logger:', error);
    // Create a minimal logger fallback
    logger = new Logger(); // Without file logging
  }
}

function createWindow(): void {
  try {
    debugLog('Starting window creation');
    
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
    debugLog('BrowserWindow created');

    const isDev = process.argv.includes('--dev');
    debugLog(`Dev mode: ${isDev}`);
    
    if (isDev) {
      debugLog('Loading development URL');
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      const htmlPath = path.join(__dirname, '../../gui/build/index.html');
      debugLog(`Loading production file: ${htmlPath}`);
      
      // Check if file exists
      if (fs.existsSync(htmlPath)) {
        debugLog('HTML file exists, loading...');
        mainWindow.loadFile(htmlPath);
      } else {
        debugLog(`HTML file not found at: ${htmlPath}`);
        throw new Error(`HTML file not found at: ${htmlPath}`);
      }
    }

    mainWindow.once('ready-to-show', () => {
      debugLog('Window ready to show');
      mainWindow.show();
    });
    
    debugLog('Window creation completed');
  } catch (error) {
    debugLog(`Window creation failed: ${error}`);
    throw error;
  }
}

app.whenReady().then(() => {
  debugLog('App ready event triggered');
  try {
    initializeLogger();
    createWindow();
    debugLog('App initialization completed successfully');
  } catch (error) {
    debugLog(`App initialization failed: ${error}`);
    console.error('App initialization failed:', error);
  }
}).catch(error => {
  debugLog(`App ready failed: ${error}`);
  console.error('App ready failed:', error);
});

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
  let apiKey = '';
  
  // First try to get encrypted API key
  const encryptedApiKey = store.get('notion.apiKey.encrypted', '') as string;
  if (encryptedApiKey) {
    try {
      apiKey = decrypt(encryptedApiKey);
      logger.info('Successfully decrypted API key', 'config');
    } catch (error) {
      logger.error('Failed to decrypt API key', 'config');
      apiKey = '';
    }
  }
  
  // Fallback to old unencrypted format if encrypted version not found or failed
  if (!apiKey) {
    const oldApiKey = store.get('notion.apiKey', '') as string;
    if (oldApiKey) {
      logger.info('Found legacy unencrypted API key, will migrate on next save', 'config');
      apiKey = oldApiKey;
    }
  }
  
  return {
    apiKey,
    lastExportDir: store.get('export.lastDir', ''),
  };
});

ipcMain.handle('save-config', (_, config: { apiKey: string }) => {
  if (config.apiKey) {
    const encryptedApiKey = encrypt(config.apiKey);
    store.set('notion.apiKey.encrypted', encryptedApiKey);
    
    // Clean up old unencrypted key if it exists
    if (store.has('notion.apiKey')) {
      store.delete('notion.apiKey');
      logger.info('Migrated legacy API key to encrypted storage', 'config');
    }
    
    logger.info('API key saved (encrypted)', 'config');
    
    notionClient = new NotionClient(config.apiKey);
    notionExporter = new NotionExporter(config.apiKey);
  } else {
    store.delete('notion.apiKey.encrypted');
    store.delete('notion.apiKey'); // Also clean up legacy key
    notionClient = null;
    notionExporter = null;
    logger.info('API key cleared', 'config');
  }
  
  return true;
});

ipcMain.handle('test-connection', async () => {
  if (!notionClient) {
    logger.warn('Connection test attempted with no API key configured', 'connection');
    return { success: false, error: 'No API key configured' };
  }

  try {
    logger.info('Testing Notion API connection', 'connection');
    const testPageId = 'test-page-id';
    await notionClient.getPage(testPageId);
    logger.info('API connection test successful', 'connection');
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      logger.error('API connection test failed: Invalid credentials', 'connection');
      return { success: false, error: 'Invalid API key or insufficient permissions' };
    }
    logger.info('API connection test successful (expected error for test page)', 'connection');
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
    logger.error('Export attempted with no authenticated client', 'export');
    return { success: false, error: 'Not authenticated' };
  }

  logger.info(`Starting export of ${options.pageIds.length} pages to ${options.outputDir}`, 'export');
  logger.info(`Export formats: ${options.formats.join(', ')}`, 'export');
  logger.info(`Include children: ${options.includeChildren}`, 'export');

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

// Logging IPC handlers
ipcMain.handle('get-logs', () => {
  return logger.getLogs();
});

ipcMain.handle('clear-logs', () => {
  logger.clearLogs();
  logger.info('Logs cleared', 'main');
  return true;
});

// Debug handler to check stored keys
ipcMain.handle('debug-stored-keys', () => {
  const encryptedKey = store.get('notion.apiKey.encrypted', '');
  const legacyKey = store.get('notion.apiKey', '');
  
  logger.info(`Debug - Encrypted key exists: ${!!encryptedKey}`, 'debug');
  logger.info(`Debug - Legacy key exists: ${!!legacyKey}`, 'debug');
  
  if (encryptedKey) {
    try {
      const decrypted = decrypt(encryptedKey as string);
      logger.info(`Debug - Decryption successful: ${!!decrypted}`, 'debug');
    } catch (error) {
      logger.error(`Debug - Decryption failed: ${error}`, 'debug');
    }
  }
  
  return {
    hasEncrypted: !!encryptedKey,
    hasLegacy: !!legacyKey,
    notionClientConnected: !!notionClient
  };
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