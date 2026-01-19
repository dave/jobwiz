#!/usr/bin/env npx tsx

/**
 * Script to remove video-intro sections from all modules.
 * These sections contain placeholder video URLs that don't work.
 *
 * Usage: npx tsx scripts/remove-video-sections.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const MODULES_DIR = path.join(__dirname, '../data/generated/modules');

interface Section {
  id: string;
  title: string;
  blocks: unknown[];
}

interface Module {
  slug: string;
  type: string;
  title: string;
  description: string;
  sections: Section[];
  [key: string]: unknown;
}

function removeVideoSections(dryRun: boolean): void {
  const files = fs.readdirSync(MODULES_DIR).filter((f) => f.endsWith('.json'));

  let totalFilesModified = 0;
  let totalSectionsRemoved = 0;

  for (const file of files) {
    const filePath = path.join(MODULES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const module: Module = JSON.parse(content);

    const originalSectionCount = module.sections.length;
    const filteredSections = module.sections.filter(
      (section) => section.id !== 'video-intro'
    );

    const sectionsRemoved = originalSectionCount - filteredSections.length;

    if (sectionsRemoved > 0) {
      totalFilesModified++;
      totalSectionsRemoved += sectionsRemoved;

      console.log(`${file}: Removing ${sectionsRemoved} video-intro section(s)`);

      if (!dryRun) {
        module.sections = filteredSections;
        fs.writeFileSync(filePath, JSON.stringify(module, null, 2) + '\n');
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Files processed: ${files.length}`);
  console.log(`Files modified: ${totalFilesModified}`);
  console.log(`Sections removed: ${totalSectionsRemoved}`);

  if (dryRun) {
    console.log('\n(Dry run - no changes made)');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('Removing video-intro sections from modules...\n');
removeVideoSections(dryRun);
