#!/usr/bin/env ts-node
/**
 * Human Review Sampling Script
 *
 * Selects content for human review based on:
 * 1. Flagged content (from automated checks)
 * 2. New companies (never reviewed)
 * 3. Random sample of remaining content
 *
 * Usage:
 *   npx ts-node scripts/quality/sample-for-review.ts --dir=output/ --percent=10
 *   npm run sample-for-review -- --percent=10 --prioritize=flagged
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type { Module, ContentBlock, ChecklistItem } from "../../src/types/module";

// Re-export types for convenience (compatible with test imports)
export interface RepetitionResult {
  pass: boolean;
  totalPhrases: number;
  repeatedPhrases: Array<{
    phrase: string;
    count: number;
    locations: Array<{
      moduleId: string;
      sectionId: string;
      blockId: string;
      blockType: string;
    }>;
    isAIPhrase: boolean;
  }>;
  aiPhrases: Array<{
    phrase: string;
    count: number;
    locations: Array<{
      moduleId: string;
      sectionId: string;
      blockId: string;
      blockType: string;
    }>;
    isAIPhrase: boolean;
  }>;
  summary: string;
}

export interface ReadabilityResult {
  pass: boolean;
  score: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  status: "pass" | "too_complex" | "too_simple";
  sectionScores: Array<{
    sectionId: string;
    sectionTitle: string;
    score: number;
    wordCount: number;
    sentenceCount: number;
    syllableCount: number;
    status: "pass" | "too_complex" | "too_simple";
  }>;
  summary: string;
}

// Types
export interface ReviewItem {
  id: string;
  filePath: string;
  moduleId: string;
  moduleTitle: string;
  company: string;
  priority: "high" | "medium" | "low";
  reason: string;
  flags: string[];
  repetitionResult?: RepetitionResult;
  readabilityResult?: ReadabilityResult;
}

export interface ReviewQueue {
  items: ReviewItem[];
  totalModules: number;
  sampledCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  generatedAt: string;
}

export interface ReviewResult {
  itemId: string;
  moduleId: string;
  reviewer: string;
  date: string;
  status: "pass" | "fail";
  issues: ReviewIssue[];
  notes: string;
  timeSpentMinutes: number;
}

export interface ReviewIssue {
  type: "fact" | "ai" | "generic" | "unclear" | "missing";
  description: string;
  location?: string;
}

export interface SamplingConfig {
  /** Percentage of content to sample (default: 10) */
  percent: number;
  /** Prioritize flagged content (default: true) */
  prioritizeFlagged: boolean;
  /** Prioritize new companies (default: true) */
  prioritizeNew: boolean;
  /** List of companies already reviewed */
  reviewedCompanies: Set<string>;
  /** Readability threshold */
  readabilityMin: number;
  readabilityMax: number;
}

const DEFAULT_CONFIG: SamplingConfig = {
  percent: 10,
  prioritizeFlagged: true,
  prioritizeNew: true,
  reviewedCompanies: new Set(),
  readabilityMin: 50,
  readabilityMax: 80,
};

// AI-sounding phrases to specifically flag (inline from check-repetition)
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
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Extracts company slug from module or filename
 */
export function extractCompany(module: Module, filePath: string): string {
  // Try to extract from filename first (more reliable for identifying the company)
  const filename = path.basename(filePath, ".json");
  const filenameMatch = filename.match(/^company-(.+?)(?:-preview)?$/);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }

  // Try to extract from module slug
  if (module.type === "company" && module.slug) {
    // Slug like "company-google" -> "google"
    const slugMatch = module.slug.match(/^company-(.+)$/);
    if (slugMatch?.[1]) {
      return slugMatch[1];
    }
    return module.slug;
  }

  // Fall back to module id
  return module.id;
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
 * Normalizes text for AI phrase matching (preserves apostrophes)
 */
function normalizeTextForAI(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u0060\u00B4]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks for AI-sounding phrases in text
 */
function checkForAIPhrases(text: string): string[] {
  const found: string[] = [];
  const normalizedText = normalizeTextForAI(text);

  for (const phrase of AI_PHRASES) {
    if (normalizedText.includes(phrase)) {
      found.push(phrase);
    }
  }

  return found;
}

