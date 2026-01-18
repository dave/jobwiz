import type { Module, ContentBlockType } from "@/types";
import universal from "./universal-interview-basics.json";
import industry from "./industry-tech.json";
import role from "./role-software-engineer.json";
import company from "./company-google.json";

// Type assertions - if these fail, TypeScript will error at compile time
const _universal: Module = universal as Module;
const _industry: Module = industry as Module;
const _role: Module = role as Module;
const _company: Module = company as Module;

const validModuleTypes = [
  "universal",
  "industry",
  "role",
  "company",
  "company-role",
] as const;

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

describe("Sample modules", () => {
  const allModules = [universal, industry, role, company];

  test("all samples have valid type field", () => {
    expect(validModuleTypes).toContain(universal.type);
    expect(validModuleTypes).toContain(industry.type);
    expect(validModuleTypes).toContain(role.type);
    expect(validModuleTypes).toContain(company.type);
  });

  test("all samples have required fields", () => {
    const requiredFields = [
      "id",
      "slug",
      "type",
      "title",
      "sections",
      "isPremium",
      "order",
    ];

    allModules.forEach((mod) => {
      requiredFields.forEach((field) => {
        expect(mod).toHaveProperty(field);
      });
    });
  });

  test("all content blocks use valid ContentBlockType", () => {
    allModules.forEach((mod) => {
      mod.sections.forEach((section) => {
        section.blocks.forEach((block) => {
          expect(validBlockTypes).toContain(block.type);
        });
      });
    });
  });

  test("universal module has correct type", () => {
    expect(universal.type).toBe("universal");
  });

  test("industry module has correct type and industry field", () => {
    expect(industry.type).toBe("industry");
    expect(industry).toHaveProperty("industry");
  });

  test("role module has correct type and roleCategory field", () => {
    expect(role.type).toBe("role");
    expect(role).toHaveProperty("roleCategory");
  });

  test("company module has correct type and companySlug field", () => {
    expect(company.type).toBe("company");
    expect(company).toHaveProperty("companySlug");
  });

  test("all sections have required fields", () => {
    allModules.forEach((mod) => {
      mod.sections.forEach((section) => {
        expect(section).toHaveProperty("id");
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("blocks");
        expect(Array.isArray(section.blocks)).toBe(true);
      });
    });
  });

  test("all blocks have required fields", () => {
    allModules.forEach((mod) => {
      mod.sections.forEach((section) => {
        section.blocks.forEach((block) => {
          expect(block).toHaveProperty("id");
          expect(block).toHaveProperty("type");
        });
      });
    });
  });

  test("quiz blocks have valid structure", () => {
    allModules.forEach((mod) => {
      mod.sections.forEach((section) => {
        section.blocks
          .filter((block) => block.type === "quiz")
          .forEach((block) => {
            expect(block).toHaveProperty("question");
            expect(block).toHaveProperty("options");
            // @ts-expect-error - accessing quiz-specific property
            expect(Array.isArray(block.options)).toBe(true);
          });
      });
    });
  });

  test("checklist blocks have valid structure", () => {
    allModules.forEach((mod) => {
      mod.sections.forEach((section) => {
        section.blocks
          .filter((block) => block.type === "checklist")
          .forEach((block) => {
            expect(block).toHaveProperty("items");
            // @ts-expect-error - accessing checklist-specific property
            expect(Array.isArray(block.items)).toBe(true);
          });
      });
    });
  });
});

// Suppress unused variable warnings for type assertions
void _universal;
void _industry;
void _role;
void _company;
