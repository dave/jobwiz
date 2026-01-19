#!/usr/bin/env npx tsx
/**
 * Content Loader Script
 *
 * Loads generated JSON content into Supabase tables.
 * Supports questions and company_trivia.
 *
 * Note: Modules are loaded from JSON files directly by the carousel loader,
 * not from the database. See src/lib/carousel/load-modules.ts.
 *
 * Usage:
 *   npx tsx scripts/load-content.ts --all
 *   npx tsx scripts/load-content.ts --questions
 *   npx tsx scripts/load-content.ts --trivia
 *   npx tsx scripts/load-content.ts --dry-run --all
 *
 * Environment:
 *   Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = path.join(process.cwd(), "data", "generated");

// Types for generated content
interface GeneratedQuestion {
  id?: string;
  company_slug: string;
  role_slug: string;
  question_text: string;
  category: "behavioral" | "technical" | "culture" | "curveball";
  difficulty: "easy" | "medium" | "hard";
  interviewer_intent: string;
  good_answer_traits: string[];
  common_mistakes: string[];
  answer_framework: Record<string, unknown>;
  tags: string[];
  question_type?: string;
  target_value?: string;
  is_premium?: boolean;
  source?: string;
  source_url?: string;
}

interface GeneratedTrivia {
  company_slug: string;
  fact_type: string;
  format: "quiz" | "flashcard" | "factoid";
  question?: string;
  answer: string;
  options?: string[];
  source_url?: string;
  source_date?: string;
}

// Stats tracking
interface LoadStats {
  questions: { loaded: number; skipped: number; errors: number };
  trivia: { loaded: number; skipped: number; errors: number };
}

const stats: LoadStats = {
  questions: { loaded: 0, skipped: 0, errors: 0 },
  trivia: { loaded: 0, skipped: 0, errors: 0 },
};

/**
 * Read all JSON files from a directory
 */
