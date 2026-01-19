#!/usr/bin/env npx tsx
/**
 * Company-Role Module Generator Script
 *
 * Generates company-role specific interview prep modules from question files
 * with embedded quiz blocks.
 *
 * Usage:
 *   npx tsx scripts/generate-company-role-modules.ts --dry-run
 *   npx tsx scripts/generate-company-role-modules.ts
 *   npx tsx scripts/generate-company-role-modules.ts --company=google --role=software-engineer
 *
 * Options:
 *   --dry-run     Preview without writing files
 *   --company=X   Filter by company slug
 *   --role=X      Filter by role slug
 *   --help        Show help
 */

import * as fs from "fs";
import * as path from "path";

// Paths
const DATA_DIR = path.join(process.cwd(), "data");
const QUESTIONS_DIR = path.join(DATA_DIR, "generated", "questions");
const OUTPUT_DIR = path.join(DATA_DIR, "generated", "modules");

// Types
interface Question {
  company_slug: string;
  role_slug: string;
  question_text: string;
  category: "behavioral" | "technical" | "culture" | "curveball";
  difficulty: "easy" | "medium" | "hard";
  interviewer_intent: string;
  good_answer_traits: string[];
  common_mistakes: string[];
  answer_framework: {
    structure: string;
    key_elements: string[];
    time_allocation?: string;
  };
  tags: string[];
  is_premium: boolean;
  original_id: string;
}

interface QuestionsFile {
  company_slug: string;
  company_name: string;
  role_slug: string;
  role_name: string;
  generated_at: string;
  total_questions: number;
  analysis_data?: {
    source_count: number;
    themes: string[];
    process_insights?: {
      typical_rounds: string;
      timeline: string;
      format: string;
    };
  };
  questions: Question[];
}

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizBlock {
  type: "quiz";
  content: {
    question: string;
    options: QuizOption[];
    explanation: string;
  };
}

interface TextBlock {
  type: "text";
  content: {
    text: string;
  };
}

interface TipBlock {
  type: "tip";
  content: {
    text: string;
  };
}

interface WarningBlock {
  type: "warning";
  content: {
    text: string;
  };
}

interface HeaderBlock {
  type: "header";
  content: {
    text: string;
    level: number;
  };
}

type ContentBlock = QuizBlock | TextBlock | TipBlock | WarningBlock | HeaderBlock;

interface ModuleSection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface CompanyRoleModule {
  slug: string;
  type: "company-role";
  title: string;
  description: string;
  company_slug: string;
  role_slug: string;
  is_premium: boolean;
  display_order: number;
  sections: ModuleSection[];
}

/**
 * Get all question files
 */
function getQuestionFiles(): string[] {
  if (!fs.existsSync(QUESTIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(QUESTIONS_DIR)
    .filter((f) => f.startsWith("questions-") && f.endsWith(".json"))
    .map((f) => path.join(QUESTIONS_DIR, f));
}

/**
 * Load questions from file
 */
function loadQuestions(filePath: string): QuestionsFile | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as QuestionsFile;
  } catch {
    console.error(`  Error loading: ${filePath}`);
    return null;
  }
}

/**
 * Filter questions by category
 */
function filterByCategory(questions: Question[], category: Question["category"]): Question[] {
  return questions.filter((q) => q.category === category);
}

/**
 * Create a quiz block from a question
 */
function createQuizBlock(question: Question): QuizBlock {
  // Generate 3 wrong options based on common mistakes
  const wrongOptions = question.common_mistakes
    .slice(0, 3)
    .map((mistake, index) => ({
      id: String.fromCharCode(98 + index), // b, c, d
      text: transformMistakeToOption(mistake),
      isCorrect: false,
    }));

  // Fill remaining wrong options if needed
  while (wrongOptions.length < 3) {
    wrongOptions.push({
      id: String.fromCharCode(98 + wrongOptions.length),
      text: getGenericWrongOption(wrongOptions.length),
      isCorrect: false,
    });
  }

  // Generate correct option from good answer traits
  const correctText = generateCorrectAnswer(question);

  // Shuffle options
  const allOptions: QuizOption[] = [
    { id: "a", text: correctText, isCorrect: true },
    ...wrongOptions,
  ];

  // Randomize order (deterministic based on question text)
  const shuffled = shuffleOptions(allOptions, question.question_text);

  return {
    type: "quiz",
    content: {
      question: question.question_text,
      options: shuffled,
      explanation: generateExplanation(question),
    },
  };
}

