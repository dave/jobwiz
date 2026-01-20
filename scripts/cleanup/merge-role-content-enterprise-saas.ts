#!/usr/bin/env npx ts-node
/**
 * Merge role module content into Enterprise SaaS company-role modules
 * Issue #303: Enterprise SaaS batch
 *
 * This script:
 * 1. For each Enterprise SaaS company-role module
 * 2. Loads the corresponding role module
 * 3. Prepends role module sections (overview, format, frameworks, competencies, mistakes, preparation)
 * 4. Before the company-specific interview question sections
 * 5. Ensures no duplicates
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(
  __dirname,
  "../../data/generated/modules"
);

// Enterprise SaaS companies
const ENTERPRISE_SAAS_COMPANIES = [
  "salesforce",
  "oracle",
  "sap",
  "workday",
  "servicenow",
  "atlassian",
  "splunk",
  "twilio",
  "hubspot",
  "zendesk",
  "okta",
  "cloudflare",
  "mongodb",
  "elastic",
  "ibm",
  "vmware",
  "slack",
  "zoom",
  "docusign",
];

// Role module sections to prepend (in order)
const ROLE_SECTIONS_TO_MERGE = [
  "overview",
  "format",
  "answer-frameworks",
  "competencies",
  "mistakes-to-avoid",
  "preparation",
];

interface ContentBlock {
  type: string;
  content: Record<string, unknown>;
}

interface Section {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface Module {
  slug: string;
  type: string;
  title: string;
  description: string;
  company_slug?: string;
  role_slug?: string;
  is_premium: boolean;
  display_order: number;
  sections: Section[];
}

function loadModule(filePath: string): Module | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Module;
  } catch (e) {
    console.error(`Failed to load module: ${filePath}`, e);
    return null;
  }
}

function saveModule(filePath: string, module: Module): void {
  fs.writeFileSync(filePath, JSON.stringify(module, null, 2) + "\n");
}

function getSectionsToMerge(roleModule: Module): Section[] {
  const sectionsToMerge: Section[] = [];

  for (const sectionId of ROLE_SECTIONS_TO_MERGE) {
    const section = roleModule.sections.find((s) => s.id === sectionId);
    if (section) {
      // Create a deep copy to avoid modifying the original
      sectionsToMerge.push(JSON.parse(JSON.stringify(section)));
    }
  }

  return sectionsToMerge;
}

function hasRoleContent(companyRoleModule: Module): boolean {
  // Check if role content has already been merged by looking for role overview section
  return companyRoleModule.sections.some(
    (s) =>
      s.id === "overview" ||
      s.id === "format" ||
      s.id === "answer-frameworks"
  );
}

function generateUniqueBlockIds(
  section: Section,
  companySlug: string
): Section {
  // Make block IDs unique by prefixing with company slug
  const updatedSection = { ...section };
  updatedSection.blocks = section.blocks.map((block) => {
    if (block.type === "checklist" && block.content && typeof block.content === 'object') {
      const checklistContent = block.content as {
        title: string;
        items: { id: string; text: string; required: boolean }[];
      };
      if (checklistContent.items) {
        return {
          ...block,
          content: {
            ...checklistContent,
            items: checklistContent.items.map((item) => ({
              ...item,
              id: `${companySlug}-${item.id}`,
            })),
          },
        };
      }
    }
    return block;
  });
  return updatedSection;
}

function mergeRoleContent(
  companyRoleModule: Module,
  roleModule: Module
): Module {
  if (hasRoleContent(companyRoleModule)) {
    console.log(
      `  Skipping ${companyRoleModule.slug} - already has role content`
    );
    return companyRoleModule;
  }

  const sectionsToMerge = getSectionsToMerge(roleModule);

  // Generate unique IDs for checklist items
  const uniqueSections = sectionsToMerge.map((section) =>
    generateUniqueBlockIds(section, companyRoleModule.company_slug || "")
  );

  // Prepend role sections before company-specific sections
  const mergedModule: Module = {
    ...companyRoleModule,
    sections: [...uniqueSections, ...companyRoleModule.sections],
  };

  return mergedModule;
}

function processCompanyRole(
  companySlug: string,
  roleSlug: string
): { success: boolean; skipped: boolean; error?: string } {
  const companyRoleFile = `company-role-${companySlug}-${roleSlug}.json`;
  const companyRolePath = path.join(MODULES_DIR, companyRoleFile);

  const roleFile = `role-${roleSlug}.json`;
  const rolePath = path.join(MODULES_DIR, roleFile);

  // Check if both files exist
  if (!fs.existsSync(companyRolePath)) {
    return {
      success: false,
      skipped: true,
      error: `Company-role module not found: ${companyRoleFile}`,
    };
  }

  if (!fs.existsSync(rolePath)) {
    return {
      success: false,
      skipped: true,
      error: `Role module not found: ${roleFile}`,
    };
  }

  const companyRoleModule = loadModule(companyRolePath);
  const roleModule = loadModule(rolePath);

  if (!companyRoleModule || !roleModule) {
    return { success: false, skipped: false, error: "Failed to load modules" };
  }

  // Check if already merged
  if (hasRoleContent(companyRoleModule)) {
    return { success: true, skipped: true };
  }

  const mergedModule = mergeRoleContent(companyRoleModule, roleModule);
  saveModule(companyRolePath, mergedModule);

  return { success: true, skipped: false };
}

function main() {
  console.log("Merging role content into Enterprise SaaS company-role modules...\n");

  // Get all company-role modules for Enterprise SaaS companies
  const files = fs.readdirSync(MODULES_DIR);
  const enterpriseSaasFiles = files.filter((f) => {
    if (!f.startsWith("company-role-")) return false;
    return ENTERPRISE_SAAS_COMPANIES.some((company) =>
      f.startsWith(`company-role-${company}-`)
    );
  });

  console.log(`Found ${enterpriseSaasFiles.length} Enterprise SaaS company-role modules\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of enterpriseSaasFiles) {
    // Extract company and role from filename
    let companySlug = "";
    let roleSlug = "";

    // Try each company to find the right match
    for (const company of ENTERPRISE_SAAS_COMPANIES) {
      if (file.startsWith(`company-role-${company}-`)) {
        companySlug = company;
        roleSlug = file
          .replace(`company-role-${company}-`, "")
          .replace(".json", "");
        break;
      }
    }

    if (!companySlug || !roleSlug) {
      console.log(`  Could not determine company/role: ${file}`);
      errors++;
      continue;
    }

    console.log(`Processing: ${companySlug}/${roleSlug}`);

    const result = processCompanyRole(companySlug, roleSlug);

    if (result.success) {
      if (result.skipped) {
        console.log(`  Already has role content, skipped`);
        skipped++;
      } else {
        console.log(`  Merged successfully`);
        processed++;
      }
    } else {
      console.log(`  Error: ${result.error}`);
      if (!result.skipped) errors++;
      else skipped++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${enterpriseSaasFiles.length}`);
}

main();
