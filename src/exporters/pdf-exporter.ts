import * as fs from 'fs-extra';
import * as path from 'path';
import puppeteer from 'puppeteer';
import MarkdownIt from 'markdown-it';
import { NotionPage } from '../types';

export class PDFExporter {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true
    });
  }

  async exportPage(page: NotionPage, outputPath: string): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const browserPage = await browser.newPage();
      
      const html = this.generateHTML(page);
      await browserPage.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfPath = path.join(outputPath, `${this.sanitizeFileName(page.title)}.pdf`);
      await fs.ensureDir(path.dirname(pdfPath));
      
      await browserPage.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });

      return pdfPath;
    } finally {
      await browser.close();
    }
  }

  async exportPageHierarchy(rootPage: NotionPage, baseOutputPath: string): Promise<string[]> {
    const exportedFiles: string[] = [];
    
    const exportRecursive = async (page: NotionPage, currentPath: string): Promise<void> => {
      const sanitizedTitle = this.sanitizeFileName(page.title);
      const pagePath = path.join(currentPath, sanitizedTitle);
      
      const pdfPath = await this.exportPage(page, pagePath);
      exportedFiles.push(pdfPath);

      for (const child of page.children) {
        await exportRecursive(child, pagePath);
      }
    };

    await exportRecursive(rootPage, baseOutputPath);
    return exportedFiles;
  }

  private generateHTML(page: NotionPage): string {
    const htmlContent = this.md.render(page.content);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${page.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }
        h1 {
            border-bottom: 2px solid #eee;
            padding-bottom: 0.5rem;
        }
        code {
            background-color: #f4f4f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
        pre {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #dfe2e5;
            padding-left: 1rem;
            margin-left: 0;
            color: #6a737d;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
        }
        th, td {
            border: 1px solid #dfe2e5;
            padding: 0.5rem;
            text-align: left;
        }
        th {
            background-color: #f6f8fa;
            font-weight: 600;
        }
        .metadata {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 2rem;
            font-size: 0.9em;
            color: #6a737d;
        }
    </style>
</head>
<body>
    <div class="metadata">
        <strong>Page:</strong> ${page.title}<br>
        <strong>ID:</strong> ${page.id}<br>
        <strong>Created:</strong> ${new Date(page.created_time).toLocaleString()}<br>
        <strong>Last Modified:</strong> ${new Date(page.last_edited_time).toLocaleString()}
    </div>
    
    <h1>${page.title}</h1>
    ${htmlContent}
</body>
</html>`;
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
}