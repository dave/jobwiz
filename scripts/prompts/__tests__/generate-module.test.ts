/**
 * Tests for company module generation.
 */

import { generateCompanyModule } from "../generate-module";
import type { GenerationConfig } from "../generate-module";
import { validatePromptOutput } from "../../../src/lib/prompts/validation";

describe("generateCompanyModule", () => {
  const baseConfig: GenerationConfig = {
    type: "company",
    company: "google",
    dryRun: true,
    outputDir: "output",
    mockMode: true,
  };

  describe("module generation", () => {
    test("generates valid module for Google", async () => {
      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const config = { ...baseConfig, company: "google" };
      const module = await generateCompanyModule(config);

      console.log = originalLog;

      expect(module).toBeDefined();
      expect(module.id).toBe("company-google");
      expect(module.slug).toBe("company-google");
      expect(module.type).toBe("company");
      expect(module.companySlug).toBe("google");
      expect(module.isPremium).toBe(true);
      expect(module.sections.length).toBe(5); // culture, interview, tips, flags, trivia
    });

    test("generates valid module for Amazon", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const config = { ...baseConfig, company: "amazon" };
      const module = await generateCompanyModule(config);

      console.log = originalLog;

      expect(module).toBeDefined();
      expect(module.id).toBe("company-amazon");
      expect(module.title).toContain("Amazon");
      expect(module.sections.length).toBe(5);
    });
  });

  describe("section content", () => {
    let googleModule: Awaited<ReturnType<typeof generateCompanyModule>>;

    beforeAll(async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      googleModule = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;
    });

    test("culture section has required blocks", () => {
      const cultureSection = googleModule.sections.find(
        (s) => s.id === "culture-values"
      );
      expect(cultureSection).toBeDefined();
      expect(cultureSection?.blocks.length).toBeGreaterThanOrEqual(2);

      const hasHeader = cultureSection?.blocks.some((b) => b.type === "header");
      const hasText = cultureSection?.blocks.some((b) => b.type === "text");
      expect(hasHeader).toBe(true);
      expect(hasText).toBe(true);
    });

    test("interview section has checklist", () => {
      const interviewSection = googleModule.sections.find(
        (s) => s.id === "interview-process"
      );
      expect(interviewSection).toBeDefined();

      const hasChecklist = interviewSection?.blocks.some(
        (b) => b.type === "checklist"
      );
      expect(hasChecklist).toBe(true);
    });

    test("tips section has tips blocks", () => {
      const tipsSection = googleModule.sections.find(
        (s) => s.id === "insider-tips"
      );
      expect(tipsSection).toBeDefined();

      const hasTip = tipsSection?.blocks.some((b) => b.type === "tip");
      expect(hasTip).toBe(true);
    });

    test("red flags section has warning blocks", () => {
      const flagsSection = googleModule.sections.find(
        (s) => s.id === "red-flags"
      );
      expect(flagsSection).toBeDefined();

      const hasWarning = flagsSection?.blocks.some((b) => b.type === "warning");
      expect(hasWarning).toBe(true);
    });

    test("trivia section has quiz blocks", () => {
      const triviaSection = googleModule.sections.find(
        (s) => s.id === "company-trivia"
      );
      expect(triviaSection).toBeDefined();

      const quizzes = triviaSection?.blocks.filter((b) => b.type === "quiz");
      expect(quizzes?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("content quality", () => {
    test("content is company-specific (Google)", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      // Check that company name appears in content
      const allContent = JSON.stringify(module);
      expect(allContent).toContain("Google");
      expect(allContent).toContain("Sundar Pichai");
      expect(allContent).toContain("1998");
    });

    test("content is company-specific (Amazon)", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "amazon",
      });

      console.log = originalLog;

      const allContent = JSON.stringify(module);
      expect(allContent).toContain("Amazon");
      expect(allContent).toContain("Andy Jassy");
      expect(allContent).toContain("1994");
    });

    test("no AI-sounding phrases in generated content", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      const allContent = JSON.stringify(module).toLowerCase();
      const aiPhrases = [
        "in conclusion",
        "furthermore",
        "additionally",
        "it is important to note",
        "let's dive in",
      ];

      for (const phrase of aiPhrases) {
        expect(allContent).not.toContain(phrase);
      }
    });
  });

  describe("validation integration", () => {
    test("culture section passes validation", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      const cultureSection = module.sections.find(
        (s) => s.id === "culture-values"
      );
      const result = validatePromptOutput(
        { section: cultureSection },
        "company-culture"
      );
      expect(result.valid).toBe(true);
    });

    test("interview section passes validation", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      const interviewSection = module.sections.find(
        (s) => s.id === "interview-process"
      );
      const result = validatePromptOutput(
        { section: interviewSection },
        "company-interview-stages"
      );
      expect(result.valid).toBe(true);
    });

    test("trivia section passes validation", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      const triviaSection = module.sections.find(
        (s) => s.id === "company-trivia"
      );
      const result = validatePromptOutput(
        { section: triviaSection },
        "company-trivia"
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("module structure", () => {
    test("all sections have unique IDs", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      const sectionIds = module.sections.map((s) => s.id);
      const uniqueIds = new Set(sectionIds);
      expect(uniqueIds.size).toBe(sectionIds.length);
    });

    test("all blocks across all sections have unique IDs", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      const allBlockIds: string[] = [];
      for (const section of module.sections) {
        for (const block of section.blocks) {
          allBlockIds.push(block.id);
        }
      }

      const uniqueIds = new Set(allBlockIds);
      expect(uniqueIds.size).toBe(allBlockIds.length);
    });

    test("module has required metadata fields", async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      const module = await generateCompanyModule({
        ...baseConfig,
        company: "google",
      });

      console.log = originalLog;

      expect(module).toHaveProperty("id");
      expect(module).toHaveProperty("slug");
      expect(module).toHaveProperty("type");
      expect(module).toHaveProperty("title");
      expect(module).toHaveProperty("description");
      expect(module).toHaveProperty("companySlug");
      expect(module).toHaveProperty("isPremium");
      expect(module).toHaveProperty("order");
      expect(module).toHaveProperty("sections");
    });
  });
});
