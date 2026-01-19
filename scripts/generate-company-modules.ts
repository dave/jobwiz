#!/usr/bin/env npx tsx
/**
 * Company Module Generator Script
 *
 * Generates company-specific interview prep modules from search_volume.json
 * and optional analysis data.
 *
 * Usage:
 *   npx tsx scripts/generate-company-modules.ts --dry-run
 *   npx tsx scripts/generate-company-modules.ts
 *   npx tsx scripts/generate-company-modules.ts --company=google
 *
 * Options:
 *   --dry-run     Preview without writing files
 *   --company=X   Generate only for specific company slug
 *   --help        Show help
 */

import * as fs from "fs";
import * as path from "path";

// Paths
const DATA_DIR = path.join(process.cwd(), "data");
const SEARCH_VOLUME_PATH = path.join(DATA_DIR, "search_volume.json");
const ANALYSIS_DIR = path.join(DATA_DIR, "generated", "analysis");
const OUTPUT_DIR = path.join(DATA_DIR, "generated", "modules");

// Types
interface Company {
  name: string;
  slug: string;
  category: string;
  interview_volume: number;
  roles: string[];
}

interface SearchVolumeData {
  companies: Company[];
}

interface AnalysisData {
  company: string;
  common_questions: string[];
  themes: string[];
  interview_tips: string[];
  red_flags: string[];
  process_insights: {
    typical_rounds: string;
    timeline: string;
    format: string;
  };
  source_count: number;
}

interface ContentBlock {
  type: string;
  content: Record<string, unknown>;
}

interface ModuleSection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface CompanyModule {
  slug: string;
  type: "company";
  title: string;
  description: string;
  company_slug: string;
  is_premium: boolean;
  display_order: number;
  sections: ModuleSection[];
}

/**
 * Load search volume data
 */
function loadSearchVolume(): SearchVolumeData {
  const content = fs.readFileSync(SEARCH_VOLUME_PATH, "utf-8");
  return JSON.parse(content) as SearchVolumeData;
}

/**
 * Load analysis data for a company if available
 */
function loadAnalysis(companySlug: string): AnalysisData | null {
  const analysisPath = path.join(ANALYSIS_DIR, `${companySlug}.json`);
  if (!fs.existsSync(analysisPath)) {
    return null;
  }
  const content = fs.readFileSync(analysisPath, "utf-8");
  return JSON.parse(content) as AnalysisData;
}

/**
 * Generate culture section
 */
function generateCultureSection(company: Company, analysis: AnalysisData | null): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Introduction text
  blocks.push({
    type: "text",
    content: {
      text: `Understanding ${company.name}'s culture is essential for interview success. Companies look for candidates who align with their values and can thrive in their environment.`,
    },
  });

  // Add themes from analysis if available
  if (analysis?.themes && analysis.themes.length > 0) {
    const relevantThemes = analysis.themes
      .filter((t) => t.length > 10 && t.length < 100)
      .slice(0, 5);

    if (relevantThemes.length > 0) {
      blocks.push({
        type: "text",
        content: {
          text: `**Key cultural themes at ${company.name}:**\n\n${relevantThemes.map((t) => `- ${t}`).join("\n")}`,
        },
      });
    }
  }

  // Category-based culture insights
  const categoryInsights = getCategoryInsights(company.category);
  if (categoryInsights) {
    blocks.push({
      type: "tip",
      content: {
        text: categoryInsights,
      },
    });
  }

  return {
    id: "culture",
    title: `${company.name} Culture`,
    blocks,
  };
}

/**
 * Generate values section
 */
