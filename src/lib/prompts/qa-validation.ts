/**
 * Validation utilities for Q&A prompt output.
 * Validates interview questions with psychology explanations.
 */

import { z } from "zod";

// ============================================================================
// Question Type Schemas
// ============================================================================

/**
 * Answer framework for behavioral questions
 */
const BehavioralFrameworkSchema = z.object({
  structure: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
  time_allocation: z.string().min(1),
});

/**
 * Answer framework for technical questions
 */
const TechnicalFrameworkSchema = z.object({
  approach: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
  follow_up_prep: z.string().min(1),
});

/**
 * Answer framework for culture questions
 */
const CultureFrameworkSchema = z.object({
  authenticity_check: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
  red_flags_to_avoid: z.array(z.string().min(1)).min(2).max(3),
});

/**
 * Answer framework for curveball questions
 */
const CurveballFrameworkSchema = z.object({
  composure_tip: z.string().min(1),
  approach: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
});

/**
 * Difficulty levels
 */
const DifficultySchema = z.enum(["easy", "medium", "hard"]);

/**
 * Curveball question types
 */
const CurveballTypeSchema = z.enum([
  "estimation",
  "hypothetical",
  "self-reflection",
  "creative",
  "pressure",
]);

// ============================================================================
// Question Schemas
// ============================================================================

/**
 * Behavioral question schema
 */
const BehavioralQuestionSchema = z.object({
  id: z.string().regex(/^beh-[a-z]+-\d{3}$/, "ID must match format: beh-{tag}-{number}"),
  question: z.string().min(10),
  interviewer_intent: z.string().min(50).max(500),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: BehavioralFrameworkSchema,
  difficulty: DifficultySchema,
  tags: z.array(z.string().min(1)).min(1),
});

/**
 * Technical question schema
 */
const TechnicalQuestionSchema = z.object({
  id: z.string().regex(/^tech-[a-z]+-\d{3}$/, "ID must match format: tech-{topic}-{number}"),
  question: z.string().min(10),
  interviewer_intent: z.string().min(50).max(500),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: TechnicalFrameworkSchema,
  difficulty: DifficultySchema,
  tags: z.array(z.string().min(1)).min(1),
});

/**
 * Culture question schema
 */
const CultureQuestionSchema = z.object({
  id: z.string().regex(/^cult-[a-z]+-\d{3}$/, "ID must match format: cult-{value}-{number}"),
  question: z.string().min(10),
  interviewer_intent: z.string().min(50).max(500),
  target_value: z.string().min(1),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: CultureFrameworkSchema,
  difficulty: DifficultySchema,
  tags: z.array(z.string().min(1)).min(1),
});

/**
 * Curveball question schema
 */
const CurveballQuestionSchema = z.object({
  id: z.string().regex(/^curve-[a-z]+-\d{3}$/, "ID must match format: curve-{type}-{number}"),
  question: z.string().min(10),
  question_type: CurveballTypeSchema,
  interviewer_intent: z.string().min(50).max(500),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: CurveballFrameworkSchema,
  difficulty: z.enum(["medium", "hard"]),
  tags: z.array(z.string().min(1)).min(1),
});

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Behavioral Q&A output schema
 */
