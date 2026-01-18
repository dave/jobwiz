#!/usr/bin/env ts-node
/**
 * Readability Scoring Script
 *
 * Analyzes content for readability using the Flesch-Kincaid formula.
 * Returns pass/fail based on configurable thresholds.
 *
 * Usage:
 *   npx ts-node scripts/quality/check-readability.ts --input=file.json
 *   npx ts-node scripts/quality/check-readability.ts --dir=output/
 *   npm run check-readability -- --input=file.json
 */

import * as fs from "fs";
import * as path from "path";
import type { Module, ContentBlock, ChecklistItem } from "../../src/types/module";

// Configuration
export interface ReadabilityConfig {
  /** Minimum acceptable score (default: 50) */
  minScore: number;
  /** Maximum acceptable score (default: 80) */
  maxScore: number;
  /** Include per-section breakdown (default: false) */
  perSection: boolean;
}

const DEFAULT_CONFIG: ReadabilityConfig = {
  minScore: 50,
  maxScore: 80,
  perSection: false,
};

// Types for results
export interface SectionScore {
  sectionId: string;
  sectionTitle: string;
  score: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  status: "pass" | "too_complex" | "too_simple";
}

export interface ReadabilityResult {
  pass: boolean;
  score: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  status: "pass" | "too_complex" | "too_simple";
  sectionScores: SectionScore[];
  summary: string;
}

/**
 * Counts syllables in a word using a simple heuristic
 * Based on counting vowel groups with adjustments for common patterns
 */
export function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  // Handle common endings
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");

  // Count vowel groups
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Counts sentences in text
 * Handles multiple sentence-ending punctuation
 */
export function countSentences(text: string): number {
  if (!text.trim()) return 0;

  // Match sentence-ending punctuation, handling multiple punctuation marks
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) {
    // If no sentence-ending punctuation, count as 1 sentence if there's text
    return text.trim().length > 0 ? 1 : 0;
  }
  return sentences.length;
}

/**
 * Counts words in text
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}

/**
 * Counts total syllables in text
 */
export function countTotalSyllables(text: string): number {
  if (!text.trim()) return 0;
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  return words.reduce((total, word) => total + countSyllables(word), 0);
}

/**
 * Calculates Flesch-Kincaid Reading Ease score
 * Formula: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
 * Score ranges:
 *   90-100: Very easy (5th grade)
 *   80-89: Easy (6th grade)
 *   70-79: Fairly easy (7th grade)
 *   60-69: Standard (8th-9th grade) <- TARGET
 *   50-59: Fairly difficult (10th-12th grade)
 *   30-49: Difficult (college)
 *   0-29: Very difficult (college graduate)
 */
