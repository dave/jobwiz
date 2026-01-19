#!/usr/bin/env npx tsx
/**
 * Add "How to Structure Your Answers" sections to role modules
 *
 * Extracts answer_framework from question files per role and creates a
 * section with STAR breakdowns, time allocation tips, and example frameworks.
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

// Answer framework structures vary by category
interface BehavioralFramework {
  structure: string;
  key_elements: string[];
  time_allocation: string;
}

interface TechnicalFramework {
  approach: string;
  key_elements: string[];
  follow_up_prep: string;
}

interface CultureFramework {
  authenticity_check: string;
  key_elements: string[];
  red_flags_to_avoid: string;
}

interface CurveballFramework {
  approach: string;
  composure_tip: string;
  key_elements: string[];
}

type AnswerFramework = BehavioralFramework | TechnicalFramework | CultureFramework | CurveballFramework;

interface Question {
  company_slug: string;
  role_slug: string;
  question_text: string;
  category: string;
  difficulty: string;
  answer_framework: AnswerFramework;
  tags: string[];
}

/**
 * Get the framework name/structure from varying formats
 */
function getFrameworkName(framework: AnswerFramework, category: string): string | null {
  if ('structure' in framework && framework.structure) {
    return framework.structure;
  }
  if ('approach' in framework && framework.approach) {
    return framework.approach;
  }
  // For culture questions, create a descriptive name
  if ('authenticity_check' in framework && framework.authenticity_check) {
    return `Authenticity-First`;
  }
  return null;
}

/**
 * Get additional tips from the framework based on category
 */
function getAdditionalTip(framework: AnswerFramework, category: string): string | null {
  if ('time_allocation' in framework && framework.time_allocation) {
    return `**Time allocation:** ${framework.time_allocation}`;
  }
  if ('follow_up_prep' in framework && framework.follow_up_prep) {
    return `**Be ready for follow-ups:** ${framework.follow_up_prep}`;
  }
  if ('authenticity_check' in framework && framework.authenticity_check) {
    return `**Authenticity check:** ${framework.authenticity_check}`;
  }
  if ('composure_tip' in framework && framework.composure_tip) {
    return `**Stay composed:** ${framework.composure_tip}`;
  }
  if ('red_flags_to_avoid' in framework && framework.red_flags_to_avoid) {
    return `**Avoid:** ${framework.red_flags_to_avoid}`;
  }
  return null;
}

interface QuestionFile {
  company_slug: string;
  company_name: string;
  role_slug: string;
  role_name: string;
  questions: Question[];
}

interface FrameworkByCategory {
  category: string;
  structures: Map<string, {
    count: number;
    keyElements: Set<string>;
    additionalTips: Set<string>;
    exampleQuestion: string;
  }>;
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
Usage: npx tsx scripts/add-answer-frameworks.ts [options]

Options:
  --dry-run       Show what would be changed without modifying files
  --role=X        Only process a specific role (e.g., --role=software-engineer)
  --help          Show this help message

Description:
  Extracts answer_framework from question files per role and creates a
  "How to Structure Your Answers" section in each role module with STAR
  breakdowns, time allocation tips, and example frameworks.
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
 * Extract and aggregate answer frameworks by category
 */
function extractFrameworksByCategory(questionFiles: QuestionFile[]): {
  byCategory: Map<string, FrameworkByCategory>;
  roleName: string;
} {
  const byCategory = new Map<string, FrameworkByCategory>();
  let roleName = '';

  for (const qf of questionFiles) {
    if (qf.role_name && !roleName) {
      roleName = qf.role_name;
    }

    for (const q of qf.questions) {
      if (!q.answer_framework) continue;

      const category = q.category || 'general';
      const frameworkName = getFrameworkName(q.answer_framework, category);

      if (!frameworkName) continue;

      if (!byCategory.has(category)) {
        byCategory.set(category, {
          category,
          structures: new Map()
        });
      }

      const categoryData = byCategory.get(category)!;

      if (!categoryData.structures.has(frameworkName)) {
        categoryData.structures.set(frameworkName, {
          count: 0,
          keyElements: new Set(),
          additionalTips: new Set(),
          exampleQuestion: q.question_text
        });
      }

      const structureData = categoryData.structures.get(frameworkName)!;
      structureData.count++;

      // Aggregate key elements
      if ('key_elements' in q.answer_framework && q.answer_framework.key_elements) {
        for (const element of q.answer_framework.key_elements) {
          structureData.keyElements.add(element);
        }
      }

      // Aggregate additional tips (time allocation, follow-up prep, etc.)
      const tip = getAdditionalTip(q.answer_framework, category);
      if (tip) {
        structureData.additionalTips.add(tip);
      }
    }
  }

  return { byCategory, roleName };
}

/**
 * Get the most common framework structure for a category
 */
function getMostCommonStructure(categoryData: FrameworkByCategory): {
  name: string;
  keyElements: string[];
  additionalTip: string;
  exampleQuestion: string;
} | null {
  let maxCount = 0;
  let mostCommon: {
    name: string;
    keyElements: string[];
    additionalTip: string;
    exampleQuestion: string;
  } | null = null;

  for (const [name, data] of categoryData.structures) {
    if (data.count > maxCount) {
      maxCount = data.count;
      mostCommon = {
        name,
        keyElements: Array.from(data.keyElements).slice(0, 6), // Top 6 elements
        additionalTip: Array.from(data.additionalTips)[0] || '',
        exampleQuestion: data.exampleQuestion
      };
    }
  }

  return mostCommon;
}

/**
 * Create the "How to Structure Your Answers" section
 */
function createAnswerFrameworksSection(
  roleName: string,
  byCategory: Map<string, FrameworkByCategory>
): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Intro header
  blocks.push({
    type: 'header',
    content: {
      text: 'How to Structure Your Answers'
    }
  });