export const BehavioralQAOutputSchema = z.object({
  category: z.literal("behavioral"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(BehavioralQuestionSchema).min(5).max(8),
});

/**
 * Technical Q&A output schema
 */
export const TechnicalQAOutputSchema = z.object({
  category: z.literal("technical"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(TechnicalQuestionSchema).min(5).max(8),
});

/**
 * Culture Q&A output schema
 */
export const CultureQAOutputSchema = z.object({
  category: z.literal("culture"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(CultureQuestionSchema).min(5).max(7),
});

/**
 * Curveball Q&A output schema
 */
export const CurveballQAOutputSchema = z.object({
  category: z.literal("curveball"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(CurveballQuestionSchema).min(4).max(6),
});

// ============================================================================
// Type Exports
// ============================================================================

export type QACategory = "behavioral" | "technical" | "culture" | "curveball";

export type BehavioralQuestion = z.infer<typeof BehavioralQuestionSchema>;
export type TechnicalQuestion = z.infer<typeof TechnicalQuestionSchema>;
export type CultureQuestion = z.infer<typeof CultureQuestionSchema>;
export type CurveballQuestion = z.infer<typeof CurveballQuestionSchema>;

export type BehavioralQAOutput = z.infer<typeof BehavioralQAOutputSchema>;
export type TechnicalQAOutput = z.infer<typeof TechnicalQAOutputSchema>;
export type CultureQAOutput = z.infer<typeof CultureQAOutputSchema>;
export type CurveballQAOutput = z.infer<typeof CurveballQAOutputSchema>;

// ============================================================================
// Validation
// ============================================================================

const QA_SCHEMAS: Record<QACategory, z.ZodSchema> = {
  behavioral: BehavioralQAOutputSchema,
  technical: TechnicalQAOutputSchema,
  culture: CultureQAOutputSchema,
  curveball: CurveballQAOutputSchema,
};

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
  "the key thing to remember",
  "don't panic",
];

export interface QAValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Extract all text content from output for analysis.
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
 * Check that interviewer_intent explains psychology, not just surface level.
 */
function checkPsychologyDepth(data: unknown): string[] {
  const warnings: string[] = [];
  const surfacePatterns = [
    /they want to (know|see) if you can/i,
    /tests? (if|whether) you/i,
    /assessing your ability to/i,
  ];

  function traverse(obj: unknown): void {
    if (obj && typeof obj === "object") {
      if ("interviewer_intent" in obj) {
        const intent = (obj as Record<string, unknown>).interviewer_intent;
        if (typeof intent === "string") {
          // Check for overly surface-level explanations
          for (const pattern of surfacePatterns) {
            if (pattern.test(intent) && intent.length < 100) {
              warnings.push(
                `Interviewer intent may be too surface-level: "${intent.slice(0, 50)}..."`
              );
              break;
            }
          }
        }
      }
      Object.values(obj as Record<string, unknown>).forEach(traverse);
    }
  }

  traverse(data);
  return warnings;
}

/**
 * Validate Q&A prompt output.
 */
export function validateQAOutput(
  data: unknown,
  category: QACategory
): QAValidationResult {
  const result: QAValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // 1. Validate against schema
  const schema = QA_SCHEMAS[category];
  if (!schema) {
    result.valid = false;
    result.errors.push(`Unknown Q&A category: ${category}`);
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

  // 2. Check for AI-sounding phrases
  const texts = extractTextContent(data);
  const aiPhrases = checkForAIPhrases(texts);
  if (aiPhrases.length > 0) {
    result.warnings.push(`AI-sounding phrases detected: ${aiPhrases.join(", ")}`);
  }

  // 3. Check for unique IDs
  const duplicateIds = checkUniqueIds(data);
  if (duplicateIds.length > 0) {
    result.valid = false;
    result.errors.push(`Duplicate IDs found: ${duplicateIds.join(", ")}`);
  }

  // 4. Check psychology depth
  const depthWarnings = checkPsychologyDepth(data);
  result.warnings.push(...depthWarnings);

  return result;
}

/**
 * Check if Q&A output teaches thinking frameworks, not memorization.
 */
export function checkTeachesThinking(data: unknown): boolean {
  const texts = extractTextContent(data);
  const combined = texts.join(" ").toLowerCase();

  // Should NOT contain scripted answers
  const scriptedPatterns = [
    /say something like/i,
    /respond with/i,
    /your answer should be/i,
    /say: "/i,
  ];

  for (const pattern of scriptedPatterns) {
    if (pattern.test(combined)) {
      return false;
    }
  }

  // Should contain framework language
  const frameworkPatterns = [
    /framework/i,
    /structure/i,
    /approach/i,
    /elements/i,
    /key_elements/i,
  ];

  let frameworkCount = 0;
  for (const pattern of frameworkPatterns) {
    if (pattern.test(combined)) {
      frameworkCount++;
    }
  }

  return frameworkCount >= 2;
}

/**
 * Check if Q&A output is role-specific.
 */
export function checkRoleSpecific(
  data: unknown,
  roleSlug: string
): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const output = data as { role_slug?: string };
  return output.role_slug === roleSlug;
}

/**
 * Check if Q&A output is company-specific.
 */
export function checkCompanySpecific(
  data: unknown,
  companySlug: string
): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const output = data as { company_slug?: string };
  return output.company_slug === companySlug;
}
