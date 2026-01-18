#!/usr/bin/env ts-node

/**
 * Generates company module content using prompts and input data.
 *
 * Usage:
 *   npm run generate-module -- --type=company --company=google --dry-run
 *   npm run generate-module -- --type=company --company=amazon --output=output/
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

// ============================================================================
// Validation (inlined from src/lib/prompts/validation.ts for CLI compatibility)
// ============================================================================

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

const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(ContentBlockSchema).min(1),
});

const CulturePromptOutputSchema = z.object({ section: SectionSchema });
const InterviewStagesPromptOutputSchema = z.object({ section: SectionSchema });
const TipsPromptOutputSchema = z.object({ sections: z.array(SectionSchema).length(2) });
const TriviaPromptOutputSchema = z.object({ section: SectionSchema });

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

function validatePromptOutput(data: unknown, promptType: PromptType): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

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

  const duplicateIds = checkUniqueIds(data);
  if (duplicateIds.length > 0) {
    result.valid = false;
    result.errors.push(`Duplicate IDs found: ${duplicateIds.join(", ")}`);
  }

  function checkQuizzes(obj: unknown): void {
    if (obj && typeof obj === "object") {
      if ((obj as Record<string, unknown>).type === "quiz") {
        const quizObj = obj as { options: Array<{ isCorrect: boolean }> };
        const correctCount = quizObj.options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          result.valid = false;
          result.errors.push(`Quiz has ${correctCount} correct answers (expected 1)`);
        }
      }
      Object.values(obj as Record<string, unknown>).forEach(checkQuizzes);
    }
  }
  checkQuizzes(data);

  return result;
}

// ============================================================================
// Types
// ============================================================================

interface CompanyInfo {
  company_slug: string;
  company_name: string;
  wikipedia_data: {
    founding_date?: string;
    founders?: string[];
    headquarters?: string;
    industry?: string;
    mission?: string;
    ceo?: string;
    products?: string[];
    employee_count?: string;
  };
}

interface TriviaData {
  quiz_items: Array<{
    question: string;
    correct_answer: string;
    distractors: string[];
    format: string;
  }>;
  factoids: Array<{ fact: string; format: string }>;
  news_items: Array<{ title: string; date: string; source: string }>;
}

interface GenerationConfig {
  type: "company" | "role" | "combined";
  company: string;
  dryRun: boolean;
  outputDir: string;
  mockMode: boolean;
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_COMPANY_INFO: Record<string, CompanyInfo> = {
  google: {
    company_slug: "google",
    company_name: "Google",
    wikipedia_data: {
      founding_date: "1998",
      founders: ["Larry Page", "Sergey Brin"],
      headquarters: "Mountain View, California",
      industry: "Technology",
      mission: "To organize the world's information and make it universally accessible and useful",
      ceo: "Sundar Pichai",
      products: ["Google Search", "YouTube", "Android", "Chrome", "Cloud"],
      employee_count: "180,000+",
    },
  },
  amazon: {
    company_slug: "amazon",
    company_name: "Amazon",
    wikipedia_data: {
      founding_date: "1994",
      founders: ["Jeff Bezos"],
      headquarters: "Seattle, Washington",
      industry: "E-commerce, Cloud Computing",
      mission: "To be Earth's most customer-centric company",
      ceo: "Andy Jassy",
      products: ["Amazon.com", "AWS", "Alexa", "Prime", "Kindle"],
      employee_count: "1,500,000+",
    },
  },
};

const MOCK_TRIVIA_DATA: TriviaData = {
  quiz_items: [
    { question: "What year was the company founded?", correct_answer: "1998", distractors: ["1995", "2000", "2002"], format: "quiz" },
  ],
  factoids: [{ fact: "Started in a garage", format: "factoid" }],
  news_items: [{ title: "New product launch", date: "2024-01-15", source: "TechCrunch" }],
};

// ============================================================================
// Mock Module Generators
// ============================================================================

function generateMockCultureSection(companyInfo: CompanyInfo) {
  const { company_name } = companyInfo;
  const { mission } = companyInfo.wikipedia_data;

  return {
    section: {
      id: "culture-values",
      title: "Company Culture & Values",
      blocks: [
        { id: "culture-header", type: "header", content: `What ${company_name} Looks For`, level: 2 },
        {
          id: "culture-overview",
          type: "text",
          content: `${company_name} evaluates candidates on multiple dimensions beyond just technical skills.\n\n**Mission-Driven:** Their mission is "${mission || "N/A"}". Every interview answer should connect back to this broader purpose.\n\n**Technical Excellence:** Deep expertise in your domain is expected.\n\n**Collaborative Mindset:** ${company_name} looks for people who elevate those around them.`,
        },
        { id: "culture-tip", type: "tip", content: `When discussing experiences, connect your actions to ${company_name}'s core values.` },
      ],
    },
  };
}

function generateMockInterviewSection(companyInfo: CompanyInfo) {
  const { company_name } = companyInfo;

  return {
    section: {
      id: "interview-process",
      title: "Interview Process",
      blocks: [
        { id: "process-header", type: "header", content: `${company_name}'s Interview Process`, level: 2 },
        {
          id: "process-overview",
          type: "text",
          content: `Based on candidate reports:\n\n**1. Recruiter Screen (30 min)**\n**2. Technical Phone Screen (45-60 min)**\n**3. On-site/Virtual Loop (4-5 hours)**\n**4. Hiring Committee Review**\n\nTimeline: 4-6 weeks.`,
        },
        { id: "process-tip", type: "tip", content: `${company_name} values clear communication. Be proactive with your recruiter.` },
        {
          id: "process-checklist",
          type: "checklist",
          title: "Pre-Interview Checklist",
          items: [
            { id: "check-1", text: `Research ${company_name}'s recent products`, required: true },
            { id: "check-2", text: "Prepare 5-6 STAR format stories", required: true },
            { id: "check-3", text: "Review interviewers on LinkedIn", required: false },
            { id: "check-4", text: "Test video/audio setup", required: false },
          ],
        },
      ],
    },
  };
}

function generateMockTipsSection(companyInfo: CompanyInfo) {
  const { company_name } = companyInfo;

  return {
    sections: [
      {
        id: "insider-tips",
        title: "Insider Tips",
        blocks: [
          { id: "tips-header", type: "header", content: "From Those Who've Been There", level: 2 },
          {
            id: "tips-overview",
            type: "text",
            content: `Successful ${company_name} candidates share common traits:\n\n**Prepared stories:** STAR format is expected.\n\n**Quantified impact:** Numbers make contributions concrete.\n\n**Thoughtful questions:** Your questions reveal your thinking.`,
          },
          { id: "tips-advice-1", type: "tip", content: `Start each story with what YOU specifically did. ${company_name} probes for individual contributions.` },
        ],
      },
      {
        id: "red-flags",
        title: "Red Flags & Deal Breakers",
        blocks: [
          { id: "flags-header", type: "header", content: `What Gets You Rejected at ${company_name}`, level: 2 },
          {
            id: "flags-overview",
            type: "text",
            content: `Common rejection reasons:\n\n**Vague answers:** No specifics suggests low contribution.\n\n**Defensiveness:** Own mistakes and explain growth.\n\n**Poor preparation:** Not knowing products signals low interest.`,
          },
          { id: "flags-warning", type: "warning", content: `Never say "I don't have an example." Pivot to a related situation instead.` },
          {
            id: "flags-checklist",
            type: "checklist",
            title: "Pre-Interview Red Flag Check",
            items: [
              { id: "flag-check-1", text: "Stories start with 'I' not 'We'", required: false },
              { id: "flag-check-2", text: "Can quantify impact of each story", required: false },
              { id: "flag-check-3", text: "Have a genuine failure story with lessons", required: false },
            ],
          },
        ],
      },
    ],
  };
}

function generateMockTriviaSection(companyInfo: CompanyInfo, _triviaData: TriviaData) {
  const { company_name } = companyInfo;
  const { founding_date, founders, headquarters, ceo, mission } = companyInfo.wikipedia_data;

  return {
    section: {
      id: "company-trivia",
      title: `${company_name} Trivia`,
      blocks: [
        { id: "trivia-header", type: "header", content: `Know Your ${company_name} Facts`, level: 2 },
        {
          id: "trivia-facts",
          type: "text",
          content: `Quick facts:\n\n- **Founded:** ${founding_date || "N/A"} by ${(founders || []).join(" and ") || "N/A"}\n- **Headquarters:** ${headquarters || "N/A"}\n- **CEO:** ${ceo || "N/A"}\n- **Mission:** "${mission || "N/A"}"`,
        },
        {
          id: "trivia-quiz-1",
          type: "quiz",
          question: `What year was ${company_name} founded?`,
          options: [
            { id: "q1-a", text: founding_date || "1998", isCorrect: true },
            { id: "q1-b", text: "1995", isCorrect: false },
            { id: "q1-c", text: "2000", isCorrect: false },
            { id: "q1-d", text: "2002", isCorrect: false },
          ],
          explanation: `${company_name} was founded in ${founding_date || "N/A"}.`,
        },
        {
          id: "trivia-quiz-2",
          type: "quiz",
          question: `Who is the current CEO of ${company_name}?`,
          options: [
            { id: "q2-a", text: ceo || "CEO Name", isCorrect: true },
            { id: "q2-b", text: "Tim Cook", isCorrect: false },
            { id: "q2-c", text: "Satya Nadella", isCorrect: false },
            { id: "q2-d", text: "Mark Zuckerberg", isCorrect: false },
          ],
          explanation: `${ceo || "The CEO"} leads ${company_name}.`,
        },
      ],
    },
  };
}

// ============================================================================
// Main Generation Function
// ============================================================================

async function generateCompanyModule(config: GenerationConfig) {
  const { company, dryRun, outputDir, mockMode } = config;

  console.log(`\nGenerating company module for: ${company}`);
  console.log(`Mode: ${mockMode ? "mock" : "live"}`);
  console.log(`Dry run: ${dryRun}\n`);

  const companyInfo = MOCK_COMPANY_INFO[company.toLowerCase()];
  if (!companyInfo) {
    console.error(`Company not found in mock data: ${company}`);
    console.error(`Available companies: ${Object.keys(MOCK_COMPANY_INFO).join(", ")}`);
    process.exit(1);
  }

  const cultureOutput = generateMockCultureSection(companyInfo);
  const interviewOutput = generateMockInterviewSection(companyInfo);
  const tipsOutput = generateMockTipsSection(companyInfo);
  const triviaOutput = generateMockTriviaSection(companyInfo, MOCK_TRIVIA_DATA);

  const validations = [
    { name: "culture", output: cultureOutput, type: "company-culture" as const },
    { name: "interview", output: interviewOutput, type: "company-interview-stages" as const },
    { name: "tips", output: tipsOutput, type: "company-tips" as const },
    { name: "trivia", output: triviaOutput, type: "company-trivia" as const },
  ];

  let allValid = true;
  for (const { name, output, type } of validations) {
    const result = validatePromptOutput(output, type);
    if (result.valid) {
      console.log(`✓ ${name} section valid`);
    } else {
      console.log(`✗ ${name} section invalid:`);
      result.errors.forEach((e) => console.log(`  ${e}`));
      allValid = false;
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
    }
  }

  if (!allValid) {
    console.error("\nValidation failed. Aborting.");
    process.exit(1);
  }

  const fullModule = {
    id: `company-${company.toLowerCase()}`,
    slug: `company-${company.toLowerCase()}`,
    type: "company",
    title: `${companyInfo.company_name} Interview Prep`,
    description: `Company-specific interview preparation for ${companyInfo.company_name}`,
    companySlug: company.toLowerCase(),
    isPremium: true,
    order: 1,
    sections: [cultureOutput.section, interviewOutput.section, ...tipsOutput.sections, triviaOutput.section],
  };

  if (dryRun) {
    console.log("\n--- DRY RUN OUTPUT ---");
    console.log(JSON.stringify(fullModule, null, 2));
    console.log("\n--- END DRY RUN ---");
  } else {
    const outputPath = path.join(outputDir, `company-${company.toLowerCase()}-preview.json`);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(fullModule, null, 2));
    console.log(`\nOutput saved to: ${outputPath}`);
  }

  return fullModule;
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
    type: (argMap.type as "company" | "role" | "combined") || "company",
    company: argMap.company || "",
    dryRun: "dry-run" in argMap,
    outputDir: argMap.output || "output",
    mockMode: true,
  };

  if (!config.company) {
    console.error("Usage:");
    console.error("  npm run generate-module -- --type=company --company=google --dry-run");
    console.error("  npm run generate-module -- --type=company --company=amazon --output=output/");
    process.exit(1);
  }

  if (config.type !== "company") {
    console.error("Only --type=company is supported currently");
    process.exit(1);
  }

  await generateCompanyModule(config);
}

// Run when executed directly (ESM-compatible check)
const isMain = process.argv[1]?.includes("generate-module");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { generateCompanyModule };
export type { GenerationConfig };
