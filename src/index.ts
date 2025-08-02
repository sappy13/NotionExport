#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NotionExporter } from './lib/exporter';
import { ExportConfig } from './types';

dotenv.config();

const program = new Command();

program
  .name('notion-export')
  .description('Export Notion content to hierarchical folder structure with PDF and DOCX formats')
  .version('1.0.0');

program
  .command('page')
  .description('Export a single Notion page and its subpages')
  .requiredOption('-p, --page-id <id>', 'Notion page ID to export')
  .option('-o, --output <dir>', 'Output directory', './exports')
  .option('-f, --formats <formats>', 'Export formats (pdf,docx)', 'pdf,docx')
  .option('--no-subpages', 'Exclude subpages from export')
  .option('-k, --api-key <key>', 'Notion API key (or set NOTION_API_KEY env var)')
  .action(async (options) => {
    const apiKey = options.apiKey || process.env.NOTION_API_KEY;
    
    if (!apiKey) {
      console.error('Error: Notion API key is required. Set NOTION_API_KEY environment variable or use --api-key option.');
      process.exit(1);
    }

    const config: ExportConfig = {
      outputDir: path.resolve(options.output),
      formats: options.formats.split(',').map((f: string) => f.trim()),
      includeSubpages: options.subpages
    };

    console.log('Starting Notion page export...');
    console.log(`Page ID: ${options.pageId}`);
    console.log(`Output directory: ${config.outputDir}`);
    console.log(`Formats: ${config.formats.join(', ')}`);
    console.log(`Include subpages: ${config.includeSubpages}`);
    console.log('');

    const exporter = new NotionExporter(apiKey);
    const result = await exporter.exportPage(options.pageId, config);

    if (result.success) {
      console.log('\n✅ Export completed successfully!');
      console.log(`📁 Files created: ${result.exportedFiles.length}`);
      console.log(`📂 Output location: ${config.outputDir}`);
    } else {
      console.log('\n❌ Export failed!');
      result.errors.forEach(error => console.log(`   ${error}`));
      process.exit(1);
    }
  });

program
  .command('database')
  .description('Export all pages from a Notion database')
  .requiredOption('-d, --database-id <id>', 'Notion database ID to export')
  .option('-o, --output <dir>', 'Output directory', './exports')
  .option('-f, --formats <formats>', 'Export formats (pdf,docx)', 'pdf,docx')
  .option('-k, --api-key <key>', 'Notion API key (or set NOTION_API_KEY env var)')
  .action(async (options) => {
    const apiKey = options.apiKey || process.env.NOTION_API_KEY;
    
    if (!apiKey) {
      console.error('Error: Notion API key is required. Set NOTION_API_KEY environment variable or use --api-key option.');
      process.exit(1);
    }

    const config: ExportConfig = {
      outputDir: path.resolve(options.output),
      formats: options.formats.split(',').map((f: string) => f.trim()),
      includeSubpages: false
    };

    console.log('Starting Notion database export...');
    console.log(`Database ID: ${options.databaseId}`);
    console.log(`Output directory: ${config.outputDir}`);
    console.log(`Formats: ${config.formats.join(', ')}`);
    console.log('');

    const exporter = new NotionExporter(apiKey);
    const result = await exporter.exportDatabase(options.databaseId, config);

    if (result.success) {
      console.log('\n✅ Export completed successfully!');
      console.log(`📁 Files created: ${result.exportedFiles.length}`);
      console.log(`📂 Output location: ${config.outputDir}`);
      
      if (result.errors.length > 0) {
        console.log(`⚠️  Warnings: ${result.errors.length} pages failed to export`);
      }
    } else {
      console.log('\n❌ Export failed!');
      result.errors.forEach(error => console.log(`   ${error}`));
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Interactive setup for Notion API credentials')
  .action(() => {
    console.log('🔧 Notion Export Setup');
    console.log('');
    console.log('To use this tool, you need a Notion integration token.');
    console.log('');
    console.log('Steps to get your token:');
    console.log('1. Go to https://www.notion.so/my-integrations');
    console.log('2. Click "New integration"');
    console.log('3. Give it a name and select your workspace');
    console.log('4. Copy the "Internal Integration Token"');
    console.log('5. Share your pages/databases with the integration');
    console.log('');
    console.log('Then either:');
    console.log('- Set the NOTION_API_KEY environment variable');
    console.log('- Use the --api-key option with commands');
    console.log('- Create a .env file with NOTION_API_KEY=your_token');
    console.log('');
    console.log('Example usage:');
    console.log('  notion-export page --page-id abc123 --output ./my-export');
    console.log('  notion-export database --database-id def456 --formats pdf');
  });

if (process.argv.length <= 2) {
  program.help();
}

program.parse();