function generateValuesSection(company: Company, analysis: AnalysisData | null): ModuleSection {
  const blocks: ContentBlock[] = [];

  blocks.push({
    type: "text",
    content: {
      text: `${company.name} evaluates candidates not just on skills, but on how well they embody the company's core values. Demonstrating alignment with these values can be the difference between a good and great interview.`,
    },
  });

  // Add a checklist for values preparation
  const valueItems = getCompanyValueItems(company);
  blocks.push({
    type: "checklist",
    content: {
      title: "Values Preparation Checklist",
      items: valueItems,
    },
  });

  // Add warning about common mistakes
  if (analysis?.red_flags && analysis.red_flags.length > 0) {
    const relevantFlags = analysis.red_flags
      .filter((f) => f.length > 20 && f.length < 150)
      .slice(0, 3);

    if (relevantFlags.length > 0) {
      blocks.push({
        type: "warning",
        content: {
          text: `**Avoid these pitfalls:** Interviewers notice when candidates don't demonstrate genuine alignment with company values. Be authentic in your responses.`,
        },
      });
    }
  }

  return {
    id: "values",
    title: `${company.name} Values`,
    blocks,
  };
}

/**
 * Generate interview process section
 */
function generateProcessSection(company: Company, analysis: AnalysisData | null): ModuleSection {
  const blocks: ContentBlock[] = [];

  // Process overview
  if (analysis?.process_insights) {
    const { typical_rounds, timeline, format } = analysis.process_insights;
    blocks.push({
      type: "text",
      content: {
        text: `**${company.name} Interview Process Overview**\n\n- **Typical rounds:** ${typical_rounds}\n- **Timeline:** ${timeline}\n- **Format:** ${format}`,
      },
    });
  } else {
    blocks.push({
      type: "text",
      content: {
        text: `${company.name}'s interview process typically includes multiple rounds designed to assess both technical skills and cultural fit. The exact format may vary by role and team.`,
      },
    });
  }

  // Add common questions if available
  if (analysis?.common_questions && analysis.common_questions.length > 0) {
    const relevantQuestions = analysis.common_questions
      .filter((q) => q.length > 15 && q.length < 200 && q.includes("?"))
      .slice(0, 5);

    if (relevantQuestions.length > 0) {
      blocks.push({
        type: "text",
        content: {
          text: `**Common Interview Questions:**\n\n${relevantQuestions.map((q) => `- "${q.trim()}"`).join("\n")}`,
        },
      });
    }
  }

  // Process preparation checklist
  blocks.push({
    type: "checklist",
    content: {
      title: "Interview Process Preparation",
      items: [
        { id: "p1", text: "Research recent company news and announcements", required: true },
        { id: "p2", text: "Review the job description thoroughly", required: true },
        { id: "p3", text: "Prepare questions to ask your interviewer", required: true },
        { id: "p4", text: "Practice explaining your relevant experience", required: true },
        { id: "p5", text: "Set up your interview environment (for virtual)", required: false },
      ],
    },
  });

  return {
    id: "process",
    title: `${company.name} Interview Process`,
    blocks,
  };
}

/**
 * Generate tips section
 */
function generateTipsSection(company: Company, analysis: AnalysisData | null): ModuleSection {
  const blocks: ContentBlock[] = [];

  blocks.push({
    type: "text",
    content: {
      text: `Success in ${company.name} interviews comes from preparation, authenticity, and understanding what interviewers are looking for.`,
    },
  });

  // Add tips from analysis if available
  if (analysis?.interview_tips && analysis.interview_tips.length > 0) {
    const relevantTips = analysis.interview_tips
      .filter((t) => t.length > 20 && t.length < 200)
      .slice(0, 5);

    if (relevantTips.length > 0) {
      blocks.push({
        type: "text",
        content: {
          text: `**Insider Tips:**\n\n${relevantTips.map((t) => `- ${t.trim()}`).join("\n")}`,
        },
      });
    }
  }

  // Category-specific tip
  const categoryTip = getCategoryTip(company.category);
  blocks.push({
    type: "tip",
    content: {
      text: categoryTip,
    },
  });

  // Final preparation quiz
  blocks.push({
    type: "quiz",
    content: {
      question: `What is the most important factor in ${company.name} interviews?`,
      options: [
        { id: "a", text: "Having perfect technical answers", isCorrect: false },
        { id: "b", text: "Demonstrating alignment with company values and culture", isCorrect: true },
        { id: "c", text: "Memorizing common interview questions", isCorrect: false },
        { id: "d", text: "Having a prestigious background", isCorrect: false },
      ],
      explanation: `While technical skills matter, ${company.name} places significant emphasis on cultural fit and values alignment. Interviewers want to see that you'll thrive in their environment.`,
    },
  });

  return {
    id: "tips",
    title: `${company.name} Interview Tips`,
    blocks,
  };
}

