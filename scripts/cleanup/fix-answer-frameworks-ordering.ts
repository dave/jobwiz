#!/usr/bin/env npx tsx

/**
 * Fix ordering in answer-frameworks sections.
 *
 * Current pattern (wrong):
 *   text: **Question Type**
 *   text: Use the **Framework** framework:
 *   checklist
 *   tip
 *   quote: Example: "..."
 *
 * Correct pattern:
 *   text: **Question Type**
 *   quote: Example: "..."  <-- Move quote here
 *   text: Use the **Framework** framework:
 *   checklist
 *   tip
 *
 * Usage: npx tsx scripts/cleanup/fix-answer-frameworks-ordering.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const MODULES_DIR = path.join(__dirname, '../../data/generated/modules');

interface ContentBlock {
  type: string;
  content: Record<string, unknown>;
}

interface Section {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface Module {
  slug: string;
  type: string;
  title: string;
  description: string;
  sections: Section[];
  [key: string]: unknown;
}

function isSubsectionHeader(block: ContentBlock): boolean {
  if (block.type !== 'text') return false;
  const text = block.content.text as string;
  return text?.startsWith('**') && text?.endsWith('**');
}

function isExampleQuote(block: ContentBlock): boolean {
  if (block.type !== 'quote') return false;
  const text = block.content.text as string;
  return text?.startsWith('Example:');
}

function fixAnswerFrameworksSection(section: Section): { fixed: boolean; details: string[] } {
  const blocks = section.blocks;
  const details: string[] = [];
  let fixed = false;

  // Find subsection groups and reorder
  // A subsection starts with a text block containing **Something**
  const newBlocks: ContentBlock[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    // If this is a subsection header (e.g., **Behavioral Questions**)
    if (isSubsectionHeader(block)) {
      // Collect all blocks until the next subsection header or end
      const subsectionBlocks: ContentBlock[] = [block];
      i++;

      while (i < blocks.length && !isSubsectionHeader(blocks[i])) {
        subsectionBlocks.push(blocks[i]);
        i++;
      }

      // Find and move the quote to position 1 (right after header)
      const quoteIndex = subsectionBlocks.findIndex(isExampleQuote);

      if (quoteIndex > 1) {
        // Quote exists and is not already in position 1
        const [quote] = subsectionBlocks.splice(quoteIndex, 1);
        subsectionBlocks.splice(1, 0, quote);
        fixed = true;
        const headerText = (block.content.text as string).replace(/\*\*/g, '');
        details.push(`Moved quote after "${headerText}"`);
      }

      newBlocks.push(...subsectionBlocks);
    } else {
      // Not a subsection header, just add it
      newBlocks.push(block);
      i++;
    }
  }

  section.blocks = newBlocks;
  return { fixed, details };
}

function processModule(filePath: string, dryRun: boolean): { modified: boolean; details: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const module: Module = JSON.parse(content);
  const allDetails: string[] = [];
  let modified = false;

  // Find answer-frameworks section
  const answerFrameworksSection = module.sections.find(s => s.id === 'answer-frameworks');

  if (answerFrameworksSection) {
    const result = fixAnswerFrameworksSection(answerFrameworksSection);
    if (result.fixed) {
      modified = true;
      allDetails.push(...result.details);
    }
  }

  if (modified && !dryRun) {
    fs.writeFileSync(filePath, JSON.stringify(module, null, 2) + '\n');
  }

  return { modified, details: allDetails };
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('Fixing answer-frameworks section ordering...\n');
  if (dryRun) {
    console.log('(Dry run - no changes will be made)\n');
  }

  const files = fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.json'));
  let totalModified = 0;
  let totalFixes = 0;

  for (const file of files) {
    const filePath = path.join(MODULES_DIR, file);
    const result = processModule(filePath, dryRun);

    if (result.modified) {
      totalModified++;
      totalFixes += result.details.length;
      console.log(`${file}:`);
      result.details.forEach(d => console.log(`  - ${d}`));
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Files processed: ${files.length}`);
  console.log(`Files modified: ${totalModified}`);
  console.log(`Total fixes: ${totalFixes}`);

  if (dryRun) {
    console.log('\n(Dry run - no changes made)');
  }
}

main();
