import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NotionPage } from '../types';

export class NotionClient {
  private client: Client;
  private n2m: NotionToMarkdown;

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
    this.n2m = new NotionToMarkdown({ notionClient: this.client });
  }

  async getPage(pageId: string): Promise<NotionPage> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    const content = await this.getPageContent(pageId);
    
    return {
      id: pageId,
      title: this.extractTitle(page),
      url: (page as any).url || '',
      parent: (page as any).parent,
      properties: (page as any).properties || {},
      children: [],
      content,
      created_time: (page as any).created_time,
      last_edited_time: (page as any).last_edited_time
    };
  }

  async getPageContent(pageId: string): Promise<string> {
    try {
      const mdBlocks = await this.n2m.pageToMarkdown(pageId);
      return this.n2m.toMarkdownString(mdBlocks).parent;
    } catch (error) {
      console.warn(`Failed to get content for page ${pageId}:`, error);
      return '';
    }
  }

  async getChildPages(pageId: string): Promise<string[]> {
    const children: string[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });

      for (const block of response.results) {
        if ((block as any).type === 'child_page') {
          children.push(block.id);
        }
      }

      cursor = response.next_cursor || undefined;
    } while (cursor);

    return children;
  }

  async getDatabasePages(databaseId: string): Promise<string[]> {
    const pages: string[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100
      });

      pages.push(...response.results.map(page => page.id));
      cursor = response.next_cursor || undefined;
    } while (cursor);

    return pages;
  }

  async buildPageHierarchy(rootId: string, isDatabase = false): Promise<NotionPage> {
    const rootPage = await this.getPage(rootId);
    
    const childPageIds = isDatabase 
      ? await this.getDatabasePages(rootId)
      : await this.getChildPages(rootId);

    rootPage.children = await Promise.all(
      childPageIds.map(async (childId) => {
        try {
          return await this.buildPageHierarchy(childId, false);
        } catch (error) {
          console.warn(`Failed to process child page ${childId}:`, error);
          return null;
        }
      })
    ).then(children => children.filter(child => child !== null) as NotionPage[]);

    return rootPage;
  }

  private extractTitle(page: any): string {
    if (page.properties) {
      const titleProperty = Object.values(page.properties).find(
        (prop: any) => prop.type === 'title'
      ) as any;
      
      if (titleProperty?.title?.length > 0) {
        return titleProperty.title[0].plain_text;
      }
    }

    if ((page as any).child_page?.title) {
      return (page as any).child_page.title;
    }

    return 'Untitled';
  }
}