/**
 * Transform a common mistake into a plausible wrong option
 */
function transformMistakeToOption(mistake: string): string {
  // Remove parenthetical content for cleaner options
  const cleaned = mistake.replace(/\([^)]*\)/g, "").trim();

  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Get a generic wrong option as fallback
 */
function getGenericWrongOption(index: number): string {
  const generics = [
    "Focus mainly on technical details without addressing the broader context",
    "Give a generic answer without specific examples",
    "Skip over the reasoning and jump straight to conclusions",
    "Provide a surface-level response without depth",
  ];
  return generics[index] || generics[0] as string;
}

/**
 * Generate correct answer from good answer traits
 */
function generateCorrectAnswer(question: Question): string {
  const traits = question.good_answer_traits.slice(0, 3);
  if (traits.length === 0) {
    return "Demonstrate thoughtful analysis with specific examples";
  }

  // Combine traits into a coherent answer approach
  if (traits.length === 1) {
    return `Focus on demonstrating ${traits[0]?.toLowerCase()}`;
  }

  const firstTraits = traits.slice(0, -1).map((t) => t.toLowerCase()).join(", ");
  const lastTrait = traits[traits.length - 1]?.toLowerCase() || "";

  return `Demonstrate ${firstTraits}, and ${lastTrait}`;
}

/**
 * Generate explanation from interviewer intent
 */
function generateExplanation(question: Question): string {
  // Truncate long explanations
  let explanation = question.interviewer_intent;
  if (explanation.length > 300) {
    explanation = explanation.substring(0, 297) + "...";
  }
  return explanation;
}

/**
 * Deterministically shuffle options based on seed
 */
function shuffleOptions(options: QuizOption[], seed: string): QuizOption[] {
  // Simple deterministic shuffle based on string hash
  const hash = simpleHash(seed);
  const shuffled = [...options];

  // Fisher-Yates shuffle with deterministic random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.abs((hash + i * 31) % (i + 1));
    const temp = shuffled[i];
    const swapWith = shuffled[j];
    if (temp && swapWith) {
      shuffled[i] = swapWith;
      shuffled[j] = temp;
    }
  }

  // Reassign IDs after shuffle
  return shuffled.map((opt, idx) => ({
    ...opt,
    id: String.fromCharCode(97 + idx), // a, b, c, d
  }));
}

/**
 * Simple string hash function
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate behavioral section
 */
function generateBehavioralSection(
  companyName: string,
  roleName: string,
  questions: Question[]
): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Intro text
  blocks.push({
    type: "text",
    content: {
      text: `Behavioral questions at ${companyName} for ${roleName} roles focus on your past experiences and how you handle real-world situations. Use the STAR method (Situation, Task, Action, Result) to structure your responses.`,
    },
  });

  // Select 3-5 questions for quizzes
  const selectedQuestions = questions.slice(0, 5);

  if (selectedQuestions.length > 0) {
    blocks.push({
      type: "tip",
      content: {
        text: `**Key Focus Areas:** ${extractKeyThemes(selectedQuestions).join(", ")}. Prepare specific examples for each area.`,
      },
    });

    // Add quiz blocks
    for (const q of selectedQuestions.slice(0, 4)) {
      blocks.push(createQuizBlock(q));
    }
  }

  return {
    id: "behavioral",
    title: `Behavioral Questions for ${roleName}`,
    blocks,
  };
}

/**
 * Generate technical section
 */