/**
 * Get category-specific culture insights
 */
function getCategoryInsights(category: string): string | null {
  const insights: Record<string, string> = {
    "Big Tech":
      "Big Tech companies value innovation, scalability thinking, and data-driven decision making. Be prepared to discuss how you've handled ambiguity and driven impact at scale.",
    "High-growth Startups":
      "Startups look for candidates who can wear multiple hats, move fast, and thrive in uncertainty. Emphasize your adaptability and ownership mentality.",
    Finance:
      "Financial institutions value attention to detail, risk awareness, and regulatory understanding. Demonstrate your analytical rigor and ethical judgment.",
    Consulting:
      "Consulting firms assess problem-solving, communication, and client presence. Practice structuring your thoughts and presenting complex ideas clearly.",
    "E-commerce/Retail":
      "Retail and e-commerce companies focus on customer obsession and operational excellence. Show how you've improved customer experiences or optimized processes.",
    "Healthcare/Biotech":
      "Healthcare companies prioritize patient impact and regulatory compliance. Demonstrate your understanding of the sensitive nature of healthcare data and decisions.",
    "Enterprise SaaS":
      "Enterprise companies value customer success thinking and long-term relationship building. Show how you've driven adoption and retention.",
    "Media/Entertainment":
      "Media companies look for creativity balanced with data-driven thinking. Demonstrate your ability to innovate while measuring impact.",
  };

  return insights[category] ?? null;
}

/**
 * Get category-specific interview tip
 */
function getCategoryTip(category: string): string {
  const tips: Record<string, string> = {
    "Big Tech":
      "Research the specific team or product area you're interviewing for. Showing genuine interest in their work demonstrates that you've done your homework.",
    "High-growth Startups":
      "Be prepared to discuss how you've handled rapid change and ambiguity. Startups want to see that you can thrive without extensive structure.",
    Finance:
      "Quantify your achievements wherever possible. Financial institutions appreciate candidates who can articulate impact in concrete terms.",
    Consulting:
      "Practice case interviews extensively if relevant to your role. Structure and communication are often as important as the final answer.",
    "E-commerce/Retail":
      "Think about the customer experience at every step. Bring examples of how you've improved user satisfaction or conversion rates.",
    "Healthcare/Biotech":
      "Understand the regulatory landscape and patient privacy requirements. Show that you can innovate responsibly within constraints.",
    "Enterprise SaaS":
      "Emphasize your understanding of the B2B sales cycle and customer success metrics. Enterprise companies value long-term thinking.",
    "Media/Entertainment":
      "Balance creativity with business impact. Show that you can think both artistically and analytically about content and engagement.",
  };

  return tips[category] ?? "Research the company thoroughly and prepare specific examples that demonstrate your fit for their culture and values.";
}

/**
 * Get company value preparation items
 */
function getCompanyValueItems(company: Company): Array<{ id: string; text: string; required: boolean }> {
  const baseItems = [
    { id: "v1", text: `Research ${company.name}'s stated mission and values`, required: true },
    { id: "v2", text: "Prepare examples that demonstrate alignment with these values", required: true },
    { id: "v3", text: "Review recent company blog posts or leadership communications", required: false },
  ];

  // Add category-specific items
  const categoryItems: Record<string, Array<{ id: string; text: string; required: boolean }>> = {
    "Big Tech": [{ id: "v4", text: "Prepare examples of driving impact at scale", required: true }],
    "High-growth Startups": [{ id: "v4", text: "Prepare examples of working in ambiguous situations", required: true }],
    Finance: [{ id: "v4", text: "Prepare examples demonstrating attention to detail and risk awareness", required: true }],
    Consulting: [{ id: "v4", text: "Prepare structured answers using frameworks like MECE", required: true }],
    "E-commerce/Retail": [{ id: "v4", text: "Prepare examples of customer-focused decisions", required: true }],
    "Healthcare/Biotech": [{ id: "v4", text: "Prepare examples showing patient-first thinking", required: true }],
    "Enterprise SaaS": [{ id: "v4", text: "Prepare examples of building long-term relationships", required: true }],
    "Media/Entertainment": [{ id: "v4", text: "Prepare examples balancing creativity and metrics", required: true }],
  };

  const extraItems = categoryItems[company.category] ?? [];
  return [...baseItems, ...extraItems];
}

