#!/usr/bin/env npx ts-node

/**
 * Validates prompt output against the Module schema.
 *
 * Usage:
 *   npm run validate-prompt -- --prompt=company-culture --input=samples/google.json
 *   npm run validate-prompt -- --file=output/company-google-culture.json
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

// Content block schemas based on src/types/module.ts
const HeaderBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("header"),
  content: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const TextBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("text"),
  content: z.string().min(1),
});

const QuoteBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("quote"),
  content: z.string().min(1),
  author: z.string().optional(),
});

const TipBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("tip"),
  content: z.string().min(1),
});

const WarningBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("warning"),
  content: z.string().min(1),
});

const QuizOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const QuizBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("quiz"),
  question: z.string().min(1),
  options: z.array(QuizOptionSchema).min(2).max(6),
  explanation: z.string().optional(),
  multiSelect: z.boolean().optional(),
});

const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  required: z.boolean().optional(),
});

const ChecklistBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("checklist"),
  title: z.string().optional(),
  items: z.array(ChecklistItemSchema).min(1),
});

const InfographicBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("infographic"),
  url: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

// Union of all allowed content blocks
const ContentBlockSchema = z.discriminatedUnion("type", [
  HeaderBlockSchema,
  TextBlockSchema,
  QuoteBlockSchema,
  TipBlockSchema,
  WarningBlockSchema,
  QuizBlockSchema,
  ChecklistBlockSchema,
  InfographicBlockSchema,
]);

// Section schema
const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(ContentBlockSchema).min(1),
});

// Prompt output schemas for each prompt type
const CulturePromptOutputSchema = z.object({
  section: SectionSchema,
});

const InterviewStagesPromptOutputSchema = z.object({
  section: SectionSchema,
});

const TipsPromptOutputSchema = z.object({
  sections: z.array(SectionSchema).length(2),
});

const TriviaPromptOutputSchema = z.object({
  section: SectionSchema,
});

// AI-sounding phrases to detect
const AI_PHRASES = [
  "in conclusion",
  "furthermore",
  "additionally",
  "it is important to note",
  "it's worth noting",
  "let's dive in",
  "here's the thing",
  "at the end of the day",
  "that being said",
  "without further ado",
  "the bottom line is",
  "fun fact",
  "did you know",
];

// Prompt type definitions
type PromptType = "company-culture" | "company-interview-stages" | "company-tips" | "company-trivia";

const PROMPT_SCHEMAS: Record<PromptType, z.ZodSchema> = {
  "company-culture": CulturePromptOutputSchema,
  "company-interview-stages": InterviewStagesPromptOutputSchema,
  "company-tips": TipsPromptOutputSchema,
  "company-trivia": TriviaPromptOutputSchema,
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Extract all text content from blocks for analysis.
 */
