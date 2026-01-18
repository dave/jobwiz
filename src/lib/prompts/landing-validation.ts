/**
 * Validation utilities for landing page prompt output.
 * Shared between CLI scripts and tests.
 */

import { z } from "zod";

// ============================================================================
// Schema Definitions
// ============================================================================

// Headline schema
const HeadlineAngleSchema = z.enum(["insider", "transformation", "fear", "authority", "specificity"]);

const HeadlineVariationSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1).max(100), // ~12 words max
  subheadline: z.string().min(1).max(200), // ~25 words max
  angle: HeadlineAngleSchema,
});

export const HeadlineOutputSchema = z.object({
  headlines: z.array(HeadlineVariationSchema).min(3),
});

// Bullets schema
const IconSuggestionSchema = z.enum([
  "brain", "target", "shield", "clock", "star",
  "check", "play", "users", "chart",
]);

const LearnBulletSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(100), // ~15 words
  icon_suggestion: IconSuggestionSchema,
});

const IncludedBulletSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(100), // ~15 words
  quantity: z.string().nullable().optional(),
});

export const BulletsOutputSchema = z.object({
  learn_bullets: z.array(LearnBulletSchema).min(4).max(6),
  included_bullets: z.array(IncludedBulletSchema).min(4).max(6),
});

// CTA schema
const UrgencyTypeSchema = z.enum(["none", "time", "value", "social"]);

const PrimaryCtaSchema = z.object({
  id: z.string().min(1),
  button_text: z.string().min(1).max(30), // 2-5 words
  supporting_text: z.string().max(100).nullable().optional(),
  urgency_type: UrgencyTypeSchema,
});

const SecondaryCtaSchema = z.object({
  id: z.string().min(1),
  button_text: z.string().min(1).max(30), // 2-5 words
  supporting_text: z.string().max(100).nullable().optional(),
});

export const CtaOutputSchema = z.object({
  primary_cta: z.array(PrimaryCtaSchema).min(3),
  secondary_cta: z.array(SecondaryCtaSchema).min(2),
});

// Meta schema
export const MetaOutputSchema = z.object({
  meta_title: z.string().min(1).max(60),
  meta_description: z.string().min(1).max(160),
  og_title: z.string().min(1).max(60),
  og_description: z.string().min(1).max(200),
  keywords: z.array(z.string().min(1)).min(5).max(10),
});

// Combined landing copy output
export const LandingCopyOutputSchema = z.object({
  headlines: HeadlineOutputSchema.shape.headlines,
  learn_bullets: BulletsOutputSchema.shape.learn_bullets,
  included_bullets: BulletsOutputSchema.shape.included_bullets,
  primary_cta: CtaOutputSchema.shape.primary_cta,
  secondary_cta: CtaOutputSchema.shape.secondary_cta,
  meta_title: MetaOutputSchema.shape.meta_title,
  meta_description: MetaOutputSchema.shape.meta_description,
  og_title: MetaOutputSchema.shape.og_title,
  og_description: MetaOutputSchema.shape.og_description,
  keywords: MetaOutputSchema.shape.keywords,
});

// ============================================================================
// Types
// ============================================================================

export type LandingPromptType = "landing-headline" | "landing-bullets" | "landing-cta" | "landing-meta" | "landing-full";

export type HeadlineAngle = z.infer<typeof HeadlineAngleSchema>;
export type UrgencyType = z.infer<typeof UrgencyTypeSchema>;
export type HeadlineOutput = z.infer<typeof HeadlineOutputSchema>;
export type BulletsOutput = z.infer<typeof BulletsOutputSchema>;
export type CtaOutput = z.infer<typeof CtaOutputSchema>;
export type MetaOutput = z.infer<typeof MetaOutputSchema>;
export type LandingCopyOutput = z.infer<typeof LandingCopyOutputSchema>;

const LANDING_PROMPT_SCHEMAS: Record<LandingPromptType, z.ZodSchema> = {
  "landing-headline": HeadlineOutputSchema,
  "landing-bullets": BulletsOutputSchema,
  "landing-cta": CtaOutputSchema,
  "landing-meta": MetaOutputSchema,
  "landing-full": LandingCopyOutputSchema,
};

// ============================================================================
// Validation Functions
// ============================================================================

export interface LandingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
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
 * Count words in a string.
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Check headline word counts.
 */
