#!/usr/bin/env ts-node
/**
 * Company Fact Verification Script
 *
 * Extracts factual claims about companies from content and generates
 * a verification checklist with suggested sources.
 *
 * Usage:
 *   npx ts-node scripts/quality/check-facts.ts --input=file.json
 *   npx ts-node scripts/quality/check-facts.ts --dir=output/
 *   npm run check-facts -- --input=file.json
 */

import * as fs from "fs";
import * as path from "path";
import type { Module, ContentBlock, ChecklistItem } from "../../src/types/module";

// Fact types that we extract and verify
export type FactType =
  | "founding_year"
  | "founders"
  | "headquarters"
  | "employee_count"
  | "mission"
  | "ceo"
  | "interview_process"
  | "culture_claim"
  | "product"
  | "acquisition"
  | "revenue"
  | "other";

// Verification sources by fact type
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

// Patterns to extract different fact types
interface FactPattern {
  type: FactType;
  patterns: RegExp[];
  extractValue: (match: RegExpMatchArray, fullText: string) => string;
}

const FACT_PATTERNS: FactPattern[] = [
  // Founding year: "Founded in 1998", "founded 1998", "was founded in 1998"
  {
    type: "founding_year",
    patterns: [
      /(?:founded|established|started|began|created)\s+(?:in\s+)?(\d{4})/gi,
      /(?:since|from)\s+(\d{4})/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  // Founders: "by Larry Page and Sergey Brin", "founders: X and Y"
  {
    type: "founders",
    patterns: [
      /\*\*Founded:\*\*\s*\d{4}\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)/gi, // Markdown format
      /(?:founded|started|created|established)\s+(?:in\s+)?\d{4}\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)/gi,
      /founders?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:,?\s+(?:and\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)*)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  // Headquarters: "Headquarters: Mountain View", "based in", "headquartered in"
  {
    type: "headquarters",
    patterns: [
      /\*\*Headquarters:\*\*\s*([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/gi, // Markdown format
      /(?:headquarters?|headquartered|based|located)\s*(?:in|:)\s*([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  // Employee count: "180,000 employees", "over 50,000 staff"
  {
    type: "employee_count",
    patterns: [
      /(?:approximately|about|over|around|nearly)?\s*([\d,]+)\s*(?:\+\s*)?(?:employees?|staff|workers|team members)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  // Mission statement: "mission is", "mission:"
  {
    type: "mission",
    patterns: [
      // Handles both smart and standard quotes: "mission is" followed by quoted text
      /mission\s+is\s+["'""]([^"'""]+)["'""]/gi,
    ],
    extractValue: (match) => match[1]?.trim() ?? "",
  },
  // CEO: "CEO: Sundar Pichai", "CEO is", "led by"
  {
    type: "ceo",
    patterns: [
      /\*\*CEO:\*\*\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, // Handles **CEO:** markdown format
      /CEO\s*(?:is|:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, // Plain format
      /(?:chief\s+executive\s+officer)\s*(?:is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /(?:led|headed|run)\s+by\s+(?:CEO\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  // Interview process: number of rounds, timeline
  {
    type: "interview_process",
    patterns: [
      /(\d+(?:-\d+)?)\s*(?:rounds?|interviews?|stages?)/gi,
      /(?:timeline|process\s+takes?)\s*(?:is|:)?\s*(\d+(?:-\d+)?\s*(?:weeks?|days?|months?))/gi,
      /(?:phone|video|virtual|on-?site)\s+(?:screen|interview|loop)/gi,
    ],
    extractValue: (match) => match[0] ?? "",
  },
  // Culture claims: "Google looks for", "values", "culture"
  {
    type: "culture_claim",
    patterns: [
      /(?:company|they|we)\s+(?:looks?\s+for|values?|prioritizes?|expects?)\s+([^.]+)/gi,
      /(?:culture|environment)\s+(?:is|rewards?|emphasizes?|focuses?\s+on)\s+([^.]+)/gi,
    ],
    extractValue: (match) => match[1] ?? match[0] ?? "",
  },
  // Products
  {
    type: "product",
    patterns: [
      /(?:products?\s+include|key\s+products?|main\s+products?)\s*:?\s*([^.]+)/gi,
    ],
    extractValue: (match) => match[1] ?? "",
  },
  // Acquisitions
  {
    type: "acquisition",
    patterns: [
      /acquired\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*(?:in|for)?\s*(\d{4}|\$[\d.]+[BMK])?/gi,
    ],
    extractValue: (match) => `${match[1] ?? ""}${match[2] ? ` (${match[2]})` : ""}`,
  },
  // Revenue
  {
    type: "revenue",
    patterns: [
      /revenue\s+(?:of|is|:)?\s*(?:approximately\s+)?\$?([\d.]+)\s*(billion|million|B|M)/gi,
      /(?:approximately|about|over|around)\s+\$?([\d.]+)\s*(billion|million|B|M)\s+(?:in\s+)?revenue/gi,
    ],
    extractValue: (match) => `$${match[1] ?? ""}${match[2] ?? ""}`,
  },
];

// Types for results
export interface ExtractedFact {
  id: string;
  type: FactType;
  value: string;
  context: string; // The sentence/paragraph where the fact was found
  location: FactLocation;
  verificationSources: string[];
  status: "unverified" | "verified" | "disputed";
}

export interface FactLocation {
  moduleId: string;
  sectionId: string;
  blockId: string;
  blockType: string;
}

export interface FactCheckResult {
  moduleId: string;
  companySlug?: string;
  totalFacts: number;
  facts: ExtractedFact[];
  factsByType: Record<FactType, ExtractedFact[]>;
  confidenceScore: number; // 0-100 based on verifiability
  markdown: string; // Generated checklist
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
 * Gets the sentence containing a match for context
 */
function getSentenceContext(text: string, matchIndex: number, matchLength: number): string {
  // Find sentence boundaries
  const before = text.substring(0, matchIndex);
  const after = text.substring(matchIndex + matchLength);

  const sentenceStartMatch = before.match(/[.!?]\s*[^.!?]*$/);
  const sentenceStart = sentenceStartMatch
    ? matchIndex - (sentenceStartMatch[0].length - (sentenceStartMatch[0].match(/^[.!?]\s*/)?.[0].length ?? 0))
    : Math.max(0, matchIndex - 100);

  const sentenceEndMatch = after.match(/^[^.!?]*[.!?]/);
  const sentenceEnd = sentenceEndMatch
    ? matchIndex + matchLength + sentenceEndMatch[0].length
    : Math.min(text.length, matchIndex + matchLength + 100);

  return text.substring(sentenceStart, sentenceEnd).trim();
}

/**
 * Extracts facts from text content
 */
function extractFactsFromText(
  text: string,
  location: FactLocation
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  let factIndex = 0;

  for (const pattern of FACT_PATTERNS) {
    for (const regex of pattern.patterns) {
      // Reset regex state
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const value = pattern.extractValue(match, text).trim();
        if (value && value.length > 1) {
          // Avoid duplicates
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

/**
 * Extracts all facts from a module
 */
export function extractFactsFromModule(module: Module): FactCheckResult {
  const allFacts: ExtractedFact[] = [];
  const factsByType: Record<FactType, ExtractedFact[]> = {
    founding_year: [],
    founders: [],
    headquarters: [],
    employee_count: [],
    mission: [],
    ceo: [],
    interview_process: [],
    culture_claim: [],
    product: [],
    acquisition: [],
    revenue: [],
    other: [],
  };

  for (const section of module.sections) {
    for (const block of section.blocks) {
      const text = extractTextFromBlock(block);
      if (text.trim()) {
        const location: FactLocation = {
          moduleId: module.id,
          sectionId: section.id,
          blockId: block.id,
          blockType: block.type,
        };

        const facts = extractFactsFromText(text, location);
        for (const fact of facts) {
          // Cross-block deduplication: skip if same type + value already exists
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

  // Calculate confidence score based on verifiability
  // Higher score = more facts can be easily verified
  const verifiableFacts = allFacts.filter(
    (f) => ["founding_year", "founders", "headquarters", "ceo", "mission"].includes(f.type)
  );
  const hardToVerifyFacts = allFacts.filter(
    (f) => ["culture_claim", "interview_process"].includes(f.type)
  );

  let confidenceScore = 100;
  if (allFacts.length > 0) {
    // Deduct points for hard-to-verify claims
    const hardToVerifyRatio = hardToVerifyFacts.length / allFacts.length;
    confidenceScore = Math.round(100 - hardToVerifyRatio * 30);

    // Bonus for having verifiable facts
    const verifiableRatio = verifiableFacts.length / allFacts.length;
    confidenceScore = Math.min(100, confidenceScore + verifiableRatio * 10);
  }

  // Generate markdown checklist
  const markdown = generateMarkdownChecklist(module, allFacts, factsByType, confidenceScore);

  return {
    moduleId: module.id,
    companySlug: (module as Module & { companySlug?: string }).companySlug,
    totalFacts: allFacts.length,
    facts: allFacts,
    factsByType,
    confidenceScore,
    markdown,
  };
}

/**
 * Generates a markdown checklist for fact verification
 */
function generateMarkdownChecklist(
  module: Module,
  facts: ExtractedFact[],
  factsByType: Record<FactType, ExtractedFact[]>,
  confidenceScore: number
): string {
  const lines: string[] = [];
  const companySlug = (module as Module & { companySlug?: string }).companySlug ?? module.id;

  lines.push(`# Fact Verification Checklist: ${module.title}`);
  lines.push("");
  lines.push(`**Module ID:** ${module.id}`);
  lines.push(`**Company:** ${companySlug}`);
  lines.push(`**Total Facts:** ${facts.length}`);
  lines.push(`**Confidence Score:** ${confidenceScore}/100`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group by type for easier review
  const typeLabels: Record<FactType, string> = {
    founding_year: "Founding Year",
    founders: "Founders",
    headquarters: "Headquarters",
    employee_count: "Employee Count",
    mission: "Mission Statement",
    ceo: "CEO/Leadership",
    interview_process: "Interview Process",
    culture_claim: "Culture Claims",
    product: "Products",
    acquisition: "Acquisitions",
    revenue: "Revenue/Financials",
    other: "Other Facts",
  };

  for (const [type, typeFacts] of Object.entries(factsByType) as [FactType, ExtractedFact[]][]) {
    if (typeFacts.length === 0) continue;

    lines.push(`## ${typeLabels[type]}`);
    lines.push("");

    for (const fact of typeFacts) {
      lines.push(`- [ ] **${fact.value}**`);
      lines.push(`  - Context: "${fact.context}"`);
      lines.push(`  - Verify: ${fact.verificationSources.join(", ")}`);
      lines.push(`  - Location: ${fact.location.sectionId} > ${fact.location.blockId}`);
      lines.push("");
    }
  }

  // Summary section
  lines.push("---");
  lines.push("");
  lines.push("## Verification Summary");
  lines.push("");
  lines.push("| Category | Count | Priority |");
  lines.push("|----------|-------|----------|");

  const priorities: Record<FactType, "High" | "Medium" | "Low"> = {
    founding_year: "High",
    founders: "High",
    headquarters: "High",
    ceo: "High",
    mission: "High",
    employee_count: "Medium",
    revenue: "Medium",
    product: "Medium",
    acquisition: "Medium",
    interview_process: "Low",
    culture_claim: "Low",
    other: "Low",
  };

  for (const [type, typeFacts] of Object.entries(factsByType) as [FactType, ExtractedFact[]][]) {
    if (typeFacts.length > 0) {
      lines.push(`| ${typeLabels[type]} | ${typeFacts.length} | ${priorities[type]} |`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`*Generated on ${new Date().toISOString().split("T")[0]}*`);

  return lines.join("\n");
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
  outputDir: string;
  help: boolean;
} {
  const inputFiles: string[] = [];
  let outputDir = ".";
  let help = false;

  for (const arg of args) {
    if (arg.startsWith("--input=")) {
      inputFiles.push(arg.slice(8));
    } else if (arg.startsWith("--dir=")) {
      const dir = arg.slice(6);
      inputFiles.push(...getJsonFilesInDir(dir));
    } else if (arg.startsWith("--output=")) {
      outputDir = arg.slice(9);
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    }
  }

  return { inputFiles, outputDir, help };
}

/**
 * Formats output for console
 */
function formatOutput(result: FactCheckResult): string {
  const lines: string[] = [];

  lines.push(`\n📋 Fact Check: ${result.moduleId}`);
  lines.push("─".repeat(50));
  lines.push(`Company: ${result.companySlug ?? "Unknown"}`);
  lines.push(`Total Facts Found: ${result.totalFacts}`);
  lines.push(`Confidence Score: ${result.confidenceScore}/100`);

  if (result.totalFacts > 0) {
    lines.push("\n📊 Facts by Type:");

    const typeLabels: Record<FactType, string> = {
      founding_year: "Founding Year",
      founders: "Founders",
      headquarters: "Headquarters",
      employee_count: "Employee Count",
      mission: "Mission",
      ceo: "CEO",
      interview_process: "Interview Process",
      culture_claim: "Culture Claims",
      product: "Products",
      acquisition: "Acquisitions",
      revenue: "Revenue",
      other: "Other",
    };

    for (const [type, facts] of Object.entries(result.factsByType) as [FactType, ExtractedFact[]][]) {
      if (facts.length > 0) {
        lines.push(`   ${typeLabels[type]}: ${facts.length}`);
        for (const fact of facts.slice(0, 2)) {
          lines.push(`     • ${fact.value}`);
        }
        if (facts.length > 2) {
          lines.push(`     ... and ${facts.length - 2} more`);
        }
      }
    }
  }

  lines.push("\n" + "─".repeat(50));

  return lines.join("\n");
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  const { inputFiles, outputDir, help } = parseArgs(args);

  if (help) {
    console.log(`
Fact Verification Script

Usage:
  npx ts-node scripts/quality/check-facts.ts --input=file.json
  npx ts-node scripts/quality/check-facts.ts --dir=output/
  npm run check-facts -- --input=file.json

Options:
  --input=<file>      Input JSON file (can be used multiple times)
  --dir=<directory>   Check all JSON files in directory
  --output=<dir>      Output directory for markdown checklists (default: .)
  --help, -h          Show this help message

Output:
  - Console summary of facts found
  - facts-checklist-{moduleId}.md file for each module
`);
    process.exit(0);
  }

  if (inputFiles.length === 0) {
    console.error("Error: No input files specified");
    console.error("Usage: check-facts --input=<file.json> | --dir=<directory>");
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

  // Process each module
  for (const module of modules) {
    const result = extractFactsFromModule(module);

    // Output to console
    console.log(formatOutput(result));

    // Write markdown checklist
    const outputPath = path.join(
      outputDir,
      `facts-checklist-${result.companySlug ?? result.moduleId}.md`
    );

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, result.markdown);
    console.log(`✓ Checklist written to: ${outputPath}`);
  }

  console.log("\n✅ Fact verification complete");
  process.exit(0);
}

// Run if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("check-facts.ts");

if (isMainModule) {
  main();
}
