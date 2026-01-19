#!/usr/bin/env npx ts-node

/**
 * Remove role-specific content from Enterprise SaaS company modules
 * Issue #285: Enterprise SaaS batch
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTERPRISE_SAAS_COMPANIES = [
  'salesforce',
  'oracle',
  'sap',
  'workday',
  'servicenow',
  'atlassian',
  'splunk',
  'twilio',
  'hubspot',
  'zendesk',
  'okta',
  'cloudflare',
  'mongodb',
  'elastic',
  'ibm',
  'vmware',
  'slack',
  'zoom',
  'docusign',
];

const MODULES_DIR = path.join(__dirname, '../../data/generated/modules');

interface ContentBlock {
  type: string;
  content: {
    text?: string;
    [key: string]: unknown;
  };
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
  company_slug: string;
  is_premium: boolean;
  display_order: number;
  sections: Section[];
}

function fixInterviewerMindsetSection(section: Section, _companyName: string): boolean {
  let changed = false;

  const newBlocks: ContentBlock[] = [];
  let skipTechnicalSection = false;

  for (const block of section.blocks) {
    // Skip the Technical Questions header and its following tips
    if (block.type === 'text' && block.content.text === '**Technical Questions**') {
      skipTechnicalSection = true;
      changed = true;
      continue;
    }

    // Skip tips that follow Technical Questions section
    if (skipTechnicalSection && block.type === 'tip') {
      const text = block.content.text || '';
      if (text.includes('statistical knowledge') || text.includes('class imbalance')) {
        continue;
      }
    }

    // Reset skip flag when we hit the next section
    if (block.type === 'text' && block.content.text?.startsWith('**') && block.content.text !== '**Technical Questions**') {
      skipTechnicalSection = false;
    }

    // Fix tips with generic role-specific content
    if (block.type === 'tip' && block.content.text) {
      const text = block.content.text;

      // Fix the behavioral questions tip - handle multiple variations
      if (text.includes('System design emphasis, Heavy focus on coding, Behavioral interviews important')) {
        block.content.text = text.replace(
          /candidates commonly face: System design emphasis, Heavy focus on coding, Behavioral interviews important/,
          'candidates commonly face: Behavioral interviews, culture fit assessments, and problem-solving exercises'
        );
        changed = true;
      }

      if (text.includes('System design emphasis, Heavy focus on coding, Multiple interview rounds')) {
        block.content.text = text.replace(
          /candidates commonly face: System design emphasis, Heavy focus on coding, Multiple interview rounds/,
          'candidates commonly face: Behavioral interviews, culture fit assessments, and multiple interview rounds'
        );
        changed = true;
      }

      if (text.includes('System design emphasis, Heavy focus on coding, Culture fit matters')) {
        block.content.text = text.replace(
          /candidates commonly face: System design emphasis, Heavy focus on coding, Culture fit matters/,
          'candidates commonly face: Behavioral interviews, culture fit assessments, and problem-solving exercises'
        );
        changed = true;
      }
    }

    newBlocks.push(block);
  }

  if (changed) {
    section.blocks = newBlocks;
  }

  return changed;
}

function fixProcessSection(section: Section): boolean {
  let changed = false;

  for (const block of section.blocks) {
    if (block.type === 'text' && block.content.text) {
      const text = block.content.text;

      // Fix Format line to be role-neutral - handle multiple variations
      if (text.includes('**Format:** Mix of') && text.includes('technical')) {
        block.content.text = text.replace(
          /\*\*Format:\*\* Mix of ([^,]*), technical,/,
          '**Format:** Mix of $1, role-specific,'
        ).replace(
          /\*\*Format:\*\* Mix of technical,/,
          '**Format:** Mix of role-specific,'
        );
        changed = true;
      }
    }
  }

  return changed;
}

function processModule(filePath: string): { changed: boolean; changes: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const module: Module = JSON.parse(content);
  const changes: string[] = [];

  for (const section of module.sections) {
    if (section.id === 'interviewer-mindset') {
      if (fixInterviewerMindsetSection(section, module.company_slug)) {
        changes.push(`Fixed interviewer-mindset section - removed Technical Questions sub-section and generalized tips`);
      }
    }

    if (section.id === 'process') {
      if (fixProcessSection(section)) {
        changes.push(`Fixed process section - changed 'technical' to 'role-specific' in format`);
      }
    }
  }

  if (changes.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(module, null, 2) + '\n');
  }

  return { changed: changes.length > 0, changes };
}

function main() {
  console.log('Removing role-specific content from Enterprise SaaS company modules...\n');

  let totalFiles = 0;
  let changedFiles = 0;
  const allChanges: { file: string; changes: string[] }[] = [];

  for (const company of ENTERPRISE_SAAS_COMPANIES) {
    const filePath = path.join(MODULES_DIR, `company-${company}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`Warning: ${filePath} not found`);
      continue;
    }

    totalFiles++;
    const result = processModule(filePath);

    if (result.changed) {
      changedFiles++;
      allChanges.push({ file: `company-${company}.json`, changes: result.changes });
      console.log(`✓ Fixed: company-${company}.json`);
      for (const change of result.changes) {
        console.log(`  - ${change}`);
      }
    } else {
      console.log(`○ No changes: company-${company}.json`);
    }
  }

  console.log(`\nSummary: ${changedFiles}/${totalFiles} files changed`);

  // Validate JSON
  console.log('\nValidating JSON...');
  for (const company of ENTERPRISE_SAAS_COMPANIES) {
    const filePath = path.join(MODULES_DIR, `company-${company}.json`);
    if (fs.existsSync(filePath)) {
      try {
        JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`Error: Invalid JSON in ${filePath}`);
        process.exit(1);
      }
    }
  }
  console.log('All JSON files valid.');
}

main();