function extractTextContent(data: unknown): string[] {
  const texts: string[] = [];

  function traverse(obj: unknown): void {
    if (typeof obj === "string") {
      texts.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (obj && typeof obj === "object") {
      Object.values(obj as Record<string, unknown>).forEach(traverse);
    }
  }

  traverse(data);
  return texts;
}

/**
 * Check for AI-sounding phrases in content.
 */
function checkForAIPhrases(texts: string[]): string[] {
  const found: string[] = [];
  const combined = texts.join(" ").toLowerCase();

  for (const phrase of AI_PHRASES) {
    if (combined.includes(phrase)) {
      found.push(phrase);
    }
  }

  return found;
}

/**
 * Check that all IDs are unique.
 */
function checkUniqueIds(data: unknown): string[] {
  const ids: string[] = [];
  const duplicates: string[] = [];

  function traverse(obj: unknown): void {
    if (obj && typeof obj === "object") {
      if ("id" in obj && typeof (obj as Record<string, unknown>).id === "string") {
        const id = (obj as Record<string, unknown>).id as string;
        if (ids.includes(id)) {
          duplicates.push(id);
        } else {
          ids.push(id);
        }
      }
      Object.values(obj as Record<string, unknown>).forEach(traverse);
    }
  }

  traverse(data);
  return duplicates;
}

/**
 * Validate prompt output.
 */
export function validatePromptOutput(
  data: unknown,
  promptType: PromptType
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // 1. Check JSON is valid (already parsed if we got here)

  // 2. Validate against schema
  const schema = PROMPT_SCHEMAS[promptType];
  if (!schema) {
    result.valid = false;
    result.errors.push(`Unknown prompt type: ${promptType}`);
    return result;
  }

  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    result.valid = false;
    result.errors.push("Schema validation failed:");
    for (const issue of parseResult.error.issues) {
      result.errors.push(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    return result;
  }

  // 3. Check for AI-sounding phrases
  const texts = extractTextContent(data);
  const aiPhrases = checkForAIPhrases(texts);
  if (aiPhrases.length > 0) {
    result.warnings.push(`AI-sounding phrases detected: ${aiPhrases.join(", ")}`);
  }

  // 4. Check for unique IDs
  const duplicateIds = checkUniqueIds(data);
  if (duplicateIds.length > 0) {
    result.valid = false;
    result.errors.push(`Duplicate IDs found: ${duplicateIds.join(", ")}`);
  }

  // 5. Check quiz blocks have exactly 1 correct answer
  function checkQuizzes(obj: unknown): void {
    if (obj && typeof obj === "object") {
      if ((obj as Record<string, unknown>).type === "quiz") {
        const quizObj = obj as { options: Array<{ isCorrect: boolean }> };
        const correctCount = quizObj.options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          result.valid = false;
          result.errors.push(
            `Quiz has ${correctCount} correct answers (expected 1)`
          );
        }
      }
      Object.values(obj as Record<string, unknown>).forEach(checkQuizzes);
    }
  }
  checkQuizzes(data);

  // 6. Check word count (optional warning)
  const allText = texts.join(" ");
  const wordCount = allText.split(/\s+/).length;
  if (wordCount > 1000) {
    result.warnings.push(`High word count: ${wordCount} words`);
  }

  return result;
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key && value) {
        argMap[key] = value;
      }
    }
  }

  // Parse arguments
  let jsonData: unknown;
  let promptType: PromptType;

  if (argMap.file) {
    // Read from file
    const filePath = path.resolve(argMap.file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      jsonData = JSON.parse(content);
    } catch (e) {
      console.error(`Invalid JSON in file: ${(e as Error).message}`);
      process.exit(1);
    }

    // Infer prompt type from filename
    if (filePath.includes("culture")) {
      promptType = "company-culture";
    } else if (filePath.includes("interview") || filePath.includes("stages")) {
      promptType = "company-interview-stages";
    } else if (filePath.includes("tips") || filePath.includes("flags")) {
      promptType = "company-tips";
    } else if (filePath.includes("trivia")) {
      promptType = "company-trivia";
    } else {
      console.error(
        "Could not infer prompt type from filename. Use --prompt=<type>"
      );
      process.exit(1);
    }
  } else if (argMap.prompt && argMap.input) {
    // Load input file and validate prompt type
    const inputPath = path.resolve(argMap.input);
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file not found: ${inputPath}`);
      process.exit(1);
    }

    try {
      const content = fs.readFileSync(inputPath, "utf-8");
      jsonData = JSON.parse(content);
    } catch (e) {
      console.error(`Invalid JSON in input file: ${(e as Error).message}`);
      process.exit(1);
    }

    promptType = argMap.prompt as PromptType;
    if (!PROMPT_SCHEMAS[promptType]) {
      console.error(`Unknown prompt type: ${promptType}`);
      console.error(
        `Valid types: ${Object.keys(PROMPT_SCHEMAS).join(", ")}`
      );
      process.exit(1);
    }
  } else {
    console.error("Usage:");
    console.error(
      "  npm run validate-prompt -- --prompt=company-culture --input=output.json"
    );
    console.error("  npm run validate-prompt -- --file=output/module.json");
    process.exit(1);
  }

  // Validate
  const result = validatePromptOutput(jsonData, promptType);

  // Output results
  if (result.valid) {
    console.log("✓ Output is valid JSON matching Module schema");
  } else {
    console.log("✗ Validation failed:");
    for (const error of result.errors) {
      console.log(`  ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }

  process.exit(result.valid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
