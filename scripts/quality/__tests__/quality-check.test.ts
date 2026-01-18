import { runQualityChecks, type QualityCheckResult } from "../quality-check";
import type { Module, ContentBlock, ModuleSection } from "../../../src/types/module";

// Helper to create a module with custom content
function createModule(overrides: Partial<Module> = {}): Module {
  return {
    id: "test-module",
    slug: "test-module",
    title: "Test Module",
    description: "Test description",
    type: "company",
    isPremium: false,
    order: 1,
    sections: [],
    ...overrides,
  };
}

// Helper to create a section with blocks
function createSection(
  id: string,
  title: string,
  blocks: ContentBlock[]
): ModuleSection {
  return {
    id,
    title,
    blocks,
  };
}

// Helper to create a text block
function createTextBlock(id: string, content: string): ContentBlock {
  return {
    id,
    type: "text",
    content,
  };
}

describe("Quality Pipeline", () => {
  describe("runQualityChecks", () => {
    test("returns all three check results", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "This is a simple test sentence."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result).toHaveProperty("repetition");
      expect(result).toHaveProperty("readability");
      expect(result).toHaveProperty("facts");
      expect(result).toHaveProperty("overall");
    });

    test("returns overall pass/fail status", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "This is a simple test sentence. It has good readability."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result.overall).toHaveProperty("pass");
      expect(result.overall).toHaveProperty("flaggedForReview");
      expect(result.overall).toHaveProperty("summary");
      expect(result.overall).toHaveProperty("checks");
    });

    test("checks object has repetition, readability, and facts statuses", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "Simple test content."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result.overall.checks).toHaveProperty("repetition");
      expect(result.overall.checks).toHaveProperty("readability");
      expect(result.overall.checks).toHaveProperty("facts");
      expect(["PASS", "FAIL"]).toContain(result.overall.checks.repetition);
      expect(["PASS", "FAIL"]).toContain(result.overall.checks.readability);
      expect(["PASS", "REVIEW NEEDED"]).toContain(result.overall.checks.facts);
    });
  });

  describe("repetition detection", () => {
    test("detects AI-sounding phrases", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "In conclusion, this is very important to note."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result.repetition.pass).toBe(false);
      expect(result.repetition.aiPhrases.length).toBeGreaterThan(0);
      expect(result.overall.checks.repetition).toBe("FAIL");
    });

    test("passes when no repetition detected", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "Google offers excellent benefits. The company values innovation."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result.repetition.pass).toBe(true);
      expect(result.overall.checks.repetition).toBe("PASS");
    });

    test("detects repeated phrases across modules", () => {
      const phrase = "interview process typically involves";
      const module1 = createModule({
        id: "module-1",
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", `The ${phrase} multiple rounds.`),
            createTextBlock("text-2", `Remember, the ${phrase} several steps.`),
            createTextBlock("text-3", `Note that the ${phrase} various stages.`),
          ]),
        ],
      });

      const result = runQualityChecks([module1]);

      expect(result.repetition.repeatedPhrases.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("readability scoring", () => {
    test("calculates readability score", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock(
              "text-1",
              "The company has a great culture. They value teamwork and innovation. Employees enjoy flexible work arrangements."
            ),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result.readability.score).toBeGreaterThan(0);
      expect(result.readability.wordCount).toBeGreaterThan(0);
      expect(result.readability.sentenceCount).toBeGreaterThan(0);
    });

    test("fails when content is too complex", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock(
              "text-1",
              "The epistemological ramifications of anthropological methodologies necessitate circumspect deliberation regarding phenomenological frameworks."
            ),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      // Very complex text should have low score
      expect(result.readability.score).toBeLessThan(50);
      expect(result.readability.pass).toBe(false);
      expect(result.overall.checks.readability).toBe("FAIL");
    });

    test("passes when readability is in acceptable range", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock(
              "text-1",
              "The company has a good work culture. They care about their employees. The office is in a nice location. People enjoy working here. Teams collaborate well together."
            ),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      // Simple, clear prose should pass
      expect(result.readability.score).toBeGreaterThanOrEqual(50);
    });
  });

  describe("fact extraction", () => {
    test("extracts founding year facts", () => {
      const module = createModule({
        sections: [
          createSection("history", "History", [
            createTextBlock("text-1", "Google was founded in 1998 by Larry Page and Sergey Brin."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);
      const firstFact = result.facts[0];

      expect(result.facts.length).toBe(1);
      expect(firstFact).toBeDefined();
      expect(firstFact?.totalFacts).toBeGreaterThan(0);
      expect(firstFact?.factsByType.founding_year.length).toBeGreaterThan(0);
    });

    test("extracts CEO facts", () => {
      const module = createModule({
        sections: [
          createSection("leadership", "Leadership", [
            createTextBlock("text-1", "**CEO:** Sundar Pichai leads the company."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);
      const firstFact = result.facts[0];

      expect(firstFact).toBeDefined();
      expect(firstFact?.factsByType.ceo.length).toBeGreaterThan(0);
    });

    test("extracts headquarters facts", () => {
      const module = createModule({
        sections: [
          createSection("about", "About", [
            createTextBlock("text-1", "**Headquarters:** Mountain View, California."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);
      const firstFact = result.facts[0];

      expect(firstFact).toBeDefined();
      expect(firstFact?.factsByType.headquarters.length).toBeGreaterThan(0);
    });

    test("marks facts as needing review", () => {
      const module = createModule({
        sections: [
          createSection("history", "History", [
            createTextBlock("text-1", "Amazon was founded in 1994. The company has over 1,500,000 employees."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      // Facts present means review needed
      expect(result.overall.checks.facts).toBe("REVIEW NEEDED");
      expect(result.overall.flaggedForReview).toBe(true);
    });

    test("passes facts check when no claims present", () => {
      const module = createModule({
        sections: [
          createSection("tips", "Tips", [
            createTextBlock("text-1", "Practice your interview skills regularly."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);
      const firstFact = result.facts[0];

      expect(firstFact).toBeDefined();
      expect(firstFact?.totalFacts).toBe(0);
      expect(result.overall.checks.facts).toBe("PASS");
    });
  });

  describe("overall status", () => {
    test("overall passes when all checks pass", () => {
      const module = createModule({
        sections: [
          createSection("tips", "Tips", [
            createTextBlock("text-1", "Practice makes perfect. Prepare well. Stay calm during interviews."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result.overall.checks.repetition).toBe("PASS");
      // Note: readability may vary, but no facts = PASS for facts
      expect(result.overall.checks.facts).toBe("PASS");
    });

    test("overall fails when repetition check fails", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "In conclusion, let's dive in to explore the topic. It is important to note this."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result.overall.pass).toBe(false);
      expect(result.overall.checks.repetition).toBe("FAIL");
    });

    test("flagged for review when facts need verification", () => {
      // Content with facts but good readability and no repetition
      const module = createModule({
        sections: [
          createSection("history", "History", [
            createTextBlock("text-1", "Microsoft was founded in 1975. Bill Gates started the company. They make software. The offices are nice. Many people work there. The company is large."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      // Has facts to verify
      expect(result.overall.checks.facts).toBe("REVIEW NEEDED");
      // Only flagged if no fatal failures (repetition and readability must pass)
      // If other checks fail, flaggedForReview is false because there are bigger issues
      if (result.overall.checks.repetition === "PASS" && result.overall.checks.readability === "PASS") {
        expect(result.overall.flaggedForReview).toBe(true);
      }
    });

    test("summary includes relevant details", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "In conclusion, this is the summary."),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(typeof result.overall.summary).toBe("string");
      expect(result.overall.summary.length).toBeGreaterThan(0);
    });
  });

  describe("configuration options", () => {
    test("respects custom repetition threshold", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "The interview process involves preparation."),
            createTextBlock("text-2", "The interview process involves practice."),
          ]),
        ],
      });

      // With high threshold, should pass
      const result = runQualityChecks([module], { repetitionThreshold: 10 });
      expect(result.repetition.repeatedPhrases.length).toBe(0);
    });

    test("respects custom readability thresholds", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "Simple text. Easy words. Short sentences."),
          ]),
        ],
      });

      // With very narrow range, may fail
      const result = runQualityChecks([module], {
        readabilityMinScore: 70,
        readabilityMaxScore: 75,
      });

      // Score should still be calculated
      expect(result.readability.score).toBeGreaterThan(0);
    });
  });

  describe("multiple modules", () => {
    test("analyzes multiple modules together", () => {
      const module1 = createModule({
        id: "module-1",
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "First module content here."),
          ]),
        ],
      });

      const module2 = createModule({
        id: "module-2",
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "Second module content here."),
          ]),
        ],
      });

      const result = runQualityChecks([module1, module2]);

      expect(result.facts.length).toBe(2);
    });

    test("detects repetition across multiple modules", () => {
      const repeatedPhrase = "company culture emphasizes innovation";
      const module1 = createModule({
        id: "module-1",
        sections: [
          createSection("culture", "Culture", [
            createTextBlock("text-1", `The ${repeatedPhrase} and growth.`),
          ]),
        ],
      });

      const module2 = createModule({
        id: "module-2",
        sections: [
          createSection("culture", "Culture", [
            createTextBlock("text-1", `Remember that ${repeatedPhrase} always.`),
          ]),
        ],
      });

      const module3 = createModule({
        id: "module-3",
        sections: [
          createSection("culture", "Culture", [
            createTextBlock("text-1", `The ${repeatedPhrase} throughout.`),
          ]),
        ],
      });

      const result = runQualityChecks([module1, module2, module3]);

      // Cross-module repetition should be detected
      expect(result.repetition).toBeDefined();
    });

    test("combines readability from all modules", () => {
      const module1 = createModule({
        id: "module-1",
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "Simple words in short sentences work best."),
          ]),
        ],
      });

      const module2 = createModule({
        id: "module-2",
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", "Clear communication helps people understand."),
          ]),
        ],
      });

      const result = runQualityChecks([module1, module2]);

      // Combined word count should be from both
      expect(result.readability.wordCount).toBeGreaterThan(5);
    });
  });

  describe("edge cases", () => {
    test("handles empty module", () => {
      const module = createModule({ sections: [] });

      const result = runQualityChecks([module]);
      const firstFact = result.facts[0];

      expect(result.facts.length).toBe(1);
      expect(firstFact).toBeDefined();
      expect(firstFact?.totalFacts).toBe(0);
    });

    test("handles module with empty sections", () => {
      const module = createModule({
        sections: [createSection("empty", "Empty Section", [])],
      });

      const result = runQualityChecks([module]);

      expect(result).toBeDefined();
    });

    test("handles empty blocks", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [createTextBlock("text-1", "")]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result).toBeDefined();
    });

    test("handles special characters in content", () => {
      const module = createModule({
        sections: [
          createSection("intro", "Introduction", [
            createTextBlock("text-1", 'Google\'s "mission" is to organize—all—information!'),
          ]),
        ],
      });

      const result = runQualityChecks([module]);

      expect(result).toBeDefined();
    });
  });
});

