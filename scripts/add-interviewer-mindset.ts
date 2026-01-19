#!/usr/bin/env npx tsx
/**
 * Add "What Interviewers Look For" sections to company modules
 *
 * Extracts interviewer_intent from question files and creates an
 * "Interviewer Mindset" section in each company module.
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
  company_slug?: string;
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
  questions: Question[];
}

const QUESTIONS_DIR = path.join(process.cwd(), 'data/generated/questions');
const MODULES_DIR = path.join(process.cwd(), 'data/generated/modules');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const helpRequested = args.includes('--help');
const companyArg = args.find(a => a.startsWith('--company='));
const specificCompany = companyArg ? companyArg.split('=')[1] : null;

if (helpRequested) {
  console.log(`
Usage: npx tsx scripts/add-interviewer-mindset.ts [options]

Options:
  --dry-run       Show what would be changed without modifying files
  --company=X     Only process a specific company (e.g., --company=google)
  --help          Show this help message

Description:
  Extracts interviewer_intent from question files and creates an
  "Interviewer Mindset" section in each company module.
`);
  process.exit(0);
}

/**
 * Get all question files for a specific company
 */
function getQuestionFilesForCompany(companySlug: string): QuestionFile[] {
  const files = fs.readdirSync(QUESTIONS_DIR);
  const companyFiles = files.filter(f =>
    f.startsWith(`questions-${companySlug}-`) && f.endsWith('.json')
  );

  return companyFiles.map(file => {
    const content = fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8');
    return JSON.parse(content) as QuestionFile;
  });
}

/**
 * Extract unique interviewer intents and group by category
 */
function extractInterviewerInsights(questionFiles: QuestionFile[]): {
  byCategory: Map<string, string[]>;
  topIntents: string[];
  companyName: string;
} {
  const byCategory = new Map<string, string[]>();
  const allIntents: string[] = [];
  let companyName = '';

  for (const qf of questionFiles) {
    if (qf.company_name) {
      companyName = qf.company_name;
    }

    for (const q of qf.questions) {
      if (!q.interviewer_intent) continue;

      // Get first sentence or first 200 chars as the key insight
      const intent = q.interviewer_intent;
      const firstSentence = intent.split(/[.!?]/).filter(s => s.trim())[0]?.trim();
      if (!firstSentence) continue;

      const category = q.category || 'general';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }

      // Store the full intent, not just first sentence
      const existingIntents = byCategory.get(category)!;
      // Avoid duplicates by checking if similar content exists
      const isDuplicate = existingIntents.some(existing =>
        existing.toLowerCase().includes(firstSentence.toLowerCase().slice(0, 50))
      );
      if (!isDuplicate) {
        existingIntents.push(intent);
      }

      allIntents.push(firstSentence);
    }
  }

  // Get unique top intents (first sentence of each unique intent)
  const uniqueIntents = [...new Set(allIntents)].slice(0, 10);

  return { byCategory, topIntents: uniqueIntents, companyName };
}

/**
 * Create the "Interviewer Mindset" section
 */
