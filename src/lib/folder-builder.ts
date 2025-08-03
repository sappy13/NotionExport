import * as fs from 'fs-extra';
import * as path from 'path';
import { NotionPage } from '../types';

export class FolderBuilder {
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  async createHierarchicalStructure(
    rootPage: NotionPage,
    baseDir: string,
    currentPath: string = ''
  ): Promise<string[]> {
    const createdPaths: string[] = [];
    const sanitizedTitle = this.sanitizeFileName(rootPage.title);
    const pagePath = path.join(baseDir, currentPath, sanitizedTitle);

    await fs.ensureDir(pagePath);
    createdPaths.push(pagePath);

    const markdownPath = path.join(pagePath, 'content.md');
    const content = rootPage.content || '';
    await fs.writeFile(markdownPath, content);

    const metadataPath = path.join(pagePath, 'metadata.json');
    const metadata = {
      id: rootPage.id,
      title: rootPage.title,
      url: rootPage.url,
      created_time: rootPage.created_time,
      last_edited_time: rootPage.last_edited_time,
      properties: rootPage.properties
    };
    await fs.writeJSON(metadataPath, metadata, { spaces: 2 });

    for (const child of rootPage.children) {
      const childPaths = await this.createHierarchicalStructure(
        child,
        baseDir,
        path.join(currentPath, sanitizedTitle)
      );
      createdPaths.push(...childPaths);
    }

    return createdPaths;
  }

  async createFlatStructure(pages: NotionPage[], baseDir: string): Promise<string[]> {
    const createdPaths: string[] = [];
    
    const flattenPages = (page: NotionPage): NotionPage[] => {
      return [page, ...page.children.flatMap(child => flattenPages(child))];
    };

    const allPages = pages.flatMap(page => flattenPages(page));

    for (const page of allPages) {
      const sanitizedTitle = this.sanitizeFileName(page.title);
      const pagePath = path.join(baseDir, sanitizedTitle);
      
      await fs.ensureDir(pagePath);
      createdPaths.push(pagePath);

      const markdownPath = path.join(pagePath, 'content.md');
      const content = page.content || '';
      await fs.writeFile(markdownPath, content);

      const metadataPath = path.join(pagePath, 'metadata.json');
      const metadata = {
        id: page.id,
        title: page.title,
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        properties: page.properties
      };
      await fs.writeJSON(metadataPath, metadata, { spaces: 2 });
    }

    return createdPaths;
  }
}