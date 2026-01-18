#!/usr/bin/env ts-node
/**
 * Repetition Detection Script
 *
 * Analyzes content for repeated phrases that may indicate AI-generated text.
 * Detects repetition within single modules and across multiple modules.
 *
 * Usage:
 *   npx ts-node scripts/quality/check-repetition.ts --input=file.json
 *   npx ts-node scripts/quality/check-repetition.ts --input=file1.json --input=file2.json
 *   npx ts-node scripts/quality/check-repetition.ts --dir=output/
 *   npm run check-repetition -- --input=file.json
 */

import * as fs from "fs";
import * as path from "path";
import type { Module, ContentBlock, ChecklistItem } from "../../src/types/module";

// Common phrases to ignore (articles, prepositions, conjunctions, etc.)
const COMMON_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "you",
  "your",
  "we",
  "our",
  "they",
  "their",
  "he",
  "she",
  "him",
  "her",
  "i",
  "me",
  "my",
  "not",
  "no",
  "yes",
  "all",
  "any",
  "some",
  "more",
  "most",
  "other",
  "into",
  "out",
  "up",
  "down",
  "about",
  "after",
  "before",
  "between",
  "through",
  "during",
  "under",
  "above",
  "over",
  "again",
  "then",
  "than",
  "so",
  "if",
  "when",
  "where",
  "who",
  "what",
  "which",
  "how",
  "why",
  "each",
  "every",
  "both",
  "few",
  "many",
  "much",
  "such",
  "very",
  "just",
  "also",
  "only",
  "even",
  "now",
  "here",
  "there",
]);

// AI-sounding phrases to specifically flag
const AI_PHRASES = [
  "in conclusion",
  "in summary",
  "to summarize",
  "it is important to note",
  "it is worth noting",
  "it should be noted",
  "as mentioned earlier",
  "as previously mentioned",
  "as discussed",
  "moving forward",
  "at the end of the day",
  "let's dive in",
  "let's explore",
  "in this section",
  "in today's",
  "in the following",
  "first and foremost",
  "last but not least",
  "without further ado",
  "it goes without saying",
  "needless to say",
  "to be honest",
  "in order to",
  "due to the fact that",
  "for the purpose of",
  "in the event that",
  "at this point in time",
  "on a daily basis",
  "a wide variety of",
  "a large number of",
  "take into consideration",
  "make sure to",
  "keep in mind",
  "important to remember",
];

// Configuration
export interface RepetitionConfig {
  /** Minimum phrase length in words (default: 3) */
  minPhraseLength: number;
  /** Maximum phrase length in words (default: 8) */
  maxPhraseLength: number;
  /** Number of occurrences to flag (default: 3) */
  threshold: number;
  /** Check for AI-sounding phrases (default: true) */
  checkAIPhrases: boolean;
}

const DEFAULT_CONFIG: RepetitionConfig = {
  minPhraseLength: 3,
  maxPhraseLength: 8,
  threshold: 3,
  checkAIPhrases: true,
};

// Types for results
export interface PhraseLocation {
  moduleId: string;
  sectionId: string;
  blockId: string;
  blockType: string;
}

export interface RepeatedPhrase {
  phrase: string;
  count: number;
  locations: PhraseLocation[];
  isAIPhrase: boolean;
}

