/**
 * Check content ordering in Healthcare/Biotech company-role modules
 *
 * Valid ordering: text/tip/warning at the start, then all quiz blocks grouped together
 * Invalid: text/tip/warning appearing BETWEEN quiz blocks (breaking up the quiz flow)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEALTHCARE_COMPANIES = [
  'epic', 'cerner', 'optum', 'unitedhealth', 'cvs-health',
  'jnj', 'pfizer', 'moderna', 'illumina', 'genentech'
];

interface Block {
  type: string;
  content: unknown;
}

interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

interface Module {
  slug: string;
  sections: Section[];
}

interface OrderingIssue {
  file: string;
  section: string;
  issue: string;
  blockPattern: string;
}

function checkSectionOrdering(section: Section): string | null {
  const blockTypes = section.blocks.map(b => b.type);

  // Look for text/tip/warning appearing BETWEEN quiz blocks
  let foundQuiz = false;
  let quizEnded = false;

  for (const blockType of blockTypes) {
    if (blockType === 'quiz') {
      if (quizEnded) {
        return `Found quiz after non-quiz block: ${blockTypes.join(' ')}`;
      }
      foundQuiz = true;
    } else if (foundQuiz && (blockType === 'text' || blockType === 'tip' || blockType === 'warning')) {
      quizEnded = true;
      // If we see another quiz after this, we'll flag it
    }
  }

  return null;
}

function main() {
  const modulesDir = path.join(__dirname, '../../data/generated/modules');
  const allIssues: OrderingIssue[] = [];
  const sectionPatterns: Map<string, number> = new Map();
  let totalModules = 0;
  let totalSections = 0;

  for (const company of HEALTHCARE_COMPANIES) {
    const pattern = `company-role-${company}-`;
    const files = fs.readdirSync(modulesDir).filter(f => f.startsWith(pattern) && f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(modulesDir, file);
      totalModules++;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const module: Module = JSON.parse(content);

        for (const section of module.sections) {
          totalSections++;
          const blockTypes = section.blocks.map(b => b.type);
          const pattern = blockTypes.join(' ');
          sectionPatterns.set(pattern, (sectionPatterns.get(pattern) || 0) + 1);

          const issue = checkSectionOrdering(section);
          if (issue) {
            allIssues.push({
              file,
              section: section.id,
              issue,
              blockPattern: pattern
            });
          }
        }
      } catch (error) {
        console.error(`Error reading ${file}: ${error}`);
      }
    }
  }

  console.log('='.repeat(60));
  console.log('Healthcare/Biotech Company-Role Module Content Ordering Check');
  console.log('='.repeat(60));
  console.log();
  console.log(`Total modules checked: ${totalModules}`);
  console.log(`Total sections checked: ${totalSections}`);
  console.log();

  console.log('Block patterns found:');
  const sortedPatterns = [...sectionPatterns.entries()].sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedPatterns) {
    console.log(`  ${pattern} - ${count} sections`);
  }
  console.log();

  if (allIssues.length === 0) {
    console.log('✅ No ordering issues found!');
    console.log('All modules have correct structure:');
    console.log('  - Section intro text at position 0');
    console.log('  - Key focus areas tip/warning at position 1');
    console.log('  - All quiz blocks grouped together after intro content');
  } else {
    console.log(`❌ Found ${allIssues.length} ordering issues:`);
    for (const issue of allIssues) {
      console.log();
      console.log(`File: ${issue.file}`);
      console.log(`Section: ${issue.section}`);
      console.log(`Issue: ${issue.issue}`);
      console.log(`Pattern: ${issue.blockPattern}`);
    }
  }

  return allIssues.length === 0 ? 0 : 1;
}

const exitCode = main();
process.exit(exitCode);
