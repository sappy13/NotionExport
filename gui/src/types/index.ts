export interface NotionPage {
  id: string;
  title: string;
  url: string;
  hasChildren?: boolean;
  children?: NotionPage[];
  parent?: {
    type: string;
    page_id?: string;
    database_id?: string;
  };
  created_time: string;
  last_edited_time: string;
}

export interface ExportOptions {
  pageIds: string[];
  outputDir: string;
  formats: ('pdf' | 'docx')[];
  includeChildren: boolean;
}

export interface ExportProgress {
  completed: number;
  total: number;
  currentPage: string;
}

export interface ElectronAPI {
  getStoredConfig: () => Promise<{ apiKey: string; lastExportDir: string }>;
  saveConfig: (config: { apiKey: string }) => Promise<boolean>;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  searchNotion: (query: string) => Promise<{ success: boolean; pages?: NotionPage[]; error?: string }>;
  getPageChildren: (pageId: string) => Promise<{ success: boolean; children?: NotionPage[]; error?: string }>;
  selectExportDirectory: () => Promise<{ success: boolean; path?: string }>;
  exportPages: (options: ExportOptions) => Promise<{ success: boolean; results?: any[]; totalFiles?: number; error?: string }>;
  onExportProgress: (callback: (progress: ExportProgress) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}