  blocks.push({
    type: 'text',
    content: {
      text: `Great ${roleName} interview answers follow proven structures. These frameworks help you give complete, compelling responses that cover everything interviewers want to hear.`
    }
  });

  blocks.push({
    type: 'tip',
    content: {
      text: `**Pro tip:** Don't memorize scripts. Learn these frameworks so you can adapt them to any question. Interviewers can tell when answers are rehearsed word-for-word.`
    }
  });

  // Category labels for display
  const categoryLabels: Record<string, string> = {
    'behavioral': 'Behavioral Questions',
    'technical': 'Technical Questions',
    'culture': 'Culture Fit Questions',
    'curveball': 'Curveball & Estimation Questions'
  };

  // Process each category
  const categoryOrder = ['behavioral', 'technical', 'culture', 'curveball'];

  for (const category of categoryOrder) {
    const categoryData = byCategory.get(category);
    if (!categoryData || categoryData.structures.size === 0) continue;

    const mostCommon = getMostCommonStructure(categoryData);
    if (!mostCommon) continue;

    // Category subheader
    const categoryTitle = categoryLabels[category] ||
      `${category.charAt(0).toUpperCase() + category.slice(1)} Questions`;

    blocks.push({
      type: 'text',
      content: {
        text: `**${categoryTitle}**`
      }
    });

    // Framework name and description
    blocks.push({
      type: 'text',
      content: {
        text: `Use the **${mostCommon.name}** framework:`
      }
    });

    // Key elements as a checklist
    if (mostCommon.keyElements.length > 0) {
      blocks.push({
        type: 'checklist',
        content: {
          title: 'Key Elements to Cover',
          items: mostCommon.keyElements.map((element, idx) => ({
            id: `${category}-elem-${idx}`,
            text: element,
            required: idx < 3 // First 3 are required
          }))
        }
      });
    }

    // Additional tip (time allocation, follow-up prep, etc.)
    if (mostCommon.additionalTip) {
      blocks.push({
        type: 'tip',
        content: {
          text: mostCommon.additionalTip
        }
      });
    }

    // Example question
    if (mostCommon.exampleQuestion) {
      blocks.push({
        type: 'quote',
        content: {
          text: `Example: "${mostCommon.exampleQuestion}"`
        }
      });
    }
  }

  // Final summary
  blocks.push({
    type: 'text',
    content: {
      text: `**Remember:** The best answers are specific, structured, and show self-awareness. Use these frameworks as guides, but adapt them to your actual experiences.`
    }
  });

  return {
    id: 'answer-frameworks',
    title: 'How to Structure Your Answers',
    blocks
  };
}

/**
 * Check if a module already has the answer frameworks section
 */
function hasAnswerFrameworksSection(module: Module): boolean {
  return module.sections.some(s => s.id === 'answer-frameworks');
}

/**
 * Add the answer frameworks section to a module
 */
function addFrameworksToModule(module: Module, section: ModuleSection): Module {
  // Find the best position - after overview/format, before competencies or mistakes
  let insertIndex = 2; // Default after first 2 sections

  for (let i = 0; i < module.sections.length; i++) {
    const sectionId = module.sections[i]?.id;
    if (sectionId === 'competencies' || sectionId === 'mistakes-to-avoid') {
      insertIndex = i;
      break;
    }
  }

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
  if (hasAnswerFrameworksSection(module)) {
    if (!dryRun) {
      console.log(`  Skipping ${roleSlug}: Already has answer frameworks section`);
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

  // Extract frameworks by category
  const { byCategory, roleName } = extractFrameworksByCategory(questionFiles);

  // Use role name from questions or derive from slug
  const displayName = roleName ||
    roleSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Create the section
  const section = createAnswerFrameworksSection(displayName, byCategory);

  // Add to module
  const updatedModule = addFrameworksToModule(module, section);

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
  console.log(dryRun ? '\n=== DRY RUN ===' : '\n=== Adding Answer Frameworks Sections ===');

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