export function calculateFleschKincaid(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Extracts text content from a content block
 */
function extractTextFromBlock(block: ContentBlock): string {
  switch (block.type) {
    case "text":
    case "header":
    case "quote":
    case "tip":
    case "warning":
      return block.content;
    case "quiz":
      return `${block.question} ${block.options.map((o) => o.text).join(" ")} ${block.explanation ?? ""}`;
    case "checklist":
      return `${block.title ?? ""} ${block.items.map((i: ChecklistItem) => i.text).join(" ")}`;
    case "video":
    case "audio":
      return block.title ?? "";
    case "image":
    case "infographic":
      return `${block.alt} ${block.caption ?? ""}`;
    case "animation":
      return "";
    default:
      return "";
  }
}

/**
 * Extracts all text content from a module
 */
function extractAllText(module: Module): string {
  const texts: string[] = [];

  for (const section of module.sections) {
    for (const block of section.blocks) {
      const text = extractTextFromBlock(block);
      if (text.trim()) {
        texts.push(text);
      }
    }
  }

  return texts.join(" ");
}

/**
 * Extracts text content per section
 */
function extractTextBySection(
  module: Module
): Array<{ sectionId: string; sectionTitle: string; text: string }> {
  const results: Array<{ sectionId: string; sectionTitle: string; text: string }> = [];

  for (const section of module.sections) {
    const texts: string[] = [];
    for (const block of section.blocks) {
      const text = extractTextFromBlock(block);
      if (text.trim()) {
        texts.push(text);
      }
    }
    if (texts.length > 0) {
      results.push({
        sectionId: section.id,
        sectionTitle: section.title,
        text: texts.join(" "),
      });
    }
  }

  return results;
}

/**
 * Determines status based on score and thresholds
 */
function getStatus(
  score: number,
  minScore: number,
  maxScore: number
): "pass" | "too_complex" | "too_simple" {
  if (score < minScore) return "too_complex";
  if (score > maxScore) return "too_simple";
  return "pass";
}

/**
 * Analyzes readability of modules
 */
export function analyzeReadability(
  modules: Module[],
  config: Partial<ReadabilityConfig> = {}
): ReadabilityResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Combine all text from all modules
  const allText = modules.map((m) => extractAllText(m)).join(" ");

  const wordCount = countWords(allText);
  const sentenceCount = countSentences(allText);
  const syllableCount = countTotalSyllables(allText);
  const score = calculateFleschKincaid(wordCount, sentenceCount, syllableCount);
  const status = getStatus(score, fullConfig.minScore, fullConfig.maxScore);

  // Calculate per-section scores if requested
  const sectionScores: SectionScore[] = [];
  if (fullConfig.perSection) {
    for (const module of modules) {
      const sections = extractTextBySection(module);
      for (const { sectionId, sectionTitle, text } of sections) {
        const sectionWords = countWords(text);
        const sectionSentences = countSentences(text);
        const sectionSyllables = countTotalSyllables(text);
        const sectionScore = calculateFleschKincaid(
          sectionWords,
          sectionSentences,
          sectionSyllables
        );
        sectionScores.push({
          sectionId,
          sectionTitle,
          score: sectionScore,
          wordCount: sectionWords,
          sentenceCount: sectionSentences,
          syllableCount: sectionSyllables,
          status: getStatus(sectionScore, fullConfig.minScore, fullConfig.maxScore),
        });
      }
    }
  }

  // Build summary
  const pass = status === "pass";
  let summary = `Score: ${score.toFixed(1)} `;
  if (status === "too_complex") {
    summary += `(FAIL - too complex, below ${fullConfig.minScore})`;
  } else if (status === "too_simple") {
    summary += `(FAIL - too simple, above ${fullConfig.maxScore})`;
  } else {
    summary += `(PASS - within ${fullConfig.minScore}-${fullConfig.maxScore} range)`;
  }

  // Add section failure info if applicable
  if (fullConfig.perSection) {
    const failedSections = sectionScores.filter((s) => s.status !== "pass");
    if (failedSections.length > 0) {
      summary += `. ${failedSections.length} section(s) outside acceptable range`;
    }
  }

  return {
    pass,
    score,
    wordCount,
    sentenceCount,
    syllableCount,
    status,
    sectionScores,
    summary,
  };
}

/**
 * Validates that an object looks like a Module
 */
function isModule(obj: unknown): obj is Module {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "sections" in obj &&
    Array.isArray((obj as Module).sections)
  );
}

/**
 * Loads a module from a JSON file
 */