function generateTechnicalSection(
  companyName: string,
  roleName: string,
  questions: Question[]
): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Intro text
  blocks.push({
    type: "text",
    content: {
      text: `Technical interviews at ${companyName} for ${roleName} positions assess your domain expertise and problem-solving abilities. Focus on demonstrating your thought process, not just the final answer.`,
    },
  });

  const selectedQuestions = questions.slice(0, 5);

  if (selectedQuestions.length > 0) {
    // Add a tip about technical preparation
    blocks.push({
      type: "tip",
      content: {
        text: `**Technical Areas to Prepare:** ${extractKeyThemes(selectedQuestions).join(", ")}. Review fundamentals and practice explaining complex concepts clearly.`,
      },
    });

    // Add quiz blocks
    for (const q of selectedQuestions.slice(0, 4)) {
      blocks.push(createQuizBlock(q));
    }
  } else {
    blocks.push({
      type: "text",
      content: {
        text: `Be prepared to discuss your technical experience in depth. Focus on projects where you made significant technical decisions and can explain the tradeoffs involved.`,
      },
    });
  }

  return {
    id: "technical",
    title: `Technical Questions for ${roleName}`,
    blocks,
  };
}

/**
 * Generate culture section
 */
function generateCultureSection(
  companyName: string,
  roleName: string,
  questions: Question[]
): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Intro text
  blocks.push({
    type: "text",
    content: {
      text: `Culture fit questions at ${companyName} evaluate whether you'll thrive in their environment. These questions probe your values, work style, and how you interact with others.`,
    },
  });

  const selectedQuestions = questions.slice(0, 5);

  if (selectedQuestions.length > 0) {
    blocks.push({
      type: "warning",
      content: {
        text: `**Be Authentic:** Interviewers are looking for genuine alignment with ${companyName}'s values. Trying to give "right" answers that don't reflect who you are will often backfire.`,
      },
    });

    // Add quiz blocks
    for (const q of selectedQuestions.slice(0, 3)) {
      blocks.push(createQuizBlock(q));
    }
  }

  return {
    id: "culture",
    title: `Culture Fit Questions for ${roleName}`,
    blocks,
  };
}

/**
 * Generate curveball section
 */
function generateCurveballSection(
  companyName: string,
  roleName: string,
  questions: Question[]
): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Intro text
  blocks.push({
    type: "text",
    content: {
      text: `Curveball questions at ${companyName} test your ability to think on your feet, handle pressure, and approach unfamiliar problems creatively. There's often no "right" answer - interviewers want to see your thought process.`,
    },
  });

  const selectedQuestions = questions.slice(0, 4);

  if (selectedQuestions.length > 0) {
    blocks.push({
      type: "tip",
      content: {
        text: `**Approach:** Think out loud, ask clarifying questions, break down the problem into smaller parts, and don't be afraid to revise your thinking.`,
      },
    });

    // Add quiz blocks
    for (const q of selectedQuestions.slice(0, 3)) {
      blocks.push(createQuizBlock(q));
    }
  }

  return {
    id: "curveball",
    title: `Curveball Questions`,
    blocks,
  };
}

/**
 * Extract key themes from questions
 */
function extractKeyThemes(questions: Question[]): string[] {
  const allTags: string[] = [];
  for (const q of questions) {
    allTags.push(...q.tags);
  }

  // Count and sort tags
  const tagCounts: Record<string, number> = {};
  for (const tag of allTags) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }

  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);
}

/**
 * Format role name for display
 */