function createInterviewerMindsetSection(
  companyName: string,
  insights: { byCategory: Map<string, string[]>; topIntents: string[] }
): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Intro text
  blocks.push({
    type: 'header',
    content: {
      text: `What ${companyName} Interviewers Really Look For`,
    }
  });

  blocks.push({
    type: 'text',
    content: {
      text: `Understanding the interviewer's mindset is crucial for interview success. Based on analysis of ${companyName} interview experiences, here's what interviewers are actually evaluating when they ask common questions.`
    }
  });

  // Group insights by category
  const categoryLabels: Record<string, string> = {
    'behavioral': 'Behavioral Questions',
    'technical': 'Technical Questions',
    'culture': 'Culture Fit Questions',
    'curveball': 'Curveball Questions'
  };

  for (const [category, intents] of insights.byCategory) {
    if (intents.length === 0) continue;

    const categoryTitle = categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)} Questions`;

    // Add category header
    blocks.push({
      type: 'text',
      content: {
        text: `**${categoryTitle}**`
      }
    });

    // Take up to 2 intents per category, extract the key insight
    const selectedIntents = intents.slice(0, 2);
    for (const intent of selectedIntents) {
      // Extract the most insightful part - usually the first 2-3 sentences
      const sentences = intent.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      const keyInsight = sentences.slice(0, 2).join(' ').trim();

      if (keyInsight.length > 50) {
        blocks.push({
          type: 'tip',
          content: {
            text: keyInsight
          }
        });
      }
    }
  }

  // Add a summary tip
  if (insights.topIntents.length > 0) {
    blocks.push({
      type: 'text',
      content: {
        text: `**Key Takeaway:** ${companyName} interviewers focus on how you think, not just what you know. Show your reasoning process, acknowledge trade-offs, and demonstrate genuine alignment with company values.`
      }
    });
  }

  return {
    id: 'interviewer-mindset',
    title: 'What Interviewers Look For',
    blocks
  };
}

/**
 * Check if a module already has the interviewer mindset section
 */
function hasInterviewerMindsetSection(module: Module): boolean {
  return module.sections.some(s => s.id === 'interviewer-mindset');
}

/**
 * Add the interviewer mindset section to a module
 */
function addInterviewerMindsetToModule(module: Module, section: ModuleSection): Module {
  // Insert after culture section, or at the beginning if no culture section
  const cultureIndex = module.sections.findIndex(s => s.id === 'culture');
  const insertIndex = cultureIndex !== -1 ? cultureIndex + 1 : 0;

  const newSections = [...module.sections];
  newSections.splice(insertIndex, 0, section);

  return {
    ...module,
    sections: newSections
  };
}

/**
 * Process a single company
 */
function processCompany(companySlug: string): { modified: boolean; blockCount: number } {
  const modulePath = path.join(MODULES_DIR, `company-${companySlug}.json`);

  if (!fs.existsSync(modulePath)) {
    if (!dryRun) {
      console.log(`  Skipping ${companySlug}: No company module found`);
    }
    return { modified: false, blockCount: 0 };
  }

  // Load the module
  const moduleContent = fs.readFileSync(modulePath, 'utf-8');
  const module: Module = JSON.parse(moduleContent);

  // Check if already processed
  if (hasInterviewerMindsetSection(module)) {
    if (!dryRun) {
      console.log(`  Skipping ${companySlug}: Already has interviewer mindset section`);
    }
    return { modified: false, blockCount: 0 };
  }

  // Get question files for this company
  const questionFiles = getQuestionFilesForCompany(companySlug);

  if (questionFiles.length === 0) {
    if (!dryRun) {
      console.log(`  Skipping ${companySlug}: No question files found`);
    }
    return { modified: false, blockCount: 0 };
  }

  // Extract insights
  const insights = extractInterviewerInsights(questionFiles);

  // Use company name from questions or module
  const companyName = insights.companyName || module.title.replace(' Interview Guide', '');

  // Create the section
  const section = createInterviewerMindsetSection(companyName, insights);

  // Add to module
  const updatedModule = addInterviewerMindsetToModule(module, section);

  // Write the updated module
  if (!dryRun) {
    fs.writeFileSync(modulePath, JSON.stringify(updatedModule, null, 2));
    console.log(`  Updated ${companySlug}: Added ${section.blocks.length} blocks`);
  } else {
    console.log(`  Would update ${companySlug}: ${section.blocks.length} blocks to add`);
  }

  return { modified: true, blockCount: section.blocks.length };
}

/**
 * Main function
 */
function main() {
  console.log(dryRun ? '\n=== DRY RUN ===' : '\n=== Adding Interviewer Mindset Sections ===');

  // Get list of companies to process
  let companies: string[];

  if (specificCompany) {
    companies = [specificCompany];
  } else {
    // Get all company modules
    const files = fs.readdirSync(MODULES_DIR);
    companies = files
      .filter(f => f.startsWith('company-') && !f.includes('company-role') && f.endsWith('.json'))
      .map(f => f.replace('company-', '').replace('.json', ''));
  }

  console.log(`\nProcessing ${companies.length} companies...\n`);

  let modifiedCount = 0;
  let totalBlocks = 0;

  for (const company of companies) {
    const result = processCompany(company);
    if (result.modified) {
      modifiedCount++;
      totalBlocks += result.blockCount;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Companies processed: ${companies.length}`);
  console.log(`Modules modified: ${modifiedCount}`);
  console.log(`Total blocks added: ${totalBlocks}`);

  if (dryRun) {
    console.log('\n(Dry run - no files were modified)');
  }
}

main();
