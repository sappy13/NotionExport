import * as fs from 'fs-extra';
import * as path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from 'docx';
import MarkdownIt from 'markdown-it';
import { NotionPage } from '../types';

export class DocxExporter {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true
    });
  }

  async exportPage(page: NotionPage, outputPath: string): Promise<string> {
    const docxPath = path.join(outputPath, `${this.sanitizeFileName(page.title)}.docx`);
    await fs.ensureDir(path.dirname(docxPath));

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: page.title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Page ID: ${page.id}`,
                size: 20,
                color: "666666",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Created: ${new Date(page.created_time).toLocaleString()}`,
                size: 20,
                color: "666666",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Last Modified: ${new Date(page.last_edited_time).toLocaleString()}`,
                size: 20,
                color: "666666",
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          ...this.parseMarkdownToDocx(page.content),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(docxPath, buffer);

    return docxPath;
  }

  async exportPageHierarchy(rootPage: NotionPage, baseOutputPath: string): Promise<string[]> {
    const exportedFiles: string[] = [];
    
    const exportRecursive = async (page: NotionPage, currentPath: string): Promise<void> => {
      const sanitizedTitle = this.sanitizeFileName(page.title);
      const pagePath = path.join(currentPath, sanitizedTitle);
      
      const docxPath = await this.exportPage(page, pagePath);
      exportedFiles.push(docxPath);

      for (const child of page.children) {
        await exportRecursive(child, pagePath);
      }
    };

    await exportRecursive(rootPage, baseOutputPath);
    return exportedFiles;
  }

  private parseMarkdownToDocx(markdown: string): Paragraph[] {
    const tokens = this.md.parse(markdown, {});
    const paragraphs: Paragraph[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      switch (token.type) {
        case 'heading_open':
          const headingContent = tokens[i + 1];
          if (headingContent && headingContent.type === 'inline') {
            const level = this.getHeadingLevel(token.tag);
            paragraphs.push(new Paragraph({
              text: headingContent.content,
              heading: level,
            }));
          }
          i += 2;
          break;

        case 'paragraph_open':
          const paragraphContent = tokens[i + 1];
          if (paragraphContent && paragraphContent.type === 'inline') {
            paragraphs.push(new Paragraph({
              children: this.parseInlineContent(paragraphContent.content),
            }));
          }
          i += 2;
          break;

        case 'code_block':
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: token.content,
                font: "Courier New",
                size: 20,
              }),
            ],
          }));
          break;

        case 'blockquote_open':
          const quoteContent = this.extractBlockquoteContent(tokens, i);
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: quoteContent.text,
                italics: true,
                color: "666666",
              }),
            ],
          }));
          i = quoteContent.endIndex;
          break;

        case 'bullet_list_open':
        case 'ordered_list_open':
          const listItems = this.extractListItems(tokens, i);
          listItems.items.forEach(item => {
            paragraphs.push(new Paragraph({
              children: [
                new TextRun({
                  text: `• ${item}`,
                }),
              ],
            }));
          });
          i = listItems.endIndex;
          break;

        case 'hr':
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: "───────────────────────────────────────",
                color: "CCCCCC",
              }),
            ],
          }));
          break;
      }
    }

    return paragraphs;
  }

  private parseInlineContent(content: string): TextRun[] {
    const runs: TextRun[] = [];
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/);
    
    parts.forEach(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(new TextRun({
          text: part.slice(2, -2),
          bold: true,
        }));
      } else if (part.startsWith('*') && part.endsWith('*')) {
        runs.push(new TextRun({
          text: part.slice(1, -1),
          italics: true,
        }));
      } else if (part.startsWith('`') && part.endsWith('`')) {
        runs.push(new TextRun({
          text: part.slice(1, -1),
          font: "Courier New",
        }));
      } else if (part.match(/\[.*?\]\(.*?\)/)) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          runs.push(new TextRun({
            text: match[1],
            color: "0066CC",
            underline: {},
          }));
        }
      } else if (part.trim()) {
        runs.push(new TextRun({
          text: part,
        }));
      }
    });

    return runs.length > 0 ? runs : [new TextRun({ text: content })];
  }

  private getHeadingLevel(tag: string): HeadingLevel {
    switch (tag) {
      case 'h1': return HeadingLevel.HEADING_1;
      case 'h2': return HeadingLevel.HEADING_2;
      case 'h3': return HeadingLevel.HEADING_3;
      case 'h4': return HeadingLevel.HEADING_4;
      case 'h5': return HeadingLevel.HEADING_5;
      case 'h6': return HeadingLevel.HEADING_6;
      default: return HeadingLevel.HEADING_1;
    }
  }

  private extractBlockquoteContent(tokens: any[], startIndex: number): { text: string; endIndex: number } {
    let text = '';
    let i = startIndex + 1;
    
    while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
      if (tokens[i].type === 'inline') {
        text += tokens[i].content + ' ';
      }
      i++;
    }
    
    return { text: text.trim(), endIndex: i };
  }

  private extractListItems(tokens: any[], startIndex: number): { items: string[]; endIndex: number } {
    const items: string[] = [];
    let i = startIndex + 1;
    
    while (i < tokens.length && !tokens[i].type.includes('_list_close')) {
      if (tokens[i].type === 'inline') {
        items.push(tokens[i].content);
      }
      i++;
    }
    
    return { items, endIndex: i };
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
}