function checkHeadlineWordCounts(data: unknown): string[] {
  const warnings: string[] = [];

  if (data && typeof data === "object" && "headlines" in data) {
    const headlines = (data as { headlines: Array<{ id: string; headline: string; subheadline: string }> }).headlines;
    for (const h of headlines) {
      const headlineWords = countWords(h.headline);
      const subheadlineWords = countWords(h.subheadline);

      if (headlineWords > 12) {
        warnings.push(`Headline "${h.id}" has ${headlineWords} words (max 12)`);
      }
      if (subheadlineWords > 25) {
        warnings.push(`Subheadline "${h.id}" has ${subheadlineWords} words (max 25)`);
      }
    }
  }

  return warnings;
}

/**
 * Check CTA button word counts.
 */
function checkCtaWordCounts(data: unknown): string[] {
  const warnings: string[] = [];

  if (data && typeof data === "object") {
    const checkCtas = (ctas: Array<{ id: string; button_text: string }>, type: string) => {
      for (const cta of ctas) {
        const words = countWords(cta.button_text);
        if (words < 2) {
          warnings.push(`${type} CTA "${cta.id}" has only ${words} word (min 2)`);
        }
        if (words > 5) {
          warnings.push(`${type} CTA "${cta.id}" has ${words} words (max 5)`);
        }
      }
    };

    if ("primary_cta" in data) {
      checkCtas((data as { primary_cta: Array<{ id: string; button_text: string }> }).primary_cta, "Primary");
    }
    if ("secondary_cta" in data) {
      checkCtas((data as { secondary_cta: Array<{ id: string; button_text: string }> }).secondary_cta, "Secondary");
    }
  }

  return warnings;
}

/**
 * Check meta character counts.
 */
function checkMetaCharCounts(data: unknown): string[] {
  const warnings: string[] = [];

  if (data && typeof data === "object") {
    if ("meta_title" in data) {
      const title = (data as { meta_title: string }).meta_title;
      if (title.length > 60) {
        warnings.push(`Meta title is ${title.length} chars (max 60)`);
      }
    }
    if ("meta_description" in data) {
      const desc = (data as { meta_description: string }).meta_description;
      if (desc.length > 160) {
        warnings.push(`Meta description is ${desc.length} chars (max 160)`);
      }
    }
  }

  return warnings;
}

/**
 * Check that content mentions company name.
 */
function checkCompanyMention(data: unknown, companyName: string): boolean {
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
  const combined = texts.join(" ").toLowerCase();
  return combined.includes(companyName.toLowerCase());
}

/**
 * Check that content mentions role name.
 */
function checkRoleMention(data: unknown, roleName: string): boolean {
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
  const combined = texts.join(" ").toLowerCase();
  return combined.includes(roleName.toLowerCase());
}

/**
 * Validate landing page prompt output.
 */
export function validateLandingOutput(
  data: unknown,
  promptType: LandingPromptType,
  context?: { companyName?: string; roleName?: string }
): LandingValidationResult {
  const result: LandingValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // 1. Validate against schema
  const schema = LANDING_PROMPT_SCHEMAS[promptType];
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

  // 2. Check for unique IDs
  const duplicateIds = checkUniqueIds(data);
  if (duplicateIds.length > 0) {
    result.valid = false;
    result.errors.push(`Duplicate IDs found: ${duplicateIds.join(", ")}`);
  }

  // 3. Check word counts for headlines
  if (promptType === "landing-headline" || promptType === "landing-full") {
    const headlineWarnings = checkHeadlineWordCounts(data);
    result.warnings.push(...headlineWarnings);
  }

  // 4. Check CTA word counts
  if (promptType === "landing-cta" || promptType === "landing-full") {
    const ctaWarnings = checkCtaWordCounts(data);
    result.warnings.push(...ctaWarnings);
  }

  // 5. Check meta character counts
  if (promptType === "landing-meta" || promptType === "landing-full") {
    const metaWarnings = checkMetaCharCounts(data);
    result.warnings.push(...metaWarnings);
  }

  // 6. Check company/role mentions (optional)
  if (context?.companyName) {
    if (!checkCompanyMention(data, context.companyName)) {
      result.warnings.push(`Content may not mention company name: ${context.companyName}`);
    }
  }
  if (context?.roleName) {
    if (!checkRoleMention(data, context.roleName)) {
      result.warnings.push(`Content may not mention role name: ${context.roleName}`);
    }
  }

  return result;
}

// Export schemas for testing
export {
  HeadlineVariationSchema,
  LearnBulletSchema,
  IncludedBulletSchema,
  PrimaryCtaSchema,
  SecondaryCtaSchema,
};
