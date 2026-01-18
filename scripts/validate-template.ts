#!/usr/bin/env ts-node
/**
 * Template Validation Script
 *
 * Validates module template JSON files against the defined schema.
 * Ensures templates conform to ContentBlockType and module type definitions.
 *
 * Usage:
 *   npx ts-node scripts/validate-template.ts templates/json/universal-module.json
 *   npx ts-node scripts/validate-template.ts --all
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// ContentBlockType enum values from src/types/module.ts
const ContentBlockTypes = [
  "text",
  "header",
  "quote",
  "tip",
  "warning",
  "video",
  "audio",
  "image",
  "quiz",
  "checklist",
  "infographic",
  "animation",
] as const;

// Module types from src/types/module.ts
const ModuleTypes = [
  "universal",
  "industry",
  "role",
  "company",
  "company-role",
  "combined", // Alias for company-role in templates
] as const;

// Zod schema for a template section
const SectionSchema = z.object({
  title: z.string().min(1, "Section title is required"),
  blockTypes: z
    .array(z.enum(ContentBlockTypes))
    .min(1, "At least one block type required"),
  required: z.boolean(),
  estimatedWordCount: z
    .number()
    .min(100, "Word count should be at least 100")
    .max(2000, "Word count should not exceed 2000")
    .optional(),
  exampleContent: z
    .string()
    .min(10, "Example content should be at least 10 characters")
    .optional(),
});

// Zod schema for a complete template
const TemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  moduleType: z.enum(ModuleTypes),
  description: z.string().optional(),
  sections: z.array(SectionSchema).min(1, "At least one section required"),
});

// Type inference from schema
export type Section = z.infer<typeof SectionSchema>;
export type Template = z.infer<typeof TemplateSchema>;

/**
 * Validates a template file
 */
function validateTemplate(filePath: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  template?: Template;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`], warnings };
  }

  // Read and parse JSON
  let rawData: unknown;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    rawData = JSON.parse(content);
  } catch (e) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
      warnings,
    };
  }

  // Validate against schema
  const result = TemplateSchema.safeParse(rawData);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return { valid: false, errors, warnings };
  }

  const template = result.data;

  // Additional validation: at least one required section
  const requiredSections = template.sections.filter((s) => s.required);
  if (requiredSections.length === 0) {
    errors.push("Template must have at least one required section");
  }

  // Additional validation: all sections have example content
  for (const section of template.sections) {
    if (!section.exampleContent) {
      warnings.push(`Section "${section.title}" is missing example content`);
    }
    if (!section.estimatedWordCount) {
      warnings.push(
        `Section "${section.title}" is missing estimated word count`
      );
    }
  }

  // Additional validation: word count in reasonable range
  for (const section of template.sections) {
    if (section.estimatedWordCount) {
      if (section.estimatedWordCount < 100) {
        warnings.push(
          `Section "${section.title}" word count ${section.estimatedWordCount} is very low`
        );
      }
      if (section.estimatedWordCount > 2000) {
        warnings.push(
          `Section "${section.title}" word count ${section.estimatedWordCount} may be too high`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    template: errors.length === 0 ? template : undefined,
  };
}

/**
 * Get all template JSON files
 */
function getAllTemplateFiles(): string[] {
  const templatesDir = path.join(process.cwd(), "templates", "json");
  if (!fs.existsSync(templatesDir)) {
    return [];
  }
  return fs
    .readdirSync(templatesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(templatesDir, f));
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: validate-template <file.json> | --all");
    process.exit(1);
  }

  let files: string[];
  if (args[0] === "--all") {
    files = getAllTemplateFiles();
    if (files.length === 0) {
      console.error("No template JSON files found in templates/json/");
      process.exit(1);
    }
  } else {
    files = [args[0] as string];
  }

  let allValid = true;

  for (const file of files) {
    const fileName = path.basename(file);
    console.log(`\nValidating: ${fileName}`);
    console.log("─".repeat(50));

    const result = validateTemplate(file);

    if (result.errors.length > 0) {
      console.log("❌ Errors:");
      for (const error of result.errors) {
        console.log(`   • ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log("⚠️  Warnings:");
      for (const warning of result.warnings) {
        console.log(`   • ${warning}`);
      }
    }

    if (result.valid) {
      console.log("✅ Valid");
      if (result.template) {
        console.log(`   Module: ${result.template.moduleType}`);
        console.log(`   Sections: ${result.template.sections.length}`);
        console.log(
          `   Required: ${result.template.sections.filter((s) => s.required).length}`
        );
      }
    } else {
      allValid = false;
    }
  }

  console.log("\n" + "═".repeat(50));
  if (allValid) {
    console.log("✅ All templates valid");
    process.exit(0);
  } else {
    console.log("❌ Some templates have errors");
    process.exit(1);
  }
}

// Export for testing
export { validateTemplate, TemplateSchema, SectionSchema, getAllTemplateFiles };

// Run if executed directly (ESM compatible)
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("validate-template.ts");

if (isMainModule) {
  main();
}
