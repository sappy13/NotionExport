import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getStoredConfig: () => ipcRenderer.invoke('get-stored-config'),
  saveConfig: (config: { apiKey: string }) => ipcRenderer.invoke('save-config', config),
  testConnection: () => ipcRenderer.invoke('test-connection'),

  // Notion browsing
  searchNotion: (query: string) => ipcRenderer.invoke('search-notion', query),
  getPageChildren: (pageId: string) => ipcRenderer.invoke('get-page-children', pageId),

  // Export
  selectExportDirectory: () => ipcRenderer.invoke('select-export-directory'),
  exportPages: (options: {
    pageIds: string[];
    outputDir: string;
    formats: ('pdf' | 'docx')[];
    includeChildren: boolean;
  }) => ipcRenderer.invoke('export-pages', options),

  // Event listeners
  onExportProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('export-progress', (_, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('export-progress');
  },
});