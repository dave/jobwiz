#!/usr/bin/env ts-node

/**
 * Queries interview questions from generated files or Supabase.
 *
 * Usage:
 *   npm run query-questions -- --company=google --role=software-engineer
 *   npm run query-questions -- --company=google --role=swe --category=behavioral
 *   npm run query-questions -- --company=amazon --role=pm --difficulty=hard
 *   npm run query-questions -- --search="leadership" --limit=10
 */

import * as fs from "fs";
import * as path from "path";
import type { CreateQuestionInput, QuestionCategory, QuestionDifficulty } from "../../src/lib/questions/types";

// ============================================================================
// Types
// ============================================================================

interface QueryConfig {
  company?: string;
  role?: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  search?: string;
  tags?: string[];
  limit: number;
  format: "full" | "summary" | "count";
}

interface QuestionFile {
  company_slug: string;
  company_name: string;
  role_slug: string;
  role_name: string;
  generated_at: string;
  total_questions: number;
  questions: CreateQuestionInput[];
}

// ============================================================================
// Role slug normalization
// ============================================================================

const ROLE_SLUG_MAP: Record<string, string> = {
  swe: "software-engineer",
  pm: "product-manager",
  ds: "data-scientist",
  "software-engineer": "software-engineer",
  "product-manager": "product-manager",
  "data-scientist": "data-scientist",
};

function normalizeRoleSlug(role: string): string {
  return ROLE_SLUG_MAP[role.toLowerCase()] || role.toLowerCase();
}

// ============================================================================
// Query Functions
// ============================================================================

function loadQuestionFiles(outputDir: string): QuestionFile[] {
  const files: QuestionFile[] = [];
  const pattern = /^questions-.*\.json$/;

  if (!fs.existsSync(outputDir)) {
    return files;
  }

  const entries = fs.readdirSync(outputDir);
  for (const entry of entries) {
    if (pattern.test(entry)) {
      const filePath = path.join(outputDir, entry);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content) as QuestionFile;
        files.push(data);
      } catch (e) {
        console.error(`Failed to load ${entry}: ${e}`);
      }
    }
  }

  return files;
}

function filterQuestions(
  questions: CreateQuestionInput[],
  config: QueryConfig
): CreateQuestionInput[] {
  let filtered = questions;

  if (config.category) {
    filtered = filtered.filter((q) => q.category === config.category);
  }

  if (config.difficulty) {
    filtered = filtered.filter((q) => q.difficulty === config.difficulty);
  }

  if (config.tags && config.tags.length > 0) {
    filtered = filtered.filter((q) =>
      config.tags!.some((tag) => q.tags.includes(tag))
    );
  }

  if (config.search) {
    const searchLower = config.search.toLowerCase();
    filtered = filtered.filter(
      (q) =>
        q.question_text.toLowerCase().includes(searchLower) ||
        q.interviewer_intent.toLowerCase().includes(searchLower) ||
        q.tags.some((t) => t.toLowerCase().includes(searchLower))
    );
  }

  return filtered.slice(0, config.limit);
}

function formatQuestion(q: CreateQuestionInput, format: "full" | "summary"): string {
  if (format === "summary") {
    return `[${q.category}/${q.difficulty}] ${q.question_text}`;
  }

  const lines: string[] = [];
  lines.push(`${"=".repeat(80)}`);
  lines.push(`Question: ${q.question_text}`);
  lines.push(`Category: ${q.category} | Difficulty: ${q.difficulty}`);
  lines.push(`Tags: ${q.tags.join(", ")}`);
  lines.push(`Original ID: ${q.original_id || "N/A"}`);
  lines.push("");
  lines.push("INTERVIEWER INTENT:");
  lines.push(q.interviewer_intent);
  lines.push("");
  lines.push("GOOD ANSWER DEMONSTRATES:");
  for (const trait of q.good_answer_traits) {
    lines.push(`  • ${trait}`);
  }
  lines.push("");
  lines.push("COMMON MISTAKES:");
  for (const mistake of q.common_mistakes) {
    lines.push(`  ✗ ${mistake}`);
  }
  lines.push("");
  lines.push("ANSWER FRAMEWORK:");
  lines.push(JSON.stringify(q.answer_framework, null, 2));

  if (q.target_value) {
    lines.push("");
    lines.push(`Target Value: ${q.target_value}`);
  }
  if (q.question_type) {
    lines.push("");
    lines.push(`Question Type: ${q.question_type}`);
  }

  return lines.join("\n");
}