export interface RepetitionResult {
  pass: boolean;
  totalPhrases: number;
  repeatedPhrases: RepeatedPhrase[];
  aiPhrases: RepeatedPhrase[];
  summary: string;
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
 * Extracts all text content from a module with location tracking
 */
function extractTextWithLocations(
  module: Module
): Array<{ text: string; location: PhraseLocation }> {
  const results: Array<{ text: string; location: PhraseLocation }> = [];

  for (const section of module.sections) {
    for (const block of section.blocks) {
      const text = extractTextFromBlock(block);
      if (text.trim()) {
        results.push({
          text,
          location: {
            moduleId: module.id,
            sectionId: section.id,
            blockId: block.id,
            blockType: block.type,
          },
        });
      }
    }
  }

  return results;
}

/**
 * Normalizes text for phrase comparison (strict version for n-gram detection)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Normalizes text for AI phrase matching (preserves apostrophes)
 */
function normalizeTextForAI(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u0060\u00B4]/g, "'") // Normalize smart quotes to simple apostrophe
    .replace(/[^\w\s']/g, " ") // Remove punctuation except apostrophes
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Generates n-grams (phrases) from text
 */
function generateNGrams(
  text: string,
  minN: number,
  maxN: number
): string[] {
  const words = normalizeText(text).split(" ");
  const ngrams: string[] = [];

  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(" ");
      // Skip phrases that are mostly common words
      const phraseWords = phrase.split(" ");
      const nonCommonWords = phraseWords.filter(
        (w) => !COMMON_WORDS.has(w) && w.length > 1
      );
      // Require at least half non-common words (min 1)
      if (nonCommonWords.length >= Math.max(1, Math.ceil(phraseWords.length / 2))) {
        ngrams.push(phrase);
      }
    }
  }

  return ngrams;
}

/**
 * Checks for AI-sounding phrases in text
 */
