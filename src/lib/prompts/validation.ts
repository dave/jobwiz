/**
 * Validation utilities for prompt output.
 * Shared between CLI scripts and tests.
 */

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
export type PromptType = "company-culture" | "company-interview-stages" | "company-tips" | "company-trivia";

const PROMPT_SCHEMAS: Record<PromptType, z.ZodSchema> = {
  "company-culture": CulturePromptOutputSchema,
  "company-interview-stages": InterviewStagesPromptOutputSchema,
  "company-tips": TipsPromptOutputSchema,
  "company-trivia": TriviaPromptOutputSchema,
};

export interface ValidationResult {
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
