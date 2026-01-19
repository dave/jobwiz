#!/usr/bin/env npx tsx
/**
 * Add "Mistakes to Avoid" sections to role modules
 *
 * Extracts common_mistakes from question files per role and creates a
 * "Mistakes to Avoid" section with warning blocks grouped by category.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ContentBlock {
  type: string;
  content: {
    text?: string;
    title?: string;
    items?: Array<{ id: string; text: string; required?: boolean }>;
    [key: string]: unknown;
  };
}

interface ModuleSection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface Module {
  slug: string;
  type: string;
  title: string;
  description: string;
  role_slug?: string;
  is_premium: boolean;
  display_order: number;
  sections: ModuleSection[];
}

interface Question {
  company_slug: string;
  role_slug: string;
  question_text: string;
  category: string;
  difficulty: string;
  interviewer_intent: string;
  good_answer_traits: string[];
  common_mistakes: string[];
  tags: string[];
}

interface QuestionFile {
  company_slug: string;
  company_name: string;
  role_slug: string;
  role_name: string;
  questions: Question[];
}

const QUESTIONS_DIR = path.join(process.cwd(), 'data/generated/questions');
const MODULES_DIR = path.join(process.cwd(), 'data/generated/modules');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const helpRequested = args.includes('--help');
const roleArg = args.find(a => a.startsWith('--role='));
const specificRole = roleArg ? roleArg.split('=')[1] : null;

if (helpRequested) {
  console.log(`
Usage: npx tsx scripts/add-common-mistakes.ts [options]

Options:
  --dry-run       Show what would be changed without modifying files
  --role=X        Only process a specific role (e.g., --role=software-engineer)
  --help          Show this help message

Description:
  Extracts common_mistakes from question files per role and creates a
  "Mistakes to Avoid" section in each role module with warning blocks.
`);
  process.exit(0);
}

/**
 * Get all question files for a specific role (across all companies)
 */
function getQuestionFilesForRole(roleSlug: string): QuestionFile[] {
  const files = fs.readdirSync(QUESTIONS_DIR);
  const roleFiles = files.filter(f =>
    f.endsWith(`-${roleSlug}.json`) && f.startsWith('questions-')
  );

  return roleFiles.map(file => {
    const content = fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8');
    return JSON.parse(content) as QuestionFile;
  });
}

/**
 * Extract and aggregate common mistakes by category
 */
function extractMistakesByCategory(questionFiles: QuestionFile[]): {
  byCategory: Map<string, Set<string>>;
  roleName: string;
} {
  const byCategory = new Map<string, Set<string>>();
  let roleName = '';

  for (const qf of questionFiles) {
    if (qf.role_name && !roleName) {
      roleName = qf.role_name;
    }

    for (const q of qf.questions) {
      if (!q.common_mistakes || q.common_mistakes.length === 0) continue;

      const category = q.category || 'general';
      if (!byCategory.has(category)) {
        byCategory.set(category, new Set<string>());
      }

      const mistakeSet = byCategory.get(category)!;
      for (const mistake of q.common_mistakes) {
        // Normalize and dedupe mistakes
        const normalized = mistake.trim();
        if (normalized.length > 10 && normalized.length < 200) {
          mistakeSet.add(normalized);
        }
      }
    }
  }

  return { byCategory, roleName };
}

/**
 * Create the "Mistakes to Avoid" section
 */
function createMistakesToAvoidSection(
  roleName: string,
  byCategory: Map<string, Set<string>>
): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Intro header
  blocks.push({
    type: 'header',
    content: {
      text: 'Common Interview Mistakes to Avoid'
    }
  });

  blocks.push({
    type: 'text',
    content: {
      text: `Even strong ${roleName} candidates make these mistakes in interviews. Knowing what to avoid is just as important as knowing what to do.`
    }
  });

  // Category labels for display
  const categoryLabels: Record<string, string> = {
    'behavioral': 'Behavioral Question Mistakes',
    'technical': 'Technical Question Mistakes',
    'culture': 'Culture Fit Mistakes',
    'curveball': 'Curveball Question Mistakes'
  };

  // Process each category
  const categoryOrder = ['behavioral', 'technical', 'culture', 'curveball'];

  for (const category of categoryOrder) {
    const mistakes = byCategory.get(category);
    if (!mistakes || mistakes.size === 0) continue;

    // Category subheader
    const categoryTitle = categoryLabels[category] ||
      `${category.charAt(0).toUpperCase() + category.slice(1)} Mistakes`;

    blocks.push({
      type: 'text',
      content: {
        text: `**${categoryTitle}**`
      }
    });

    // Take top 4 unique mistakes per category to keep section concise
    const topMistakes = Array.from(mistakes).slice(0, 4);

    for (const mistake of topMistakes) {
      blocks.push({
        type: 'warning',
        content: {
          text: mistake
        }
      });
    }
  }

  // Summary tip
  blocks.push({
    type: 'tip',
    content: {
      text: `**Remember:** Interviewers notice patterns. If you catch yourself heading toward one of these mistakes, pause, acknowledge it, and redirect. Self-awareness goes a long way.`
    }
  });

  return {
    id: 'mistakes-to-avoid',
    title: 'Mistakes to Avoid',
    blocks
  };
}

