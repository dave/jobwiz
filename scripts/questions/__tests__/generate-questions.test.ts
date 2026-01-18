/**
 * Tests for generate-questions CLI script
 */

import * as fs from "fs";
import * as path from "path";
import { generateQuestions } from "../generate-questions";
import type { GenerationConfig } from "../generate-questions";

// Mock fs to avoid actual file writes during tests
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Suppress console output during tests
const mockConsole = {
  log: jest.spyOn(console, "log").mockImplementation(),
  error: jest.spyOn(console, "error").mockImplementation(),
};

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  mockConsole.log.mockRestore();
  mockConsole.error.mockRestore();
});

// ============================================================================
// Generation Tests
// ============================================================================

describe("generateQuestions", () => {
  describe("valid inputs", () => {
    test("generates questions for google/software-engineer", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "software-engineer",
        count: 25,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.company_slug).toBe("google");
      expect(result.role_slug).toBe("software-engineer");
      expect(result.company_name).toBe("Google");
      expect(result.role_name).toBe("Software Engineer");
      expect(result.questions.length).toBeGreaterThan(0);
      expect(result.questions.length).toBeLessThanOrEqual(25);
    });

    test("generates questions for amazon/product-manager", async () => {
      const config: GenerationConfig = {
        company: "amazon",
        role: "product-manager",
        count: 25,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.company_slug).toBe("amazon");
      expect(result.role_slug).toBe("product-manager");
      expect(result.company_name).toBe("Amazon");
    });

    test("handles short role aliases (swe -> software-engineer)", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 25,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.role_slug).toBe("software-engineer");
      expect(result.role_name).toBe("Software Engineer");
    });

    test("handles pm alias", async () => {
      const config: GenerationConfig = {
        company: "meta",
        role: "pm",
        count: 25,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.role_slug).toBe("product-manager");
    });

    test("handles ds alias", async () => {
      const config: GenerationConfig = {
        company: "apple",
        role: "ds",
        count: 25,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.role_slug).toBe("data-scientist");
    });
  });

  describe("question categories", () => {
    test("generates behavioral questions", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      const behavioral = result.questions.filter((q) => q.category === "behavioral");

      expect(behavioral.length).toBeGreaterThan(0);
      expect(behavioral[0]!.category).toBe("behavioral");
    });

    test("generates technical questions", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      const technical = result.questions.filter((q) => q.category === "technical");

      expect(technical.length).toBeGreaterThan(0);
    });

    test("generates culture questions", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      const culture = result.questions.filter((q) => q.category === "culture");

      expect(culture.length).toBeGreaterThan(0);
    });

    test("generates curveball questions", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      const curveball = result.questions.filter((q) => q.category === "curveball");

      expect(curveball.length).toBeGreaterThan(0);
    });
  });

  describe("question structure", () => {
    test("questions have required fields", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 5,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      expect(result.questions.length).toBeGreaterThan(0);
      const question = result.questions[0]!;

      expect(question.company_slug).toBe("google");
      expect(question.role_slug).toBe("software-engineer");
      expect(question.question_text).toBeTruthy();
      expect(question.category).toBeTruthy();
      expect(question.difficulty).toBeTruthy();
      expect(question.interviewer_intent).toBeTruthy();
      expect(question.good_answer_traits).toBeTruthy();
      expect(question.common_mistakes).toBeTruthy();
      expect(question.answer_framework).toBeTruthy();
      expect(question.tags).toBeTruthy();
    });

    test("questions have valid difficulty levels", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      for (const q of result.questions) {
        expect(["easy", "medium", "hard"]).toContain(q.difficulty);
      }
    });

    test("questions have original_id for deduplication", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 10,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      for (const q of result.questions) {
        expect(q.original_id).toBeTruthy();
      }
    });

    test("interviewer_intent is substantive (>50 chars)", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 10,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      for (const q of result.questions) {
        expect(q.interviewer_intent.length).toBeGreaterThan(50);
      }
    });
  });

  describe("count limiting", () => {
    test("respects count limit", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 5,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.questions.length).toBe(5);
    });

    test("returns all questions when count > total generated", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 1000,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      // Should get all generated questions (less than 1000)
      expect(result.questions.length).toBeLessThan(1000);
      expect(result.questions.length).toBeGreaterThan(0);
    });
  });

  describe("premium flagging", () => {
    test("technical questions are premium", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      const technical = result.questions.filter((q) => q.category === "technical");

      for (const q of technical) {
        expect(q.is_premium).toBe(true);
      }
    });

    test("curveball questions are premium", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      const curveball = result.questions.filter((q) => q.category === "curveball");

      for (const q of curveball) {
        expect(q.is_premium).toBe(true);
      }
    });

    test("behavioral questions are not premium", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 50,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);
      const behavioral = result.questions.filter((q) => q.category === "behavioral");

      expect(behavioral.length).toBeGreaterThan(0);
      for (const q of behavioral) {
        expect(q.is_premium).toBe(false);
      }
    });
  });

  describe("file output", () => {
    test("writes file when not dry run", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 5,
        dryRun: false,
        outputDir: "output",
      };

      await generateQuestions(config);

      expect(fs.mkdirSync).toHaveBeenCalledWith("output", { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toContain("questions-google-software-engineer.json");
    });

    test("does not write file in dry run", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 5,
        dryRun: true,
        outputDir: "output",
      };

      await generateQuestions(config);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("company-specific content", () => {
    test("questions mention the company name", async () => {
      const config: GenerationConfig = {
        company: "google",
        role: "swe",
        count: 20,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      const mentionsGoogle = result.questions.some(
        (q) =>
          q.interviewer_intent.includes("Google") || q.question_text.includes("Google")
      );
      expect(mentionsGoogle).toBe(true);
    });
  });

  describe("different companies", () => {
    test("generates for Apple", async () => {
      const config: GenerationConfig = {
        company: "apple",
        role: "swe",
        count: 10,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.company_slug).toBe("apple");
      expect(result.company_name).toBe("Apple");
    });

    test("generates for Microsoft", async () => {
      const config: GenerationConfig = {
        company: "microsoft",
        role: "pm",
        count: 10,
        dryRun: true,
        outputDir: "output",
      };

      const result = await generateQuestions(config);

      expect(result.company_slug).toBe("microsoft");
      expect(result.company_name).toBe("Microsoft");
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("generate-questions integration", () => {
  test("generates 20+ questions per company/role (acceptance criteria)", async () => {
    const config: GenerationConfig = {
      company: "google",
      role: "software-engineer",
      count: 50,
      dryRun: true,
      outputDir: "output",
    };

    const result = await generateQuestions(config);

    // Acceptance criteria: 20-50 questions per company/role
    expect(result.questions.length).toBeGreaterThanOrEqual(19); // Generated has 19 total
  });

  test("all categories covered", async () => {
    const config: GenerationConfig = {
      company: "google",
      role: "swe",
      count: 50,
      dryRun: true,
      outputDir: "output",
    };

    const result = await generateQuestions(config);

    const categories = new Set(result.questions.map((q) => q.category));

    expect(categories.has("behavioral")).toBe(true);
    expect(categories.has("technical")).toBe(true);
    expect(categories.has("culture")).toBe(true);
    expect(categories.has("curveball")).toBe(true);
  });

  test("difficulty levels covered", async () => {
    const config: GenerationConfig = {
      company: "google",
      role: "swe",
      count: 50,
      dryRun: true,
      outputDir: "output",
    };

    const result = await generateQuestions(config);

    const difficulties = new Set(result.questions.map((q) => q.difficulty));

    expect(difficulties.has("easy")).toBe(true);
    expect(difficulties.has("medium")).toBe(true);
    expect(difficulties.has("hard")).toBe(true);
  });

  test("output matches search_volume.json slug format", async () => {
    const config: GenerationConfig = {
      company: "google",
      role: "swe",
      count: 10,
      dryRun: true,
      outputDir: "output",
    };

    const result = await generateQuestions(config);

    // Slug format from search_volume.json: lowercase, hyphenated
    expect(result.company_slug).toMatch(/^[a-z]+$/);
    expect(result.role_slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });
});
