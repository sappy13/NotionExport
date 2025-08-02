export interface NotionPage {
  id: string;
  title: string;
  url: string;
  parent?: {
    type: string;
    page_id?: string;
    database_id?: string;
  };
  properties: any;
  children: NotionPage[];
  content: string;
  created_time: string;
  last_edited_time: string;
}

export interface ExportConfig {
  outputDir: string;
  formats: ('pdf' | 'docx')[];
  includeSubpages: boolean;
}

export interface ExportResult {
  success: boolean;
  exportedFiles: string[];
  errors: string[];
}