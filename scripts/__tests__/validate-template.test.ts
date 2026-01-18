/**
 * Tests for Template Validation Script
 *
 * Verifies that:
 * - Templates parse without errors
 * - All sections have valid ContentBlockTypes
 * - Templates have at least one required section
 * - Word count estimates are reasonable (100-2000)
 * - Example content is provided for each section
 * - Templates use consistent markdown structure
 */

import * as fs from "fs";
import * as path from "path";
import {
  validateTemplate,
  TemplateSchema,
  SectionSchema,
  getAllTemplateFiles,
} from "../validate-template";
import { ContentBlockType } from "@/types";

// Valid ContentBlockTypes from the module schema
const validBlockTypes: ContentBlockType[] = [
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
];

describe("Template validation schema", () => {
  describe("SectionSchema", () => {
    test("accepts valid section", () => {
      const validSection = {
        title: "Test Section",
        blockTypes: ["text", "header"],
        required: true,
        estimatedWordCount: 300,
        exampleContent: "This is example content for the section.",
      };

      const result = SectionSchema.safeParse(validSection);
      expect(result.success).toBe(true);
    });

    test("rejects empty title", () => {
      const invalidSection = {
        title: "",
        blockTypes: ["text"],
        required: true,
      };

      const result = SectionSchema.safeParse(invalidSection);
      expect(result.success).toBe(false);
    });

    test("rejects empty blockTypes array", () => {
      const invalidSection = {
        title: "Test Section",
        blockTypes: [],
        required: true,
      };

      const result = SectionSchema.safeParse(invalidSection);
      expect(result.success).toBe(false);
    });

    test("rejects invalid blockType", () => {
      const invalidSection = {
        title: "Test Section",
        blockTypes: ["invalid-type"],
        required: true,
      };

      const result = SectionSchema.safeParse(invalidSection);
      expect(result.success).toBe(false);
    });

    test("rejects word count below 100", () => {
      const invalidSection = {
        title: "Test Section",
        blockTypes: ["text"],
        required: true,
        estimatedWordCount: 50,
      };

      const result = SectionSchema.safeParse(invalidSection);
      expect(result.success).toBe(false);
    });

    test("rejects word count above 2000", () => {
      const invalidSection = {
        title: "Test Section",
        blockTypes: ["text"],
        required: true,
        estimatedWordCount: 2500,
      };

      const result = SectionSchema.safeParse(invalidSection);
      expect(result.success).toBe(false);
    });
  });

  describe("TemplateSchema", () => {
    test("accepts valid template", () => {
      const validTemplate = {
        name: "Test Template",
        moduleType: "universal",
        sections: [
          {
            title: "Introduction",
            blockTypes: ["text"],
            required: true,
            estimatedWordCount: 200,
            exampleContent: "Welcome to the test.",
          },
        ],
      };

      const result = TemplateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    test("rejects empty name", () => {
      const invalidTemplate = {
        name: "",
        moduleType: "universal",
        sections: [
          {
            title: "Test",
            blockTypes: ["text"],
            required: true,
          },
        ],
      };

      const result = TemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });

    test("rejects invalid moduleType", () => {
      const invalidTemplate = {
        name: "Test Template",
        moduleType: "invalid",
        sections: [
          {
            title: "Test",
            blockTypes: ["text"],
            required: true,
          },
        ],
      };

      const result = TemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });

    test("rejects empty sections array", () => {
      const invalidTemplate = {
        name: "Test Template",
        moduleType: "universal",
        sections: [],
      };

      const result = TemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });

    test("accepts all valid module types", () => {
      const moduleTypes = [
        "universal",
        "industry",
        "role",
        "company",
        "company-role",
        "combined",
      ];

      for (const moduleType of moduleTypes) {
        const template = {
          name: "Test Template",
          moduleType,
          sections: [
            {
              title: "Test",
              blockTypes: ["text"],
              required: true,
            },
          ],
        };

        const result = TemplateSchema.safeParse(template);
        expect(result.success).toBe(true);
      }
    });
  });
});

describe("validateTemplate function", () => {
  test("returns error for non-existent file", () => {
    const result = validateTemplate("/nonexistent/file.json");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("File not found: /nonexistent/file.json");
  });

  test("returns error for invalid JSON", () => {
    const tempFile = path.join(__dirname, "temp-invalid.json");
    fs.writeFileSync(tempFile, "{ invalid json }");

    try {
      const result = validateTemplate(tempFile);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid JSON"))).toBe(true);
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  test("returns error for template with no required sections", () => {
    const tempFile = path.join(__dirname, "temp-no-required.json");
    const template = {
      name: "Test Template",
      moduleType: "universal",
      sections: [
        {
          title: "Optional Section",
          blockTypes: ["text"],
          required: false,
          estimatedWordCount: 200,
          exampleContent: "Optional content.",
        },
      ],
    };
    fs.writeFileSync(tempFile, JSON.stringify(template));

    try {
      const result = validateTemplate(tempFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Template must have at least one required section"
      );
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  test("returns warnings for missing example content", () => {
    const tempFile = path.join(__dirname, "temp-no-example.json");
    const template = {
      name: "Test Template",
      moduleType: "universal",
      sections: [
        {
          title: "Test Section",
          blockTypes: ["text"],
          required: true,
          estimatedWordCount: 200,
        },
      ],
    };
    fs.writeFileSync(tempFile, JSON.stringify(template));

    try {
      const result = validateTemplate(tempFile);
      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) =>
          w.includes("missing example content")
        )
      ).toBe(true);
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  test("returns warnings for missing word count", () => {
    const tempFile = path.join(__dirname, "temp-no-wordcount.json");
    const template = {
      name: "Test Template",
      moduleType: "universal",
      sections: [
        {
          title: "Test Section",
          blockTypes: ["text"],
          required: true,
          exampleContent: "Example content here.",
        },
      ],
    };
    fs.writeFileSync(tempFile, JSON.stringify(template));

    try {
      const result = validateTemplate(tempFile);
      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) =>
          w.includes("missing estimated word count")
        )
      ).toBe(true);
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  test("valid template returns template object", () => {
    const tempFile = path.join(__dirname, "temp-valid.json");
    const template = {
      name: "Valid Template",
      moduleType: "universal",
      sections: [
        {
          title: "Test Section",
          blockTypes: ["text", "header"],
          required: true,
          estimatedWordCount: 200,
          exampleContent: "This is valid example content.",
        },
      ],
    };
    fs.writeFileSync(tempFile, JSON.stringify(template));

    try {
      const result = validateTemplate(tempFile);
      expect(result.valid).toBe(true);
      expect(result.template).toBeDefined();
      expect(result.template?.name).toBe("Valid Template");
    } finally {
      fs.unlinkSync(tempFile);
    }
  });
});

describe("getAllTemplateFiles function", () => {
  test("returns array of template files", () => {
    const files = getAllTemplateFiles();
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.endsWith(".json"))).toBe(true);
  });
});

// Test each actual template file
describe("Module templates", () => {
  const templates = ["universal", "company", "role", "combined"];

  templates.forEach((template) => {
    describe(`${template}-module template`, () => {
      const templatePath = path.join(
        process.cwd(),
        "templates",
        "json",
        `${template}-module.json`
      );

      test("file exists", () => {
        expect(fs.existsSync(templatePath)).toBe(true);
      });

      test("parses without errors", () => {
        const result = validateTemplate(templatePath);
        expect(result.errors).toHaveLength(0);
        expect(result.valid).toBe(true);
      });

      test("all sections have valid ContentBlockTypes", () => {
        const content = fs.readFileSync(templatePath, "utf-8");
        const templateData = JSON.parse(content);

        for (const section of templateData.sections) {
          for (const blockType of section.blockTypes) {
            expect(validBlockTypes).toContain(blockType);
          }
        }
      });

      test("has at least one required section", () => {
        const content = fs.readFileSync(templatePath, "utf-8");
        const templateData = JSON.parse(content);

        const requiredSections = templateData.sections.filter(
          (s: { required: boolean }) => s.required
        );
        expect(requiredSections.length).toBeGreaterThanOrEqual(1);
      });

      test("word count estimates are reasonable (100-2000)", () => {
        const content = fs.readFileSync(templatePath, "utf-8");
        const templateData = JSON.parse(content);

        for (const section of templateData.sections) {
          if (section.estimatedWordCount !== undefined) {
            expect(section.estimatedWordCount).toBeGreaterThanOrEqual(100);
            expect(section.estimatedWordCount).toBeLessThanOrEqual(2000);
          }
        }
      });

      test("example content is provided for each section", () => {
        const content = fs.readFileSync(templatePath, "utf-8");
        const templateData = JSON.parse(content);

        for (const section of templateData.sections) {
          expect(section.exampleContent).toBeDefined();
          expect(section.exampleContent.length).toBeGreaterThan(10);
        }
      });
    });
  });
});

describe("Template consistency", () => {
  test("all templates use same section structure", () => {
    const files = getAllTemplateFiles();

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const template = JSON.parse(content);

      // Each template should have name, moduleType, and sections
      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("moduleType");
      expect(template).toHaveProperty("sections");
      expect(Array.isArray(template.sections)).toBe(true);

      // Each section should have consistent fields
      for (const section of template.sections) {
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("blockTypes");
        expect(section).toHaveProperty("required");
      }
    }
  });

  test("all templates reference valid block types from #6", () => {
    const files = getAllTemplateFiles();

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const template = JSON.parse(content);

      for (const section of template.sections) {
        for (const blockType of section.blockTypes) {
          expect(validBlockTypes).toContain(blockType);
        }
      }
    }
  });

  test("section headings follow consistent naming", () => {
    const files = getAllTemplateFiles();

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const template = JSON.parse(content);

      for (const section of template.sections) {
        // Section titles should not be empty and should be reasonable length
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.title.length).toBeLessThan(100);

        // Section titles should start with a capital letter or {
        expect(section.title).toMatch(/^[A-Z{]/);
      }
    }
  });
});
