import { NotionClient } from './notion-client';
import { FolderBuilder } from './folder-builder';
import { PDFExporter } from '../exporters/pdf-exporter';
import { DocxExporter } from '../exporters/docx-exporter';
import { NotionPage, ExportConfig, ExportResult } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';

export class NotionExporter {
  private notionClient: NotionClient;
  private folderBuilder: FolderBuilder;
  private pdfExporter: PDFExporter;
  private docxExporter: DocxExporter;

  constructor(apiKey: string) {
    this.notionClient = new NotionClient(apiKey);
    this.folderBuilder = new FolderBuilder();
    this.pdfExporter = new PDFExporter();
    this.docxExporter = new DocxExporter();
  }

  async exportPage(pageId: string, config: ExportConfig): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      exportedFiles: [],
      errors: []
    };

    try {
      console.log(`Fetching page hierarchy for ${pageId}...`);
      const rootPage = await this.notionClient.buildPageHierarchy(pageId);
      
      console.log(`Creating folder structure in ${config.outputDir}...`);
      await fs.ensureDir(config.outputDir);
      
      if (config.includeSubpages) {
        await this.folderBuilder.createHierarchicalStructure(rootPage, config.outputDir);
      } else {
        await this.folderBuilder.createFlatStructure([rootPage], config.outputDir);
      }

      console.log('Exporting to requested formats...');
      
      if (config.formats.includes('pdf')) {
        console.log('Exporting to PDF...');
        const pdfFiles = config.includeSubpages
          ? await this.pdfExporter.exportPageHierarchy(rootPage, config.outputDir)
          : [await this.pdfExporter.exportPage(rootPage, config.outputDir)];
        
        result.exportedFiles.push(...pdfFiles);
      }

      if (config.formats.includes('docx')) {
        console.log('Exporting to DOCX...');
        const docxFiles = config.includeSubpages
          ? await this.docxExporter.exportPageHierarchy(rootPage, config.outputDir)
          : [await this.docxExporter.exportPage(rootPage, config.outputDir)];
        
        result.exportedFiles.push(...docxFiles);
      }

      result.success = true;
      console.log(`Export completed successfully! ${result.exportedFiles.length} files created.`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error('Export failed:', errorMessage);
    }

    return result;
  }

  async exportDatabase(databaseId: string, config: ExportConfig): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      exportedFiles: [],
      errors: []
    };

    try {
      console.log(`Fetching database pages for ${databaseId}...`);
      const pageIds = await this.notionClient.getDatabasePages(databaseId);
      
      console.log(`Found ${pageIds.length} pages in database`);
      
      console.log(`Creating folder structure in ${config.outputDir}...`);
      await fs.ensureDir(config.outputDir);

      for (let i = 0; i < pageIds.length; i++) {
        const pageId = pageIds[i];
        console.log(`Processing page ${i + 1}/${pageIds.length}: ${pageId}`);
        
        try {
          const page = await this.notionClient.getPage(pageId);
          const sanitizedTitle = this.sanitizeFileName(page.title);
          const pageOutputDir = path.join(config.outputDir, sanitizedTitle);
          
          await fs.ensureDir(pageOutputDir);
          
          const markdownPath = path.join(pageOutputDir, 'content.md');
          await fs.writeFile(markdownPath, page.content);
          
          if (config.formats.includes('pdf')) {
            const pdfPath = await this.pdfExporter.exportPage(page, pageOutputDir);
            result.exportedFiles.push(pdfPath);
          }

          if (config.formats.includes('docx')) {
            const docxPath = await this.docxExporter.exportPage(page, pageOutputDir);
            result.exportedFiles.push(docxPath);
          }
          
        } catch (error) {
          const errorMessage = `Failed to process page ${pageId}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMessage);
          console.warn(errorMessage);
        }
      }

      result.success = result.exportedFiles.length > 0;
      console.log(`Database export completed! ${result.exportedFiles.length} files created.`);
      
      if (result.errors.length > 0) {
        console.log(`${result.errors.length} errors occurred during export.`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error('Database export failed:', errorMessage);
    }

    return result;
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
}