/**
 * Counts syllables in a word
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");

  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Counts sentences in text
 */
function countSentences(text: string): number {
  if (!text.trim()) return 0;
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) {
    return text.trim().length > 0 ? 1 : 0;
  }
  return sentences.length;
}

/**
 * Counts words in text
 */
function countWords(text: string): number {
  if (!text.trim()) return 0;
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}

/**
 * Counts total syllables in text
 */
function countTotalSyllables(text: string): number {
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
 */
function calculateFleschKincaid(
  wordCount: number,
  sentenceCount: number,
  syllableCount: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Inline repetition analysis (simplified version)
 */
export function analyzeRepetition(modules: Module[]): RepetitionResult {
  const allText = modules.map((m) => extractAllText(m)).join(" ");
  const aiPhrasesFound = checkForAIPhrases(allText);

  const aiPhrases = aiPhrasesFound.map((phrase) => ({
    phrase,
    count: 1,
    locations: [{ moduleId: modules[0]?.id ?? "", sectionId: "", blockId: "", blockType: "" }],
    isAIPhrase: true,
  }));

  const pass = aiPhrases.length === 0;

  return {
    pass,
    totalPhrases: aiPhrases.length,
    repeatedPhrases: [],
    aiPhrases,
    summary: pass ? "No repetition detected" : `${aiPhrases.length} AI-sounding phrase(s) detected`,
  };
}

/**
 * Inline readability analysis (simplified version)
 */
export function analyzeReadability(
  modules: Module[],
  config: { minScore: number; maxScore: number }
): ReadabilityResult {
  const allText = modules.map((m) => extractAllText(m)).join(" ");

  const wordCount = countWords(allText);
  const sentenceCount = countSentences(allText);
  const syllableCount = countTotalSyllables(allText);
  const score = calculateFleschKincaid(wordCount, sentenceCount, syllableCount);

  let status: "pass" | "too_complex" | "too_simple" = "pass";
  if (score < config.minScore) status = "too_complex";
  else if (score > config.maxScore) status = "too_simple";

  const pass = status === "pass";

  return {
    pass,
    score,
    wordCount,
    sentenceCount,
    syllableCount,
    status,
    sectionScores: [],
    summary: pass
      ? `Score: ${score.toFixed(1)} (PASS)`
      : `Score: ${score.toFixed(1)} (${status === "too_complex" ? "too complex" : "too simple"})`,
  };
}

/**
 * Runs automated quality checks on a module
 */
export function runQualityChecks(
  module: Module,
  config: SamplingConfig
): { flags: string[]; repetition: RepetitionResult; readability: ReadabilityResult } {
  const flags: string[] = [];

  // Run repetition check
  const repetition = analyzeRepetition([module]);
  if (!repetition.pass) {
    if (repetition.aiPhrases.length > 0) {
      flags.push(`AI phrases: ${repetition.aiPhrases.length}`);
    }
    if (repetition.repeatedPhrases.length > 0) {
      flags.push(`Repeated phrases: ${repetition.repeatedPhrases.length}`);
    }
  }

  // Run readability check
  const readability = analyzeReadability([module], {
    minScore: config.readabilityMin,
    maxScore: config.readabilityMax,
  });
  if (!readability.pass) {
    flags.push(`Readability: ${readability.status} (${readability.score.toFixed(1)})`);
  }

  return { flags, repetition, readability };
}

/**
 * Determines priority for a review item
 */
export function determinePriority(
  flags: string[],
  company: string,
  config: SamplingConfig
): { priority: "high" | "medium" | "low"; reason: string } {
  // High priority: flagged by automated checks
  if (config.prioritizeFlagged && flags.length > 0) {
    return {
      priority: "high",
      reason: `Flagged by automated checks: ${flags.join(", ")}`,
    };
  }

  // Medium priority: new company (never reviewed)
  if (config.prioritizeNew && !config.reviewedCompanies.has(company)) {
    return {
      priority: "medium",
      reason: `New company: ${company} (not previously reviewed)`,
    };
  }

  // Low priority: random sample
  return {
    priority: "low",
    reason: "Random sample",
  };
}

/**
 * Selects items for review using stratified sampling
 */
export function selectForReview(
  items: ReviewItem[],
  targetCount: number
): ReviewItem[] {
  const selected: ReviewItem[] = [];

  // First, include all high priority items
  const highPriority = items.filter((i) => i.priority === "high");
  selected.push(...highPriority);

  // Then add medium priority items
  const mediumPriority = items.filter((i) => i.priority === "medium");
  const remainingSlots = targetCount - selected.length;
  if (remainingSlots > 0 && mediumPriority.length > 0) {
    if (mediumPriority.length <= remainingSlots) {
      selected.push(...mediumPriority);
    } else {
      const shuffled = [...mediumPriority].sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, remainingSlots));
    }
  }

  // Fill remaining slots with low priority (random)
  const lowPriority = items.filter((i) => i.priority === "low");
  const finalSlots = targetCount - selected.length;
  if (finalSlots > 0 && lowPriority.length > 0) {
    const shuffled = [...lowPriority].sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, finalSlots));
  }

  return selected;
}