/**
 * Check if a module already has the mistakes section
 */
function hasMistakesSection(module: Module): boolean {
  return module.sections.some(s => s.id === 'mistakes-to-avoid');
}

/**
 * Add the mistakes section to a module
 */
function addMistakesToModule(module: Module, section: ModuleSection): Module {
  // Insert before the last section (usually tips or resources)
  // Or at the end if there's no suitable position
  const insertIndex = Math.max(0, module.sections.length - 1);

  const newSections = [...module.sections];
  newSections.splice(insertIndex, 0, section);

  return {
    ...module,
    sections: newSections
  };
}

/**
 * Get list of unique roles from role modules
 */
function getAllRoles(): string[] {
  const files = fs.readdirSync(MODULES_DIR);
  return files
    .filter(f => f.startsWith('role-') && f.endsWith('.json'))
    .map(f => f.replace('role-', '').replace('.json', ''));
}

/**
 * Process a single role
 */
function processRole(roleSlug: string): { modified: boolean; blockCount: number } {
  const modulePath = path.join(MODULES_DIR, `role-${roleSlug}.json`);

  if (!fs.existsSync(modulePath)) {
    if (!dryRun) {
      console.log(`  Skipping ${roleSlug}: No role module found`);
    }
    return { modified: false, blockCount: 0 };
  }

  // Load the module
  const moduleContent = fs.readFileSync(modulePath, 'utf-8');
  const module: Module = JSON.parse(moduleContent);

  // Check if already processed
  if (hasMistakesSection(module)) {
    if (!dryRun) {
      console.log(`  Skipping ${roleSlug}: Already has mistakes section`);
    }
    return { modified: false, blockCount: 0 };
  }

  // Get question files for this role
  const questionFiles = getQuestionFilesForRole(roleSlug);

  if (questionFiles.length === 0) {
    if (!dryRun) {
      console.log(`  Skipping ${roleSlug}: No question files found`);
    }
    return { modified: false, blockCount: 0 };
  }

  // Extract mistakes by category
  const { byCategory, roleName } = extractMistakesByCategory(questionFiles);

  // Use role name from questions or derive from slug
  const displayName = roleName ||
    roleSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Create the section
  const section = createMistakesToAvoidSection(displayName, byCategory);

  // Add to module
  const updatedModule = addMistakesToModule(module, section);

  // Write the updated module
  if (!dryRun) {
    fs.writeFileSync(modulePath, JSON.stringify(updatedModule, null, 2));
    console.log(`  Updated ${roleSlug}: Added ${section.blocks.length} blocks`);
  } else {
    console.log(`  Would update ${roleSlug}: ${section.blocks.length} blocks to add`);
  }

  return { modified: true, blockCount: section.blocks.length };
}

/**
 * Main function
 */
function main() {
  console.log(dryRun ? '\n=== DRY RUN ===' : '\n=== Adding Mistakes to Avoid Sections ===');

  // Get list of roles to process
  let roles: string[];

  if (specificRole) {
    roles = [specificRole];
  } else {
    roles = getAllRoles();
  }

  console.log(`\nProcessing ${roles.length} roles...\n`);

  let modifiedCount = 0;
  let totalBlocks = 0;

  for (const role of roles) {
    const result = processRole(role);
    if (result.modified) {
      modifiedCount++;
      totalBlocks += result.blockCount;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Roles processed: ${roles.length}`);
  console.log(`Modules modified: ${modifiedCount}`);
  console.log(`Total blocks added: ${totalBlocks}`);

  if (dryRun) {
    console.log('\n(Dry run - no files were modified)');
  }
}

main();