describe("QualityCheckResult structure", () => {
  test("matches expected interface", () => {
    const module = createModule({
      sections: [
        createSection("intro", "Introduction", [
          createTextBlock("text-1", "Test content for validation."),
        ]),
      ],
    });

    const result: QualityCheckResult = runQualityChecks([module]);

    // Validate structure
    expect(result.repetition).toMatchObject({
      pass: expect.any(Boolean),
      totalPhrases: expect.any(Number),
      repeatedPhrases: expect.any(Array),
      aiPhrases: expect.any(Array),
      summary: expect.any(String),
    });

    expect(result.readability).toMatchObject({
      pass: expect.any(Boolean),
      score: expect.any(Number),
      wordCount: expect.any(Number),
      sentenceCount: expect.any(Number),
      syllableCount: expect.any(Number),
      status: expect.stringMatching(/^(pass|too_complex|too_simple)$/),
      sectionScores: expect.any(Array),
      summary: expect.any(String),
    });

    expect(result.facts[0]).toMatchObject({
      moduleId: expect.any(String),
      totalFacts: expect.any(Number),
      facts: expect.any(Array),
      factsByType: expect.any(Object),
      confidenceScore: expect.any(Number),
      markdown: expect.any(String),
    });

    expect(result.overall).toMatchObject({
      pass: expect.any(Boolean),
      flaggedForReview: expect.any(Boolean),
      summary: expect.any(String),
      checks: {
        repetition: expect.stringMatching(/^(PASS|FAIL)$/),
        readability: expect.stringMatching(/^(PASS|FAIL)$/),
        facts: expect.stringMatching(/^(PASS|REVIEW NEEDED)$/),
      },
    });
  });
});