function loadModule(filePath: string): Module | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as unknown;
    if (!isModule(data)) {
      // Skip files that don't look like modules
      return null;
    }
    return data;
  } catch (e) {
    console.error(`Error loading ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/**
 * Gets all JSON files in a directory
 */
function getJsonFilesInDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dirPath, f));
}

/**
 * Parses command line arguments
 */
function parseArgs(args: string[]): {
  inputFiles: string[];
  minScore: number;
  maxScore: number;
  perSection: boolean;
  help: boolean;
} {
  const inputFiles: string[] = [];
  let minScore = DEFAULT_CONFIG.minScore;
  let maxScore = DEFAULT_CONFIG.maxScore;
  let perSection = false;
  let help = false;

  for (const arg of args) {
    if (arg.startsWith("--input=")) {
      inputFiles.push(arg.slice(8));
    } else if (arg.startsWith("--dir=")) {
      const dir = arg.slice(6);
      inputFiles.push(...getJsonFilesInDir(dir));
    } else if (arg.startsWith("--min=")) {
      minScore = parseInt(arg.slice(6), 10);
    } else if (arg.startsWith("--max=")) {
      maxScore = parseInt(arg.slice(6), 10);
    } else if (arg === "--per-section") {
      perSection = true;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }

  return { inputFiles, minScore, maxScore, perSection, help };
}

/**
 * Formats output for console
 */
function formatOutput(result: ReadabilityResult, config: ReadabilityConfig): string {
  const lines: string[] = [];

  lines.push("\n📊 Readability Analysis");
  lines.push("─".repeat(50));
  lines.push(`Overall Score: ${result.score.toFixed(1)}`);
  lines.push(`Word Count: ${result.wordCount}`);
  lines.push(`Sentence Count: ${result.sentenceCount}`);
  lines.push(`Syllable Count: ${result.syllableCount}`);
  lines.push(`Avg Words/Sentence: ${(result.wordCount / result.sentenceCount || 0).toFixed(1)}`);
  lines.push(`Avg Syllables/Word: ${(result.syllableCount / result.wordCount || 0).toFixed(2)}`);

  // Score interpretation
  lines.push("\n📖 Score Interpretation:");
  if (result.score >= 90) {
    lines.push("   Very Easy (5th grade level)");
  } else if (result.score >= 80) {
    lines.push("   Easy (6th grade level)");
  } else if (result.score >= 70) {
    lines.push("   Fairly Easy (7th grade level)");
  } else if (result.score >= 60) {
    lines.push("   Standard (8th-9th grade level) ✓ Target");
  } else if (result.score >= 50) {
    lines.push("   Fairly Difficult (10th-12th grade level)");
  } else if (result.score >= 30) {
    lines.push("   Difficult (College level)");
  } else {
    lines.push("   Very Difficult (College graduate level)");
  }

  // Per-section breakdown
  if (result.sectionScores.length > 0) {
    lines.push("\n📑 Per-Section Breakdown:");
    for (const section of result.sectionScores) {
      const statusIcon = section.status === "pass" ? "✓" : "✗";
      const statusText =
        section.status === "too_complex"
          ? "(too complex)"
          : section.status === "too_simple"
            ? "(too simple)"
            : "";
      lines.push(
        `   ${statusIcon} ${section.sectionTitle}: ${section.score.toFixed(1)} ${statusText}`
      );
    }

    // Summary of failed sections
    const failedSections = result.sectionScores.filter((s) => s.status !== "pass");
    if (failedSections.length > 0) {
      lines.push(`\n⚠️  ${failedSections.length} section(s) outside acceptable range`);
    }
  }

  lines.push("\n" + "─".repeat(50));
  lines.push(`Acceptable Range: ${config.minScore}-${config.maxScore}`);

  if (result.pass) {
    lines.push(`✅ PASS: ${result.summary}`);
  } else {
    lines.push(`❌ FAIL: ${result.summary}`);
  }

  return lines.join("\n");
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const { inputFiles, minScore, maxScore, perSection, help } = parseArgs(args);

  if (help) {
    console.log(`
Readability Scoring Script

Usage:
  npx ts-node scripts/quality/check-readability.ts --input=file.json
  npx ts-node scripts/quality/check-readability.ts --dir=output/
  npm run check-readability -- --input=file.json

Options:
  --input=<file>      Input JSON file (can be used multiple times)
  --dir=<directory>   Check all JSON files in directory
  --min=<n>           Minimum acceptable score (default: 50)
  --max=<n>           Maximum acceptable score (default: 80)
  --per-section       Include per-section breakdown
  --help, -h          Show this help message

Flesch-Kincaid Score Ranges:
  90-100: Very easy (5th grade)
  80-89:  Easy (6th grade)
  70-79:  Fairly easy (7th grade)
  60-69:  Standard (8th-9th grade) <- TARGET
  50-59:  Fairly difficult (10th-12th grade)
  30-49:  Difficult (college)
  0-29:   Very difficult (college graduate)

Exit Codes:
  0  Pass (score within acceptable range)
  1  Fail (score outside acceptable range)
`);
    process.exit(0);
  }

  if (inputFiles.length === 0) {
    console.error("Error: No input files specified");
    console.error("Usage: check-readability --input=<file.json> | --dir=<directory>");
    process.exit(1);
  }

  // Load all modules
  const modules: Module[] = [];
  for (const file of inputFiles) {
    const module = loadModule(file);
    if (module) {
      modules.push(module);
    }
  }

  if (modules.length === 0) {
    console.error("Error: No valid modules loaded");
    process.exit(1);
  }

  console.log(`\nAnalyzing ${modules.length} module(s)...`);

  // Analyze
  const config: ReadabilityConfig = { minScore, maxScore, perSection };
  const result = analyzeReadability(modules, config);

  // Output
  console.log(formatOutput(result, config));

  // Exit with appropriate code
  process.exit(result.pass ? 0 : 1);
}

// Run if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("check-readability.ts");

if (isMainModule) {
  main();
}