function checkForAIPhrases(
  textItems: Array<{ text: string; location: PhraseLocation }>
): RepeatedPhrase[] {
  const results: RepeatedPhrase[] = [];
  const phraseMap = new Map<string, PhraseLocation[]>();

  for (const { text, location } of textItems) {
    // Use AI-specific normalization that preserves apostrophes
    const normalizedText = normalizeTextForAI(text);
    for (const aiPhrase of AI_PHRASES) {
      if (normalizedText.includes(aiPhrase)) {
        const existing = phraseMap.get(aiPhrase) ?? [];
        existing.push(location);
        phraseMap.set(aiPhrase, existing);
      }
    }
  }

  for (const [phrase, locations] of phraseMap) {
    if (locations.length >= 1) {
      results.push({
        phrase,
        count: locations.length,
        locations,
        isAIPhrase: true,
      });
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Finds repeated phrases across text items
 */
function findRepeatedPhrases(
  textItems: Array<{ text: string; location: PhraseLocation }>,
  config: RepetitionConfig
): RepeatedPhrase[] {
  const phraseMap = new Map<string, PhraseLocation[]>();

  for (const { text, location } of textItems) {
    const ngrams = generateNGrams(
      text,
      config.minPhraseLength,
      config.maxPhraseLength
    );
    for (const phrase of ngrams) {
      const existing = phraseMap.get(phrase) ?? [];
      existing.push(location);
      phraseMap.set(phrase, existing);
    }
  }

  const results: RepeatedPhrase[] = [];
  for (const [phrase, locations] of phraseMap) {
    if (locations.length >= config.threshold) {
      results.push({
        phrase,
        count: locations.length,
        locations,
        isAIPhrase: false,
      });
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

/**
 * Analyzes modules for repetition
 */
export function analyzeRepetition(
  modules: Module[],
  config: Partial<RepetitionConfig> = {}
): RepetitionResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Extract all text with locations
  const allText: Array<{ text: string; location: PhraseLocation }> = [];
  for (const module of modules) {
    allText.push(...extractTextWithLocations(module));
  }

  // Find repeated phrases
  const repeatedPhrases = findRepeatedPhrases(allText, fullConfig);

  // Check for AI phrases
  const aiPhrases = fullConfig.checkAIPhrases
    ? checkForAIPhrases(allText)
    : [];

  // Determine pass/fail
  const hasRepeatedPhrases = repeatedPhrases.length > 0;
  const hasAIPhrases = aiPhrases.length > 0;
  const pass = !hasRepeatedPhrases && !hasAIPhrases;

  // Build summary
  const summaryParts: string[] = [];
  if (repeatedPhrases.length > 0) {
    summaryParts.push(
      `${repeatedPhrases.length} repeated phrase(s) found (${config.threshold ?? DEFAULT_CONFIG.threshold}+ occurrences)`
    );
  }
  if (aiPhrases.length > 0) {
    summaryParts.push(`${aiPhrases.length} AI-sounding phrase(s) detected`);
  }
  if (pass) {
    summaryParts.push("No repetition detected");
  }

  return {
    pass,
    totalPhrases: repeatedPhrases.length + aiPhrases.length,
    repeatedPhrases,
    aiPhrases,
    summary: summaryParts.join("; "),
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
      // Skip files that don't look like modules (e.g., landing pages, Q&A files)
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
  threshold: number;
  help: boolean;
} {
  const inputFiles: string[] = [];
  let threshold = DEFAULT_CONFIG.threshold;
  let help = false;

  for (const arg of args) {
    if (arg.startsWith("--input=")) {
      inputFiles.push(arg.slice(8));
    } else if (arg.startsWith("--dir=")) {
      const dir = arg.slice(6);
      inputFiles.push(...getJsonFilesInDir(dir));
    } else if (arg.startsWith("--threshold=")) {
      threshold = parseInt(arg.slice(12), 10);
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }

  return { inputFiles, threshold, help };
}

/**
 * Formats output for console
 */
function formatOutput(result: RepetitionResult): string {
  const lines: string[] = [];

  if (result.aiPhrases.length > 0) {
    lines.push("\n⚠️  AI-Sounding Phrases Detected:");
    for (const phrase of result.aiPhrases) {
      lines.push(`   "${phrase.phrase}" (${phrase.count} occurrence${phrase.count > 1 ? "s" : ""})`);
      for (const loc of phrase.locations.slice(0, 3)) {
        lines.push(`     └─ ${loc.moduleId} > ${loc.sectionId} > ${loc.blockId}`);
      }
      if (phrase.locations.length > 3) {
        lines.push(`     └─ ... and ${phrase.locations.length - 3} more`);
      }
    }
  }

  if (result.repeatedPhrases.length > 0) {
    lines.push("\n🔄 Repeated Phrases:");
    for (const phrase of result.repeatedPhrases.slice(0, 10)) {
      lines.push(`   "${phrase.phrase}" (${phrase.count} occurrences)`);
      for (const loc of phrase.locations.slice(0, 2)) {
        lines.push(`     └─ ${loc.moduleId} > ${loc.sectionId} > ${loc.blockId}`);
      }
      if (phrase.locations.length > 2) {
        lines.push(`     └─ ... and ${phrase.locations.length - 2} more`);
      }
    }
    if (result.repeatedPhrases.length > 10) {
      lines.push(`   ... and ${result.repeatedPhrases.length - 10} more repeated phrases`);
    }
  }

  lines.push("\n" + "─".repeat(50));
  if (result.pass) {
    lines.push("✅ PASS: " + result.summary);
  } else {
    lines.push("❌ FAIL: " + result.summary);
  }

  return lines.join("\n");
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const { inputFiles, threshold, help } = parseArgs(args);

  if (help) {
    console.log(`
Repetition Detection Script

Usage:
  npx ts-node scripts/quality/check-repetition.ts --input=file.json
  npx ts-node scripts/quality/check-repetition.ts --dir=output/
  npm run check-repetition -- --input=file.json

Options:
  --input=<file>      Input JSON file (can be used multiple times)
  --dir=<directory>   Check all JSON files in directory
  --threshold=<n>     Number of occurrences to flag (default: 3)
  --help, -h          Show this help message

Exit Codes:
  0  Pass (no repetition detected)
  1  Fail (repetition detected)
`);
    process.exit(0);
  }

  if (inputFiles.length === 0) {
    console.error("Error: No input files specified");
    console.error("Usage: check-repetition --input=<file.json> | --dir=<directory>");
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
  const result = analyzeRepetition(modules, { threshold });

  // Output
  console.log(formatOutput(result));

  // Exit with appropriate code
  process.exit(result.pass ? 0 : 1);
}

// Run if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("check-repetition.ts");

if (isMainModule) {
  main();
}