function formatRoleName(roleSlug: string): string {
  return roleSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate a company-role module
 */
function generateCompanyRoleModule(questionsFile: QuestionsFile): CompanyRoleModule {
  const { company_slug, company_name, role_slug, role_name, questions } = questionsFile;

  // Group questions by category
  const behavioral = filterByCategory(questions, "behavioral");
  const technical = filterByCategory(questions, "technical");
  const culture = filterByCategory(questions, "culture");
  const curveball = filterByCategory(questions, "curveball");

  const sections: ModuleSection[] = [];

  // Only add sections that have questions
  if (behavioral.length > 0) {
    sections.push(generateBehavioralSection(company_name, role_name, behavioral));
  }

  if (technical.length > 0) {
    sections.push(generateTechnicalSection(company_name, role_name, technical));
  }

  if (culture.length > 0) {
    sections.push(generateCultureSection(company_name, role_name, culture));
  }

  if (curveball.length > 0) {
    sections.push(generateCurveballSection(company_name, role_name, curveball));
  }

  return {
    slug: `company-role-${company_slug}-${role_slug}`,
    type: "company-role",
    title: `${company_name} ${role_name} Interview Practice`,
    description: `Practice for your ${company_name} ${role_name} interview with real questions and interactive quizzes designed to prepare you for success.`,
    company_slug,
    role_slug,
    is_premium: true,
    display_order: 0,
    sections,
  };
}

/**
 * Write module to file
 */
function writeModule(module: CompanyRoleModule, dryRun: boolean): void {
  const outputPath = path.join(OUTPUT_DIR, `${module.slug}.json`);

  if (dryRun) {
    const quizCount = countQuizBlocks(module);
    console.log(`  [DRY-RUN] Would write: ${module.slug} (${quizCount} quiz blocks)`);
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(module, null, 2));
  console.log(`  Written: ${outputPath}`);
}

/**
 * Count quiz blocks in a module
 */
function countQuizBlocks(module: CompanyRoleModule): number {
  let count = 0;
  for (const section of module.sections) {
    for (const block of section.blocks) {
      if (block.type === "quiz") {
        count++;
      }
    }
  }
  return count;
}

/**
 * Print usage help
 */
function printUsage(): void {
  console.log(`
Company-Role Module Generator

Generates company-role specific interview prep modules from question files
with embedded quiz blocks.

Usage:
  npx tsx scripts/generate-company-role-modules.ts [options]

Options:
  --dry-run       Preview what would be generated without writing files
  --company=X     Filter by company slug
  --role=X        Filter by role slug
  --help          Show this help message

Examples:
  npx tsx scripts/generate-company-role-modules.ts --dry-run
  npx tsx scripts/generate-company-role-modules.ts
  npx tsx scripts/generate-company-role-modules.ts --company=google --role=software-engineer

Output:
  Modules are written to data/generated/modules/company-role-{company}-{role}.json
`);
}

/**
 * Main entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const dryRun = args.includes("--dry-run");
  const companyArg = args.find((a) => a.startsWith("--company="));
  const roleArg = args.find((a) => a.startsWith("--role="));
  const targetCompany = companyArg ? companyArg.split("=")[1] : null;
  const targetRole = roleArg ? roleArg.split("=")[1] : null;

  console.log("Company-Role Module Generator");
  console.log("═".repeat(50));
  console.log(`Mode: ${dryRun ? "DRY-RUN (no changes)" : "LIVE"}`);

  if (targetCompany) {
    console.log(`Filter by company: ${targetCompany}`);
  }
  if (targetRole) {
    console.log(`Filter by role: ${targetRole}`);
  }

  // Get all question files
  const questionFiles = getQuestionFiles();
  console.log(`Found ${questionFiles.length} question files`);
  console.log("");

  // Generate modules
  let generated = 0;
  let skipped = 0;
  let totalQuizBlocks = 0;

  for (const filePath of questionFiles) {
    const questionsData = loadQuestions(filePath);
    if (!questionsData) {
      skipped++;
      continue;
    }

    // Apply filters
    if (targetCompany && questionsData.company_slug !== targetCompany) {
      continue;
    }
    if (targetRole && questionsData.role_slug !== targetRole) {
      continue;
    }

    const module = generateCompanyRoleModule(questionsData);
    totalQuizBlocks += countQuizBlocks(module);
    writeModule(module, dryRun);
    generated++;
  }

  console.log("");
  console.log("═".repeat(50));
  console.log(`Generated: ${generated} modules`);
  console.log(`Total quiz blocks: ${totalQuizBlocks}`);
  if (skipped > 0) {
    console.log(`Skipped (errors): ${skipped}`);
  }
  console.log("═".repeat(50));
}

main();