/**
 * Builds a review item from a module
 */
function buildReviewItem(
  module: Module,
  filePath: string,
  config: SamplingConfig
): ReviewItem {
  const company = extractCompany(module, filePath);
  const { flags, repetition, readability } = runQualityChecks(module, config);
  const { priority, reason } = determinePriority(flags, company, config);

  return {
    id: `review-${module.id}-${Date.now()}`,
    filePath,
    moduleId: module.id,
    moduleTitle: module.title,
    company,
    priority,
    reason,
    flags,
    repetitionResult: repetition,
    readabilityResult: readability,
  };
}

/**
 * Main function to generate a review queue
 */
export function generateReviewQueue(
  inputFiles: string[],
  config: Partial<SamplingConfig> = {}
): ReviewQueue {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Load all modules
  const allItems: ReviewItem[] = [];
  for (const file of inputFiles) {
    const module = loadModule(file);
    if (module) {
      const item = buildReviewItem(module, file, fullConfig);
      allItems.push(item);
    }
  }

  // Calculate target sample size
  const targetCount = Math.max(1, Math.ceil(allItems.length * (fullConfig.percent / 100)));

  // Select items using stratified sampling
  const selected = selectForReview(allItems, targetCount);

  // Count by priority
  const highPriorityCount = selected.filter((i) => i.priority === "high").length;
  const mediumPriorityCount = selected.filter((i) => i.priority === "medium").length;
  const lowPriorityCount = selected.filter((i) => i.priority === "low").length;

  return {
    items: selected,
    totalModules: allItems.length,
    sampledCount: selected.length,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Formats the review queue as markdown
 */
export function formatAsMarkdown(queue: ReviewQueue): string {
  const lines: string[] = [];

  lines.push("# Review Queue");
  lines.push("");
  lines.push(`Generated: ${queue.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Modules:** ${queue.totalModules}`);
  lines.push(`- **Selected for Review:** ${queue.sampledCount}`);
  lines.push(`- **High Priority (flagged):** ${queue.highPriorityCount}`);
  lines.push(`- **Medium Priority (new companies):** ${queue.mediumPriorityCount}`);
  lines.push(`- **Low Priority (random sample):** ${queue.lowPriorityCount}`);
  lines.push("");

  // Group by priority
  const highPriority = queue.items.filter((i) => i.priority === "high");
  const mediumPriority = queue.items.filter((i) => i.priority === "medium");
  const lowPriority = queue.items.filter((i) => i.priority === "low");

  if (highPriority.length > 0) {
    lines.push("## High Priority (Flagged by Automated Checks)");
    lines.push("");
    for (const item of highPriority) {
      lines.push(`### ${item.moduleTitle}`);
      lines.push("");
      lines.push(`- **Module ID:** ${item.moduleId}`);
      lines.push(`- **Company:** ${item.company}`);
      lines.push(`- **File:** ${item.filePath}`);
      lines.push(`- **Flags:** ${item.flags.join(", ")}`);
      lines.push("");
      lines.push("**Review Checklist:**");
      lines.push("- [ ] Tone & Voice");
      lines.push("- [ ] Accuracy");
      lines.push("- [ ] Specificity");
      lines.push("- [ ] Structure & Flow");
      lines.push("- [ ] Psychology & Depth");
      lines.push("");
      lines.push("**Status:** ___PASS / FAIL___");
      lines.push("");
      lines.push("**Issues Found:**");
      lines.push("1. ");
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  if (mediumPriority.length > 0) {
    lines.push("## Medium Priority (New Companies)");
    lines.push("");
    for (const item of mediumPriority) {
      lines.push(`### ${item.moduleTitle}`);
      lines.push("");
      lines.push(`- **Module ID:** ${item.moduleId}`);
      lines.push(`- **Company:** ${item.company}`);
      lines.push(`- **File:** ${item.filePath}`);
      lines.push(`- **Reason:** ${item.reason}`);
      lines.push("");
      lines.push("**Review Checklist:**");
      lines.push("- [ ] Tone & Voice");
      lines.push("- [ ] Accuracy");
      lines.push("- [ ] Specificity");
      lines.push("- [ ] Structure & Flow");
      lines.push("- [ ] Psychology & Depth");
      lines.push("");
      lines.push("**Status:** ___PASS / FAIL___");
      lines.push("");
      lines.push("**Issues Found:**");
      lines.push("1. ");
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  if (lowPriority.length > 0) {
    lines.push("## Low Priority (Random Sample)");
    lines.push("");
    for (const item of lowPriority) {
      lines.push(`### ${item.moduleTitle}`);
      lines.push("");
      lines.push(`- **Module ID:** ${item.moduleId}`);
      lines.push(`- **Company:** ${item.company}`);
      lines.push(`- **File:** ${item.filePath}`);
      lines.push("");
      lines.push("**Review Checklist:**");
      lines.push("- [ ] Tone & Voice");
      lines.push("- [ ] Accuracy");
      lines.push("- [ ] Specificity");
      lines.push("- [ ] Structure & Flow");
      lines.push("- [ ] Psychology & Depth");
      lines.push("");
      lines.push("**Status:** ___PASS / FAIL___");
      lines.push("");
      lines.push("**Issues Found:**");
      lines.push("1. ");
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Formats the review queue as JSON
 */
export function formatAsJson(queue: ReviewQueue): string {
  return JSON.stringify(queue, null, 2);
}

/**
 * Records a review result
 */
export function recordReviewResult(
  result: ReviewResult,
  outputFile: string
): void {
  let results: ReviewResult[] = [];

  // Load existing results if file exists
  if (fs.existsSync(outputFile)) {
    try {
      const content = fs.readFileSync(outputFile, "utf-8");
      results = JSON.parse(content) as ReviewResult[];
    } catch {
      results = [];
    }
  }

  // Add new result
  results.push(result);

  // Write back
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
}

/**
 * Loads review results from file
 */
export function loadReviewResults(inputFile: string): ReviewResult[] {
  if (!fs.existsSync(inputFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(inputFile, "utf-8");
    return JSON.parse(content) as ReviewResult[];
  } catch {
    return [];
  }
}

/**
 * Gets reviewed companies from review results
 */
export function getReviewedCompanies(results: ReviewResult[]): Set<string> {
  const companies = new Set<string>();
  for (const result of results) {
    const match = result.moduleId.match(/^company-(.+)$/);
    if (match?.[1]) {
      companies.add(match[1]);
    }
  }
  return companies;
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
  percent: number;
  prioritize: string;
  output: string;
  format: "markdown" | "json";
  resultsFile: string;
  help: boolean;
} {
  const inputFiles: string[] = [];
  let percent = DEFAULT_CONFIG.percent;
  let prioritize = "all";
  let output = "";
  let format: "markdown" | "json" = "markdown";
  let resultsFile = "";
  let help = false;

  for (const arg of args) {
    if (arg.startsWith("--input=")) {
      inputFiles.push(arg.slice(8));
    } else if (arg.startsWith("--dir=")) {
      const dir = arg.slice(6);
      inputFiles.push(...getJsonFilesInDir(dir));
    } else if (arg.startsWith("--percent=")) {
      percent = parseInt(arg.slice(10), 10);
    } else if (arg.startsWith("--prioritize=")) {
      prioritize = arg.slice(13);
    } else if (arg.startsWith("--output=")) {
      output = arg.slice(9);
    } else if (arg === "--format=json") {
      format = "json";
    } else if (arg === "--format=markdown" || arg === "--format=md") {
      format = "markdown";
    } else if (arg.startsWith("--results=")) {
      resultsFile = arg.slice(10);
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }

  return { inputFiles, percent, prioritize, output, format, resultsFile, help };
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const { inputFiles, percent, prioritize, output, format, resultsFile, help } = parseArgs(args);

  if (help) {
    console.log(`
Human Review Sampling Script

Usage:
  npx ts-node scripts/quality/sample-for-review.ts --dir=output/ --percent=10
  npm run sample-for-review -- --percent=10 --prioritize=flagged

Options:
  --input=<file>        Input JSON file (can be used multiple times)
  --dir=<directory>     Check all JSON files in directory
  --percent=<n>         Percentage of content to sample (default: 10)
  --prioritize=<mode>   Prioritization mode: all|flagged|new|random (default: all)
  --output=<file>       Output file (default: stdout)
  --format=<format>     Output format: markdown|json (default: markdown)
  --results=<file>      Previous results file for tracking reviewed companies
  --help, -h            Show this help message

Prioritization Modes:
  all      Include all priorities (flagged > new > random)
  flagged  Only include flagged content
  new      Only include new companies
  random   Pure random sample (no prioritization)

Examples:
  # Generate review queue for 10% of content
  npm run sample-for-review -- --dir=output/ --percent=10

  # Only sample flagged content
  npm run sample-for-review -- --dir=output/ --prioritize=flagged

  # Output as JSON to file
  npm run sample-for-review -- --dir=output/ --format=json --output=review-queue.json
`);
    process.exit(0);
  }

  if (inputFiles.length === 0) {
    console.error("Error: No input files specified");
    console.error("Usage: sample-for-review --dir=<directory> --percent=<n>");
    process.exit(1);
  }

  // Load previous review results if provided
  let reviewedCompanies = new Set<string>();
  if (resultsFile) {
    const results = loadReviewResults(resultsFile);
    reviewedCompanies = getReviewedCompanies(results);
    console.log(`Loaded ${results.length} previous review results`);
    console.log(`${reviewedCompanies.size} companies already reviewed`);
  }

  // Configure based on prioritize flag
  const config: Partial<SamplingConfig> = {
    percent,
    reviewedCompanies,
    prioritizeFlagged: prioritize === "all" || prioritize === "flagged",
    prioritizeNew: prioritize === "all" || prioritize === "new",
  };

  // For random-only mode, disable all prioritization
  if (prioritize === "random") {
    config.prioritizeFlagged = false;
    config.prioritizeNew = false;
  }

  // Generate review queue
  console.log(`\nAnalyzing ${inputFiles.length} file(s)...`);
  const queue = generateReviewQueue(inputFiles, config);

  // Format output
  const formattedOutput = format === "json" ? formatAsJson(queue) : formatAsMarkdown(queue);

  // Write output
  if (output) {
    fs.writeFileSync(output, formattedOutput);
    console.log(`\nReview queue written to: ${output}`);
  } else {
    console.log(formattedOutput);
  }

  // Summary
  console.log("\n" + "─".repeat(50));
  console.log(`${queue.sampledCount} items selected for review`);
  console.log(`  - ${queue.highPriorityCount} flagged by automated checks`);
  console.log(`  - ${queue.mediumPriorityCount} new companies`);
  console.log(`  - ${queue.lowPriorityCount} random sample`);

  process.exit(0);
}

// Run if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("sample-for-review.ts");

if (isMainModule) {
  main();
}