/**
 * Generate a company module
 */
function generateCompanyModule(company: Company): CompanyModule {
  const analysis = loadAnalysis(company.slug);

  const sections: ModuleSection[] = [
    generateCultureSection(company, analysis),
    generateValuesSection(company, analysis),
    generateProcessSection(company, analysis),
    generateTipsSection(company, analysis),
  ];

  return {
    slug: `company-${company.slug}`,
    type: "company",
    title: `${company.name} Interview Guide`,
    description: `Prepare for your ${company.name} interview with company-specific insights, culture tips, and interview strategies.`,
    company_slug: company.slug,
    is_premium: true,
    display_order: 0,
    sections,
  };
}

/**
 * Write module to file
 */
function writeModule(module: CompanyModule, dryRun: boolean): void {
  const outputPath = path.join(OUTPUT_DIR, `${module.slug}.json`);

  if (dryRun) {
    console.log(`  [DRY-RUN] Would write: ${outputPath}`);
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(module, null, 2));
  console.log(`  Written: ${outputPath}`);
}

/**
 * Print usage help
 */
function printUsage(): void {
  console.log(`
Company Module Generator

Generates company-specific interview prep modules from search_volume.json
and optional analysis data.

Usage:
  npx tsx scripts/generate-company-modules.ts [options]

Options:
  --dry-run     Preview what would be generated without writing files
  --company=X   Generate only for specific company slug
  --help        Show this help message

Examples:
  npx tsx scripts/generate-company-modules.ts --dry-run
  npx tsx scripts/generate-company-modules.ts
  npx tsx scripts/generate-company-modules.ts --company=google

Output:
  Modules are written to data/generated/modules/company-{slug}.json
`);
}

/**
 * Main entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const dryRun = args.includes("--dry-run");
  const companyArg = args.find((a) => a.startsWith("--company="));
  const targetCompany = companyArg ? companyArg.split("=")[1] : null;

  console.log("Company Module Generator");
  console.log("═".repeat(50));
  console.log(`Mode: ${dryRun ? "DRY-RUN (no changes)" : "LIVE"}`);

  // Load search volume data
  const searchVolume = loadSearchVolume();
  let companies = searchVolume.companies;

  // Filter to specific company if requested
  if (targetCompany) {
    companies = companies.filter((c) => c.slug === targetCompany);
    if (companies.length === 0) {
      console.error(`Company not found: ${targetCompany}`);
      process.exit(1);
    }
    console.log(`Target company: ${targetCompany}`);
  }

  console.log(`Companies to process: ${companies.length}`);
  console.log("");

  // Generate modules
  let generated = 0;
  let withAnalysis = 0;
  let withoutAnalysis = 0;

  for (const company of companies) {
    const analysisExists = fs.existsSync(path.join(ANALYSIS_DIR, `${company.slug}.json`));
    if (analysisExists) {
      withAnalysis++;
    } else {
      withoutAnalysis++;
    }

    const module = generateCompanyModule(company);
    writeModule(module, dryRun);
    generated++;
  }

  console.log("");
  console.log("═".repeat(50));
  console.log(`Generated: ${generated} modules`);
  console.log(`  With analysis data: ${withAnalysis}`);
  console.log(`  Without analysis data: ${withoutAnalysis}`);
  console.log("═".repeat(50));
}

main();
