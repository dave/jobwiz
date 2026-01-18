#!/usr/bin/env ts-node

/**
 * Generates landing page copy using prompts and input data.
 *
 * Usage:
 *   npm run generate-landing -- --company=google --role=pm --dry-run
 *   npm run generate-landing -- --company=amazon --role=swe --output=output/
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

// ============================================================================
// Validation Schemas (inlined for CLI compatibility)
// ============================================================================

const HeadlineAngleSchema = z.enum(["insider", "transformation", "fear", "authority", "specificity"]);
const UrgencyTypeSchema = z.enum(["none", "time", "value", "social"]);
const IconSuggestionSchema = z.enum([
  "brain", "target", "shield", "clock", "star",
  "check", "play", "users", "chart",
]);

const HeadlineVariationSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1).max(100),
  subheadline: z.string().min(1).max(200),
  angle: HeadlineAngleSchema,
});

const LearnBulletSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(100),
  icon_suggestion: IconSuggestionSchema,
});

const IncludedBulletSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(100),
  quantity: z.string().nullable().optional(),
});

const PrimaryCtaSchema = z.object({
  id: z.string().min(1),
  button_text: z.string().min(1).max(30),
  supporting_text: z.string().max(100).nullable().optional(),
  urgency_type: UrgencyTypeSchema,
});

const SecondaryCtaSchema = z.object({
  id: z.string().min(1),
  button_text: z.string().min(1).max(30),
  supporting_text: z.string().max(100).nullable().optional(),
});

const LandingCopyOutputSchema = z.object({
  headlines: z.array(HeadlineVariationSchema).min(3),
  learn_bullets: z.array(LearnBulletSchema).min(4).max(6),
  included_bullets: z.array(IncludedBulletSchema).min(4).max(6),
  primary_cta: z.array(PrimaryCtaSchema).min(3),
  secondary_cta: z.array(SecondaryCtaSchema).min(2),
  meta_title: z.string().min(1).max(60),
  meta_description: z.string().min(1).max(160),
  og_title: z.string().min(1).max(60),
  og_description: z.string().min(1).max(200),
  keywords: z.array(z.string().min(1)).min(5).max(10),
});

type LandingCopyOutput = z.infer<typeof LandingCopyOutputSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

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

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function validateLandingOutput(data: unknown): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  const parseResult = LandingCopyOutputSchema.safeParse(data);
  if (!parseResult.success) {
    result.valid = false;
    result.errors.push("Schema validation failed:");
    for (const issue of parseResult.error.issues) {
      result.errors.push(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    return result;
  }

  const duplicateIds = checkUniqueIds(data);
  if (duplicateIds.length > 0) {
    result.valid = false;
    result.errors.push(`Duplicate IDs found: ${duplicateIds.join(", ")}`);
  }

  // Check headline word counts
  const landingData = data as LandingCopyOutput;
  for (const h of landingData.headlines) {
    const headlineWords = countWords(h.headline);
    const subheadlineWords = countWords(h.subheadline);
    if (headlineWords > 12) {
      result.warnings.push(`Headline "${h.id}" has ${headlineWords} words (max 12)`);
    }
    if (subheadlineWords > 25) {
      result.warnings.push(`Subheadline "${h.id}" has ${subheadlineWords} words (max 25)`);
    }
  }

  // Check CTA word counts
  for (const cta of landingData.primary_cta) {
    const words = countWords(cta.button_text);
    if (words < 2 || words > 5) {
      result.warnings.push(`Primary CTA "${cta.id}" has ${words} words (should be 2-5)`);
    }
  }
  for (const cta of landingData.secondary_cta) {
    const words = countWords(cta.button_text);
    if (words < 2 || words > 5) {
      result.warnings.push(`Secondary CTA "${cta.id}" has ${words} words (should be 2-5)`);
    }
  }

  // Check meta character counts
  if (landingData.meta_title.length > 60) {
    result.warnings.push(`Meta title is ${landingData.meta_title.length} chars (max 60)`);
  }
  if (landingData.meta_description.length > 160) {
    result.warnings.push(`Meta description is ${landingData.meta_description.length} chars (max 160)`);
  }

  return result;
}

// ============================================================================
// Types
// ============================================================================

interface PositionInfo {
  company_slug: string;
  company_name: string;
  role_slug: string;
  role_name: string;
  industry: string;
}

interface GenerationConfig {
  company: string;
  role: string;
  dryRun: boolean;
  outputDir: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_POSITIONS: Record<string, Record<string, PositionInfo>> = {
  google: {
    pm: {
      company_slug: "google",
      company_name: "Google",
      role_slug: "pm",
      role_name: "Product Manager",
      industry: "Technology",
    },
    swe: {
      company_slug: "google",
      company_name: "Google",
      role_slug: "swe",
      role_name: "Software Engineer",
      industry: "Technology",
    },
  },
  amazon: {
    pm: {
      company_slug: "amazon",
      company_name: "Amazon",
      role_slug: "pm",
      role_name: "Product Manager",
      industry: "E-commerce",
    },
    swe: {
      company_slug: "amazon",
      company_name: "Amazon",
      role_slug: "swe",
      role_name: "Software Engineer",
      industry: "E-commerce",
    },
  },
  meta: {
    pm: {
      company_slug: "meta",
      company_name: "Meta",
      role_slug: "pm",
      role_name: "Product Manager",
      industry: "Technology",
    },
    swe: {
      company_slug: "meta",
      company_name: "Meta",
      role_slug: "swe",
      role_name: "Software Engineer",
      industry: "Technology",
    },
  },
};

// ============================================================================
// Mock Landing Copy Generators
// ============================================================================

function generateMockHeadlines(position: PositionInfo): LandingCopyOutput["headlines"] {
  const { company_name, role_name } = position;

  return [
    {
      id: "headline-insider-1",
      headline: `What ${company_name} interviewers actually look for`,
      subheadline: `Insider prep based on real ${role_name} interviews. Know exactly what to expect.`,
      angle: "insider" as const,
    },
    {
      id: "headline-transform-1",
      headline: `Land your ${company_name} ${role_name} role`,
      subheadline: `From application to offer: the complete preparation system used by successful candidates.`,
      angle: "transformation" as const,
    },
    {
      id: "headline-fear-1",
      headline: `The #1 mistake ${company_name} candidates make`,
      subheadline: `Most candidates focus on the wrong things. Learn what actually moves the needle.`,
      angle: "fear" as const,
    },
    {
      id: "headline-authority-1",
      headline: `Proven ${company_name} interview strategies`,
      subheadline: `Preparation methods that have helped thousands of candidates succeed.`,
      angle: "authority" as const,
    },
    {
      id: "headline-specific-1",
      headline: `The 5 questions ${company_name} always asks`,
      subheadline: `Stop guessing. Know exactly what's coming and how to answer with confidence.`,
      angle: "specificity" as const,
    },
  ];
}

function generateMockLearnBullets(position: PositionInfo): LandingCopyOutput["learn_bullets"] {
  const { company_name } = position;

  return [
    {
      id: "learn-1",
      text: `What ${company_name} interviewers are trained to evaluate`,
      icon_suggestion: "target" as const,
    },
    {
      id: "learn-2",
      text: "How to structure answers using proven frameworks",
      icon_suggestion: "brain" as const,
    },
    {
      id: "learn-3",
      text: "Common mistakes that get candidates rejected",
      icon_suggestion: "shield" as const,
    },
    {
      id: "learn-4",
      text: `How to demonstrate ${company_name} culture fit naturally`,
      icon_suggestion: "users" as const,
    },
  ];
}

function generateMockIncludedBullets(position: PositionInfo): LandingCopyOutput["included_bullets"] {
  const { company_name } = position;

  return [
    {
      id: "included-1",
      text: `Deep-dive into ${company_name}'s interview process`,
      quantity: "5 modules",
    },
    {
      id: "included-2",
      text: "Practice questions with model answers",
      quantity: "50+ questions",
    },
    {
      id: "included-3",
      text: "Pre-interview preparation checklists",
      quantity: "8 checklists",
    },
    {
      id: "included-4",
      text: "Company culture and values breakdown",
      quantity: null,
    },
  ];
}

function generateMockPrimaryCta(position: PositionInfo): LandingCopyOutput["primary_cta"] {
  const { company_name } = position;

  return [
    {
      id: "cta-primary-1",
      button_text: "Start Preparing Now",
      supporting_text: `Instant access to all ${company_name} content`,
      urgency_type: "none" as const,
    },
    {
      id: "cta-primary-2",
      button_text: "Get Interview Ready",
      supporting_text: "Most candidates wait too long to prepare",
      urgency_type: "time" as const,
    },
    {
      id: "cta-primary-3",
      button_text: "Unlock Full Access",
      supporting_text: "One-time purchase, lifetime access",
      urgency_type: "value" as const,
    },
  ];
}

function generateMockSecondaryCta(): LandingCopyOutput["secondary_cta"] {
  return [
    {
      id: "cta-secondary-1",
      button_text: "Preview Free Content",
      supporting_text: "No account required",
    },
    {
      id: "cta-secondary-2",
      button_text: "See What's Included",
      supporting_text: null,
    },
  ];
}

function generateMockMeta(position: PositionInfo): Pick<LandingCopyOutput, "meta_title" | "meta_description" | "og_title" | "og_description" | "keywords"> {
  const { company_name, role_name, company_slug, role_slug } = position;
  const roleShort = role_slug.toUpperCase();

  return {
    meta_title: `${company_name} ${roleShort} Interview Prep | Insider Strategies | JobWiz`,
    meta_description: `Prepare for your ${company_name} ${role_name} interview with insider knowledge. Learn what interviewers evaluate and practice with real questions.`,
    og_title: `${company_name} ${roleShort} Interview Prep Guide`,
    og_description: `Everything you need to ace your ${company_name} ${role_name} interview. Insider strategies, practice questions, and step-by-step preparation.`,
    keywords: [
      `${company_slug} ${role_slug} interview`,
      `${company_slug} ${role_name.toLowerCase()} interview`,
      `${company_slug} ${role_slug} interview questions`,
      `${company_slug} ${role_slug} interview prep`,
      `${company_slug} ${role_name.toLowerCase()} interview prep`,
      `${company_slug} interview preparation`,
      `${role_slug} interview guide`,
    ],
  };
}

function generateMockLandingCopy(position: PositionInfo): LandingCopyOutput {
  return {
    headlines: generateMockHeadlines(position),
    learn_bullets: generateMockLearnBullets(position),
    included_bullets: generateMockIncludedBullets(position),
    primary_cta: generateMockPrimaryCta(position),
    secondary_cta: generateMockSecondaryCta(),
    ...generateMockMeta(position),
  };
}

// ============================================================================
// Main Generation Function
// ============================================================================

async function generateLandingCopy(config: GenerationConfig) {
  const { company, role, dryRun, outputDir } = config;

  console.log(`\nGenerating landing copy for: ${company}/${role}`);
  console.log(`Dry run: ${dryRun}\n`);

  // Get position info
  const companyPositions = MOCK_POSITIONS[company.toLowerCase()];
  if (!companyPositions) {
    console.error(`Company not found: ${company}`);
    console.error(`Available companies: ${Object.keys(MOCK_POSITIONS).join(", ")}`);
    process.exit(1);
  }

  const position = companyPositions[role.toLowerCase()];
  if (!position) {
    console.error(`Role not found for ${company}: ${role}`);
    console.error(`Available roles: ${Object.keys(companyPositions).join(", ")}`);
    process.exit(1);
  }

  // Generate mock content
  const output = generateMockLandingCopy(position);

  // Validate
  const validation = validateLandingOutput(output);
  if (validation.valid) {
    console.log("✓ Output is valid");
  } else {
    console.log("✗ Validation failed:");
    validation.errors.forEach((e) => console.log(`  ${e}`));
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.log("Warnings:");
    validation.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  // Output results
  console.log(`\n✓ Generated ${output.headlines.length} headline variations`);
  console.log(`✓ Generated ${output.learn_bullets.length} learn bullets`);
  console.log(`✓ Generated ${output.included_bullets.length} included bullets`);
  console.log(`✓ Generated ${output.primary_cta.length} primary CTA variations`);
  console.log(`✓ Generated ${output.secondary_cta.length} secondary CTA variations`);
  console.log(`✓ Generated meta tags (${output.meta_title.length} char title)`);

  if (dryRun) {
    console.log("\n--- DRY RUN OUTPUT ---");
    console.log(JSON.stringify(output, null, 2));
    console.log("\n--- END DRY RUN ---");
  } else {
    const outputPath = path.join(outputDir, `landing-${company.toLowerCase()}-${role.toLowerCase()}-preview.json`);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nOutput saved to: ${outputPath}`);
  }

  return output;
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

  const config: GenerationConfig = {
    company: argMap.company || "",
    role: argMap.role || "",
    dryRun: "dry-run" in argMap,
    outputDir: argMap.output || "output",
  };

  if (!config.company || !config.role) {
    console.error("Usage:");
    console.error("  npm run generate-landing -- --company=google --role=pm --dry-run");
    console.error("  npm run generate-landing -- --company=amazon --role=swe --output=output/");
    console.error("\nAvailable companies: google, amazon, meta");
    console.error("Available roles: pm, swe");
    process.exit(1);
  }

  await generateLandingCopy(config);
}

// Run when executed directly
const isMain = process.argv[1]?.includes("generate-landing");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { generateLandingCopy, generateMockLandingCopy, validateLandingOutput };
export type { GenerationConfig, PositionInfo, LandingCopyOutput };
