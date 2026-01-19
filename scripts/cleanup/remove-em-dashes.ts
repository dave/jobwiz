#!/usr/bin/env npx tsx

/**
 * Script to remove em-dash characters (—) from all module JSON files.
 * Replaces em-dashes with space-hyphen-space ( - ).
 *
 * Usage: npx tsx scripts/cleanup/remove-em-dashes.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const MODULES_DIR = path.join(__dirname, '../../data/generated/modules');
const EM_DASH = '—';
const REPLACEMENT = ' - ';

function removeEmDashes(dryRun: boolean): void {
  const files = fs.readdirSync(MODULES_DIR).filter((f) => f.endsWith('.json'));

  let totalFilesModified = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const filePath = path.join(MODULES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Count occurrences of em-dash
    const matches = content.match(new RegExp(EM_DASH, 'g'));
    const count = matches ? matches.length : 0;

    if (count > 0) {
      totalFilesModified++;
      totalReplacements += count;

      console.log(`${file}: Replacing ${count} em-dash(es)`);

      if (!dryRun) {
        const updatedContent = content.split(EM_DASH).join(REPLACEMENT);
        fs.writeFileSync(filePath, updatedContent);
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Files processed: ${files.length}`);
  console.log(`Files modified: ${totalFilesModified}`);
  console.log(`Total em-dashes replaced: ${totalReplacements}`);

  if (dryRun) {
    console.log('\n(Dry run - no changes made)');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('Removing em-dashes from modules...\n');
removeEmDashes(dryRun);