// ============================================================================
// Main Query Function
// ============================================================================

async function queryQuestions(config: QueryConfig) {
  const outputDir = "output";
  console.log("\nQuerying questions...\n");

  // Load all question files
  const files = loadQuestionFiles(outputDir);

  if (files.length === 0) {
    console.log("No question files found in output directory.");
    console.log("Run 'npm run generate-questions' first to generate questions.");
    return;
  }

  // Filter files by company/role if specified
  let relevantFiles = files;
  if (config.company) {
    const companyLower = config.company.toLowerCase();
    relevantFiles = relevantFiles.filter((f) => f.company_slug === companyLower);
  }
  if (config.role) {
    const normalizedRole = normalizeRoleSlug(config.role);
    relevantFiles = relevantFiles.filter((f) => f.role_slug === normalizedRole);
  }

  if (relevantFiles.length === 0) {
    console.log(`No questions found for company=${config.company || "any"} role=${config.role || "any"}`);
    console.log("\nAvailable combinations:");
    for (const f of files) {
      console.log(`  - ${f.company_slug} / ${f.role_slug} (${f.total_questions} questions)`);
    }
    return;
  }

  // Collect and filter questions
  let allQuestions: CreateQuestionInput[] = [];
  for (const f of relevantFiles) {
    allQuestions = allQuestions.concat(f.questions);
  }

  const filtered = filterQuestions(allQuestions, config);

  // Output based on format
  if (config.format === "count") {
    console.log(`Total matching questions: ${filtered.length}`);

    // Group by category
    const byCat: Record<string, number> = {};
    for (const q of filtered) {
      byCat[q.category] = (byCat[q.category] || 0) + 1;
    }
    console.log("\nBy category:");
    for (const [cat, count] of Object.entries(byCat).sort()) {
      console.log(`  ${cat}: ${count}`);
    }

    // Group by difficulty
    const byDiff: Record<string, number> = {};
    for (const q of filtered) {
      byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
    }
    console.log("\nBy difficulty:");
    for (const [diff, count] of Object.entries(byDiff).sort()) {
      console.log(`  ${diff}: ${count}`);
    }

    return;
  }

  console.log(`Found ${filtered.length} matching questions:\n`);

  for (const q of filtered) {
    console.log(formatQuestion(q, config.format));
    console.log("");
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key) {
        argMap[key] = value ?? "true";
      }
    }
  }

  const config: QueryConfig = {
    company: argMap.company,
    role: argMap.role,
    category: argMap.category as QuestionCategory | undefined,
    difficulty: argMap.difficulty as QuestionDifficulty | undefined,
    search: argMap.search,
    tags: argMap.tags?.split(","),
    limit: parseInt(argMap.limit || "50", 10),
    format: (argMap.format as "full" | "summary" | "count") || "summary",
  };

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage:");
    console.log("  npm run query-questions -- [options]");
    console.log("\nOptions:");
    console.log("  --company=SLUG       Filter by company (e.g., google, amazon)");
    console.log("  --role=SLUG          Filter by role (e.g., swe, pm, software-engineer)");
    console.log("  --category=TYPE      Filter by category (behavioral, technical, culture, curveball)");
    console.log("  --difficulty=LEVEL   Filter by difficulty (easy, medium, hard)");
    console.log("  --search=TEXT        Search in question text, intent, or tags");
    console.log("  --tags=TAG1,TAG2     Filter by tags (comma-separated)");
    console.log("  --limit=N            Limit results (default: 50)");
    console.log("  --format=TYPE        Output format: summary, full, count (default: summary)");
    console.log("\nExamples:");
    console.log("  npm run query-questions -- --company=google --role=swe --category=behavioral");
    console.log("  npm run query-questions -- --search=leadership --format=full");
    console.log("  npm run query-questions -- --difficulty=hard --format=count");
    return;
  }

  await queryQuestions(config);
}

// Run when executed directly
const isMain = process.argv[1]?.includes("query-questions");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { queryQuestions };
export type { QueryConfig };
