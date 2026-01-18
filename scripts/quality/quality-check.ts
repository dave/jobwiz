#!/usr/bin/env ts-node
/**
 * Quality Control Pipeline Script
 *
 * Runs all quality checks on content:
 * - Repetition detection
 * - Readability scoring
 * - Fact verification
 *
 * Usage:
 *   npx ts-node scripts/quality/quality-check.ts --input=file.json
 *   npx ts-node scripts/quality/quality-check.ts --dir=output/
 *   npm run quality-check -- --input=file.json
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { Module, ContentBlock, ChecklistItem } from "../../src/types/module";

// ============================================================================
// INLINE IMPLEMENTATIONS (to avoid ESM import issues with ts-node)
// These are simplified versions of the check functions from the other scripts
// ============================================================================

// --- Repetition Detection (from check-repetition.ts) ---

const COMMON_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "can", "this", "that", "these", "those", "it", "its",
  "you", "your", "we", "our", "they", "their", "he", "she", "him", "her", "i",
  "me", "my", "not", "no", "yes", "all", "any", "some", "more", "most", "other",
  "into", "out", "up", "down", "about", "after", "before", "between", "through",
  "during", "under", "above", "over", "again", "then", "than", "so", "if",
  "when", "where", "who", "what", "which", "how", "why", "each", "every",
  "both", "few", "many", "much", "such", "very", "just", "also", "only", "even",
  "now", "here", "there",
]);

const AI_PHRASES = [
  "in conclusion", "in summary", "to summarize", "it is important to note",
  "it is worth noting", "it should be noted", "as mentioned earlier",
  "as previously mentioned", "as discussed", "moving forward",
  "at the end of the day", "let's dive in", "let's explore", "in this section",
  "in today's", "in the following", "first and foremost", "last but not least",
  "without further ado", "it goes without saying", "needless to say",
  "to be honest", "in order to", "due to the fact that", "for the purpose of",
  "in the event that", "at this point in time", "on a daily basis",
  "a wide variety of", "a large number of", "take into consideration",
  "make sure to", "keep in mind", "important to remember",
];

interface RepetitionConfig {
  minPhraseLength: number;
  maxPhraseLength: number;
  threshold: number;
  checkAIPhrases: boolean;
}

interface PhraseLocation {
  moduleId: string;
  sectionId: string;
  blockId: string;
  blockType: string;
}

interface RepeatedPhrase {
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

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTextForAI(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u0060\u00B4]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateNGrams(text: string, minN: number, maxN: number): string[] {
  const words = normalizeText(text).split(" ");
  const ngrams: string[] = [];
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(" ");
      const phraseWords = phrase.split(" ");
      const nonCommonWords = phraseWords.filter(
        (w) => !COMMON_WORDS.has(w) && w.length > 1
      );
      if (nonCommonWords.length >= Math.max(1, Math.ceil(phraseWords.length / 2))) {
        ngrams.push(phrase);
      }
    }
  }
  return ngrams;
}

function checkForAIPhrases(
  textItems: Array<{ text: string; location: PhraseLocation }>
): RepeatedPhrase[] {
  const results: RepeatedPhrase[] = [];
  const phraseMap = new Map<string, PhraseLocation[]>();
  for (const { text, location } of textItems) {
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
      results.push({ phrase, count: locations.length, locations, isAIPhrase: true });
    }
  }
  return results.sort((a, b) => b.count - a.count);
}

function findRepeatedPhrases(
  textItems: Array<{ text: string; location: PhraseLocation }>,
  config: RepetitionConfig
): RepeatedPhrase[] {
  const phraseMap = new Map<string, PhraseLocation[]>();
  for (const { text, location } of textItems) {
    const ngrams = generateNGrams(text, config.minPhraseLength, config.maxPhraseLength);
    for (const phrase of ngrams) {
      const existing = phraseMap.get(phrase) ?? [];
      existing.push(location);
      phraseMap.set(phrase, existing);
    }
  }
  const results: RepeatedPhrase[] = [];
  for (const [phrase, locations] of phraseMap) {
    if (locations.length >= config.threshold) {
      results.push({ phrase, count: locations.length, locations, isAIPhrase: false });
    }
  }
  return results.sort((a, b) => b.count - a.count);
}

function analyzeRepetition(
  modules: Module[],
  config: Partial<RepetitionConfig> = {}
): RepetitionResult {
  const fullConfig: RepetitionConfig = {
    minPhraseLength: 3,
    maxPhraseLength: 8,
    threshold: 3,
    checkAIPhrases: true,
    ...config,
  };

  const allText: Array<{ text: string; location: PhraseLocation }> = [];
  for (const module of modules) {
    allText.push(...extractTextWithLocations(module));
  }

  const repeatedPhrases = findRepeatedPhrases(allText, fullConfig);
  const aiPhrases = fullConfig.checkAIPhrases ? checkForAIPhrases(allText) : [];
  const pass = repeatedPhrases.length === 0 && aiPhrases.length === 0;

  const summaryParts: string[] = [];
  if (repeatedPhrases.length > 0) {
    summaryParts.push(`${repeatedPhrases.length} repeated phrase(s) found`);
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

// --- Readability Analysis (from check-readability.ts) ---

interface ReadabilityConfig {
  minScore: number;
  maxScore: number;
  perSection: boolean;
}

interface SectionScore {
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

function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function countSentences(text: string): number {
  if (!text.trim()) return 0;
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return text.trim().length > 0 ? 1 : 0;
  return sentences.length;
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

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

function extractAllText(module: Module): string {
  const texts: string[] = [];
  for (const section of module.sections) {
    for (const block of section.blocks) {
      const text = extractTextFromBlock(block);
      if (text.trim()) texts.push(text);
    }
  }
  return texts.join(" ");
}

function getStatus(
  score: number,
  minScore: number,
  maxScore: number
): "pass" | "too_complex" | "too_simple" {
  if (score < minScore) return "too_complex";
  if (score > maxScore) return "too_simple";
  return "pass";
}

function analyzeReadability(
  modules: Module[],
  config: Partial<ReadabilityConfig> = {}
): ReadabilityResult {
  const fullConfig: ReadabilityConfig = { minScore: 50, maxScore: 80, perSection: false, ...config };
  const allText = modules.map((m) => extractAllText(m)).join(" ");
  const wordCount = countWords(allText);
  const sentenceCount = countSentences(allText);
  const syllableCount = countTotalSyllables(allText);
  const score = calculateFleschKincaid(wordCount, sentenceCount, syllableCount);
  const status = getStatus(score, fullConfig.minScore, fullConfig.maxScore);
  const pass = status === "pass";

  let summary = `Score: ${score.toFixed(1)} `;
  if (status === "too_complex") {
    summary += `(FAIL - too complex, below ${fullConfig.minScore})`;
  } else if (status === "too_simple") {
    summary += `(FAIL - too simple, above ${fullConfig.maxScore})`;
  } else {
    summary += `(PASS - within ${fullConfig.minScore}-${fullConfig.maxScore} range)`;
  }

  return {
    pass,
    score,
    wordCount,
    sentenceCount,
    syllableCount,
    status,
    sectionScores: [],
    summary,
  };
}

// --- Fact Extraction (from check-facts.ts) ---

type FactType =
  | "founding_year" | "founders" | "headquarters" | "employee_count"
  | "mission" | "ceo" | "interview_process" | "culture_claim"
  | "product" | "acquisition" | "revenue" | "other";

const VERIFICATION_SOURCES: Record<FactType, string[]> = {
  founding_year: ["Wikipedia", "company website (About page)"],
  founders: ["Wikipedia", "company website (Leadership page)"],
  headquarters: ["Wikipedia", "company website (Contact/About page)"],
  employee_count: ["Wikipedia", "LinkedIn company page", "annual report"],
  mission: ["company website (Mission/About page)"],
  ceo: ["Wikipedia", "company website (Leadership page)", "LinkedIn"],
  interview_process: ["Glassdoor interviews", "Blind app", "Reddit r/cscareerquestions"],
  culture_claim: ["Glassdoor reviews", "Blind app", "LinkedIn reviews"],
  product: ["company website (Products page)", "Wikipedia"],
  acquisition: ["Wikipedia", "Crunchbase", "press releases"],
  revenue: ["annual report", "SEC filings", "Wikipedia"],
  other: ["company website", "Wikipedia"],
};

interface FactPattern {
  type: FactType;
  patterns: RegExp[];
  extractValue: (match: RegExpMatchArray, fullText: string) => string;
}

const FACT_PATTERNS: FactPattern[] = [
  {
    type: "founding_year",
    patterns: [
      /(?:founded|established|started|began|created)\s+(?:in\s+)?(\d{4})/gi,
      /(?:since|from)\s+(\d{4})/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  {
    type: "founders",
    patterns: [
      /\*\*Founded:\*\*\s*\d{4}\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)/gi,
      /(?:founded|started|created|established)\s+(?:in\s+)?\d{4}\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  {
    type: "headquarters",
    patterns: [
      /\*\*Headquarters:\*\*\s*([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/gi,
      /(?:headquarters?|headquartered|based|located)\s*(?:in|:)\s*([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  {
    type: "employee_count",
    patterns: [
      /(?:approximately|about|over|around|nearly)?\s*([\d,]+)\s*(?:\+\s*)?(?:employees?|staff|workers|team members)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  {
    type: "ceo",
    patterns: [
      /\*\*CEO:\*\*\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /CEO\s*(?:is|:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  {
    type: "interview_process",
    patterns: [
      /(\d+(?:-\d+)?)\s*(?:rounds?|interviews?|stages?)/gi,
    ],
    extractValue: (match) => match[0] ?? "",
  },
];

interface ExtractedFact {
  id: string;
  type: FactType;
  value: string;
  context: string;
  location: PhraseLocation;
  verificationSources: string[];
  status: "unverified" | "verified" | "disputed";
}

export interface FactCheckResult {
  moduleId: string;
  companySlug?: string;
  totalFacts: number;
  facts: ExtractedFact[];
  factsByType: Record<FactType, ExtractedFact[]>;
  confidenceScore: number;
  markdown: string;
}

function getSentenceContext(text: string, matchIndex: number, matchLength: number): string {
  const before = text.substring(0, matchIndex);
  const after = text.substring(matchIndex + matchLength);
  const sentenceStart = Math.max(0, matchIndex - 100);
  const sentenceEnd = Math.min(text.length, matchIndex + matchLength + 100);
  return text.substring(sentenceStart, sentenceEnd).trim();
}

function extractFactsFromText(text: string, location: PhraseLocation): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  let factIndex = 0;
  for (const pattern of FACT_PATTERNS) {
    for (const regex of pattern.patterns) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const value = pattern.extractValue(match, text).trim();
        if (value && value.length > 1) {
          const isDuplicate = facts.some(
            (f) => f.type === pattern.type && f.value.toLowerCase() === value.toLowerCase()
          );
          if (!isDuplicate) {
            factIndex++;
            facts.push({
              id: `fact-${location.moduleId}-${factIndex}`,
              type: pattern.type,
              value,
              context: getSentenceContext(text, match.index, match[0].length),
              location,
              verificationSources: VERIFICATION_SOURCES[pattern.type] ?? [],
              status: "unverified",
            });
          }
        }
      }
    }
  }
  return facts;
}

function extractFactsFromModule(module: Module): FactCheckResult {
  const allFacts: ExtractedFact[] = [];
  const factsByType: Record<FactType, ExtractedFact[]> = {
    founding_year: [], founders: [], headquarters: [], employee_count: [],
    mission: [], ceo: [], interview_process: [], culture_claim: [],
    product: [], acquisition: [], revenue: [], other: [],
  };

  for (const section of module.sections) {
    for (const block of section.blocks) {
      const text = extractTextFromBlock(block);
      if (text.trim()) {
        const location: PhraseLocation = {
          moduleId: module.id, sectionId: section.id,
          blockId: block.id, blockType: block.type,
        };
        const facts = extractFactsFromText(text, location);
        for (const fact of facts) {
          const isDuplicate = allFacts.some(
            (f) => f.type === fact.type && f.value.toLowerCase() === fact.value.toLowerCase()
          );
          if (!isDuplicate) {
            allFacts.push(fact);
            factsByType[fact.type].push(fact);
          }
        }
      }
    }
  }

  const verifiableFacts = allFacts.filter(
    (f) => ["founding_year", "founders", "headquarters", "ceo", "mission"].includes(f.type)
  );
  const hardToVerifyFacts = allFacts.filter(
    (f) => ["culture_claim", "interview_process"].includes(f.type)
  );

  let confidenceScore = 100;
  if (allFacts.length > 0) {
    const hardToVerifyRatio = hardToVerifyFacts.length / allFacts.length;
    confidenceScore = Math.round(100 - hardToVerifyRatio * 30);
    const verifiableRatio = verifiableFacts.length / allFacts.length;
    confidenceScore = Math.min(100, confidenceScore + verifiableRatio * 10);
  }

  return {
    moduleId: module.id,
    companySlug: (module as Module & { companySlug?: string }).companySlug,
    totalFacts: allFacts.length,
    facts: allFacts,
    factsByType,
    confidenceScore,
    markdown: `# Facts for ${module.id}\n\nTotal facts: ${allFacts.length}`,
  };
}

// ============================================================================
// QUALITY CHECK PIPELINE
// ============================================================================

export interface QualityConfig {
  repetitionThreshold: number;
  readabilityMinScore: number;
  readabilityMaxScore: number;
  factsMinConfidence: number;
}

const DEFAULT_CONFIG: QualityConfig = {
  repetitionThreshold: 3,
  readabilityMinScore: 50,
  readabilityMaxScore: 80,
  factsMinConfidence: 70,
};

export interface QualityCheckResult {
  repetition: RepetitionResult;
  readability: ReadabilityResult;
  facts: FactCheckResult[];
  overall: {
    pass: boolean;
    flaggedForReview: boolean;
    summary: string;
    checks: {
      repetition: "PASS" | "FAIL";
      readability: "PASS" | "FAIL";
      facts: "PASS" | "REVIEW NEEDED";
    };
  };
}

export function runQualityChecks(
  modules: Module[],
  config: Partial<QualityConfig> = {}
): QualityCheckResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const repetition = analyzeRepetition(modules, { threshold: fullConfig.repetitionThreshold });
  const readability = analyzeReadability(modules, {
    minScore: fullConfig.readabilityMinScore,
    maxScore: fullConfig.readabilityMaxScore,
  });
  const facts: FactCheckResult[] = modules.map((m) => extractFactsFromModule(m));

  const repetitionStatus = repetition.pass ? "PASS" : "FAIL";
  const readabilityStatus = readability.pass ? "PASS" : "FAIL";
  const needsFactReview = facts.some(
    (f) => f.confidenceScore < fullConfig.factsMinConfidence || f.totalFacts > 0
  );
  const factsStatus = needsFactReview ? "REVIEW NEEDED" : "PASS";

  const hasFatalFailure = !repetition.pass || !readability.pass;
  const pass = !hasFatalFailure && !needsFactReview;
  const flaggedForReview = needsFactReview && !hasFatalFailure;

  const summaryParts: string[] = [];
  if (!repetition.pass) summaryParts.push(`Repetition issues found`);
  if (!readability.pass) summaryParts.push(`Readability outside range`);
  if (needsFactReview) {
    const totalFacts = facts.reduce((sum, f) => sum + f.totalFacts, 0);
    summaryParts.push(`${totalFacts} fact(s) to verify`);
  }
  if (pass) summaryParts.push("All checks passed");

  return {
    repetition,
    readability,
    facts,
    overall: {
      pass,
      flaggedForReview,
      summary: summaryParts.join("; "),
      checks: { repetition: repetitionStatus, readability: readabilityStatus, facts: factsStatus },
    },
  };
}

function isModule(obj: unknown): obj is Module {
  return (
    typeof obj === "object" && obj !== null &&
    "id" in obj && "sections" in obj &&
    Array.isArray((obj as Module).sections)
  );
}

function loadModule(filePath: string): Module | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as unknown;
    if (!isModule(data)) return null;
    return data;
  } catch (e) {
    console.error(`Error loading ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

function getJsonFilesInDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter((f) => f.endsWith(".json")).map((f) => path.join(dirPath, f));
}

function parseArgs(args: string[]): { inputFiles: string[]; verbose: boolean; help: boolean } {
  const inputFiles: string[] = [];
  let verbose = false;
  let help = false;

  for (const arg of args) {
    if (arg.startsWith("--input=")) inputFiles.push(arg.slice(8));
    else if (arg.startsWith("--dir=")) inputFiles.push(...getJsonFilesInDir(arg.slice(6)));
    else if (arg === "--verbose" || arg === "-v") verbose = true;
    else if (arg === "--help" || arg === "-h") help = true;
  }

  return { inputFiles, verbose, help };
}

function formatOutput(result: QualityCheckResult, verbose: boolean): string {
  const lines: string[] = [];

  lines.push("\n" + "=".repeat(60));
  lines.push("  QUALITY CONTROL PIPELINE RESULTS");
  lines.push("=".repeat(60));

  lines.push("");
  lines.push(`- Repetition: ${result.overall.checks.repetition}${result.repetition.totalPhrases > 0 ? ` (${result.repetition.totalPhrases} issue${result.repetition.totalPhrases !== 1 ? "s" : ""})` : " (0 duplicates)"}`);
  lines.push(`- Readability: ${result.overall.checks.readability} (score: ${result.readability.score.toFixed(0)})`);

  const totalFacts = result.facts.reduce((sum, f) => sum + f.totalFacts, 0);
  lines.push(`- Facts: ${result.overall.checks.facts}${totalFacts > 0 ? ` (${totalFacts} claim${totalFacts !== 1 ? "s" : ""} to verify)` : ""}`);

  if (verbose) {
    if (result.repetition.aiPhrases.length > 0 || result.repetition.repeatedPhrases.length > 0) {
      lines.push("\n" + "-".repeat(40));
      lines.push("REPETITION DETAILS:");
      if (result.repetition.aiPhrases.length > 0) {
        lines.push("\n  AI Phrases Detected:");
        for (const phrase of result.repetition.aiPhrases.slice(0, 5)) {
          lines.push(`    - "${phrase.phrase}" (${phrase.count}x)`);
        }
      }
    }

    lines.push("\n" + "-".repeat(40));
    lines.push("READABILITY DETAILS:");
    lines.push(`  Score: ${result.readability.score.toFixed(1)}`);
    lines.push(`  Words: ${result.readability.wordCount}`);
    lines.push(`  Sentences: ${result.readability.sentenceCount}`);
    lines.push(`  Status: ${result.readability.status}`);

    if (totalFacts > 0) {
      lines.push("\n" + "-".repeat(40));
      lines.push("FACTS REQUIRING VERIFICATION:");
      for (const factResult of result.facts) {
        if (factResult.totalFacts > 0) {
          lines.push(`\n  Module: ${factResult.moduleId}`);
          for (const fact of factResult.facts.slice(0, 5)) {
            lines.push(`    - [${fact.type}] ${fact.value}`);
          }
        }
      }
    }
  }

  lines.push("\n" + "=".repeat(60));
  if (result.overall.pass) lines.push("  OVERALL: PASS");
  else if (result.overall.flaggedForReview) lines.push("  OVERALL: REVIEW NEEDED");
  else lines.push("  OVERALL: FAIL");
  lines.push("  " + result.overall.summary);
  lines.push("=".repeat(60));

  return lines.join("\n");
}

function main(): void {
  const args = process.argv.slice(2);
  const { inputFiles, verbose, help } = parseArgs(args);

  if (help) {
    console.log(`
Quality Control Pipeline

Runs all quality checks on content modules:
- Repetition detection (AI phrases, repeated content)
- Readability scoring (Flesch-Kincaid)
- Fact verification (claims requiring verification)

Usage:
  npx ts-node scripts/quality/quality-check.ts --input=file.json
  npx ts-node scripts/quality/quality-check.ts --dir=output/
  npm run quality-check -- --input=file.json

Options:
  --input=<file>      Input JSON file (can be used multiple times)
  --dir=<directory>   Check all JSON files in directory
  --verbose, -v       Show detailed results
  --help, -h          Show this help message

Exit Codes:
  0  Pass (all checks passed)
  1  Fail (quality issues found)
  2  Review needed (facts to verify, but no failures)
`);
    process.exit(0);
  }

  if (inputFiles.length === 0) {
    console.error("Error: No input files specified");
    console.error("Usage: quality-check --input=<file.json> | --dir=<directory>");
    process.exit(1);
  }

  const modules: Module[] = [];
  for (const file of inputFiles) {
    const module = loadModule(file);
    if (module) modules.push(module);
  }

  if (modules.length === 0) {
    console.error("Error: No valid modules loaded");
    process.exit(1);
  }

  console.log(`\nAnalyzing ${modules.length} module(s)...`);
  const result = runQualityChecks(modules);
  console.log(formatOutput(result, verbose));

  if (result.overall.pass) process.exit(0);
  else if (result.overall.flaggedForReview) process.exit(2);
  else process.exit(1);
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("quality-check.ts");

if (isMainModule) {
  main();
}