function readJsonFiles<T>(dir: string, nestedKey?: string): T[] {
  if (!fs.existsSync(dir)) {
    console.log(`  Directory not found: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const results: T[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), "utf-8");
      const data = JSON.parse(content);

      // Handle nested structures (e.g., { questions: [...] })
      if (nestedKey && data[nestedKey] && Array.isArray(data[nestedKey])) {
        results.push(...data[nestedKey]);
      }
      // Handle both single objects and arrays
      else if (Array.isArray(data)) {
        results.push(...data);
      } else {
        results.push(data);
      }
    } catch (e) {
      console.error(`  Error reading ${file}:`, e);
    }
  }

  return results;
}

/**
 * Load interview questions
 */
async function loadQuestions(dryRun: boolean): Promise<void> {
  console.log("\nLoading questions...");
  const questionsDir = path.join(DATA_DIR, "questions");
  // Use 'questions' as nested key since files have { questions: [...] } structure
  const questions = readJsonFiles<GeneratedQuestion>(questionsDir, "questions");

  console.log(`  Found ${questions.length} questions`);

  for (const q of questions) {
    if (dryRun) {
      console.log(
        `  [DRY-RUN] Would load question: ${q.company_slug}/${q.role_slug} - ${q.question_text.substring(0, 50)}...`
      );
      stats.questions.skipped++;
      continue;
    }

    const { error } = await supabase.from("questions").upsert(
      {
        company_slug: q.company_slug,
        role_slug: q.role_slug,
        question_text: q.question_text,
        category: q.category,
        difficulty: q.difficulty,
        interviewer_intent: q.interviewer_intent,
        good_answer_traits: q.good_answer_traits,
        common_mistakes: q.common_mistakes,
        answer_framework: q.answer_framework,
        tags: q.tags,
        question_type: q.question_type,
        target_value: q.target_value,
        is_premium: q.is_premium ?? false,
        source: q.source,
        source_url: q.source_url,
        original_id: q.id,
      },
      { onConflict: "company_slug,role_slug,original_id" }
    );

    if (error) {
      // If conflict on original_id, try without it
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        stats.questions.skipped++;
      } else {
        console.error(`  Error loading question:`, error.message);
        stats.questions.errors++;
      }
    } else {
      stats.questions.loaded++;
    }
  }
}

/**
 * Load company trivia
 */
async function loadTrivia(dryRun: boolean): Promise<void> {
  console.log("\nLoading trivia...");
  const triviaDir = path.join(DATA_DIR, "trivia");
  const trivia = readJsonFiles<GeneratedTrivia>(triviaDir);

  console.log(`  Found ${trivia.length} trivia items`);

  for (const t of trivia) {
    if (dryRun) {
      console.log(
        `  [DRY-RUN] Would load trivia: ${t.company_slug} - ${t.fact_type}`
      );
      stats.trivia.skipped++;
      continue;
    }

    const { error } = await supabase.from("company_trivia").upsert(
      {
        company_slug: t.company_slug,
        fact_type: t.fact_type,
        format: t.format,
        question: t.question,
        answer: t.answer,
        options: t.options,
        source_url: t.source_url,
        source_date: t.source_date,
      },
      { onConflict: "company_slug,question" }
    );

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        stats.trivia.skipped++;
      } else {
        console.error(`  Error loading trivia:`, error.message);
        stats.trivia.errors++;
      }
    } else {
      stats.trivia.loaded++;
    }
  }
}

/**
 * Print usage help
 */
function printUsage(): void {
  console.log(`
Content Loader Script

Usage:
  npx tsx scripts/load-content.ts [options]

Options:
  --all        Load all content types (questions, trivia)
  --questions  Load only interview questions
  --trivia     Load only company trivia
  --dry-run    Preview what would be loaded without making changes
  --help       Show this help message

Note: Modules are loaded from JSON files directly by the carousel loader,
      not from the database. See src/lib/carousel/load-modules.ts.

Examples:
  npx tsx scripts/load-content.ts --all
  npx tsx scripts/load-content.ts --dry-run --questions
  npx tsx scripts/load-content.ts --questions --trivia

Directory Structure:
  data/generated/
  ├── modules/     # Module JSON files (used by carousel loader)
  ├── questions/   # Question JSON files
  └── trivia/      # Trivia JSON files
`);
}

/**
 * Print final statistics
 */
function printStats(): void {
  console.log("\n" + "═".repeat(50));
  console.log("Load Statistics:");
  console.log("─".repeat(50));
  console.log(
    `Questions:      ${stats.questions.loaded} loaded, ${stats.questions.skipped} skipped, ${stats.questions.errors} errors`
  );
  console.log(
    `Trivia:         ${stats.trivia.loaded} loaded, ${stats.trivia.skipped} skipped, ${stats.trivia.errors} errors`
  );
  console.log("═".repeat(50));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const dryRun = args.includes("--dry-run");
  const loadAll = args.includes("--all");
  const loadQuestionsFlag = args.includes("--questions") || loadAll;
  const loadTriviaFlag = args.includes("--trivia") || loadAll;

  if (!loadQuestionsFlag && !loadTriviaFlag) {
    console.error("No content type specified. Use --all, --questions, or --trivia");
    process.exit(1);
  }

  console.log("Content Loader");
  console.log("═".repeat(50));
  console.log(`Mode: ${dryRun ? "DRY-RUN (no changes)" : "LIVE"}`);
  console.log(`Data directory: ${DATA_DIR}`);

  // Check if data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`\nCreating data directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(path.join(DATA_DIR, "questions"), { recursive: true });
    fs.mkdirSync(path.join(DATA_DIR, "trivia"), { recursive: true });
  }

  if (loadQuestionsFlag) {
    await loadQuestions(dryRun);
  }

  if (loadTriviaFlag) {
    await loadTrivia(dryRun);
  }

  printStats();

  const totalErrors =
    stats.questions.errors +
    stats.trivia.errors;

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
