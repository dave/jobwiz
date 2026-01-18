/**
 * Tests for Company Fact Verification Script
 */

import {
  extractFactsFromModule,
  ExtractedFact,
  FactCheckResult,
  FactType,
} from "../check-facts";
import type { Module, ModuleSection, ContentBlock } from "../../../src/types/module";

// Helper to create a simple text block
function createTextBlock(id: string, content: string): ContentBlock {
  return { id, type: "text", content };
}

// Helper to create a section with blocks
function createSection(id: string, blocks: ContentBlock[]): ModuleSection {
  return { id, title: `Section ${id}`, blocks };
}

// Helper to create a module
function createModule(
  id: string,
  sections: ModuleSection[],
  companySlug?: string
): Module & { companySlug?: string } {
  return {
    id,
    slug: id,
    type: "company",
    title: `Module ${id}`,
    sections,
    isPremium: false,
    order: 1,
    companySlug,
  };
}

describe("Fact Verification", () => {
  describe("extractFactsFromModule", () => {
    test("extracts founding year claims", () => {
      const module = createModule("test-1", [
        createSection("section-1", [
          createTextBlock("block-1", "The company was founded in 1998."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founding_year).toHaveLength(1);
      expect(result.factsByType.founding_year[0]?.value).toBe("1998");
    });

    test("extracts founders claims", () => {
      const module = createModule("test-2", [
        createSection("section-1", [
          createTextBlock(
            "block-1",
            "Google was founded in 1998 by Larry Page and Sergey Brin."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founders).toHaveLength(1);
      expect(result.factsByType.founders[0]?.value).toContain("Larry Page");
    });

    test("extracts headquarters location claims", () => {
      const module = createModule("test-3", [
        createSection("section-1", [
          createTextBlock(
            "block-1",
            "The company is headquartered in Mountain View, California."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.headquarters).toHaveLength(1);
      expect(result.factsByType.headquarters[0]?.value).toContain("Mountain View");
    });

    test("extracts employee count claims", () => {
      const module = createModule("test-4", [
        createSection("section-1", [
          createTextBlock("block-1", "The company has over 180,000 employees worldwide."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.employee_count).toHaveLength(1);
      expect(result.factsByType.employee_count[0]?.value).toBe("180,000");
    });

    test("extracts mission statement claims", () => {
      const module = createModule("test-5", [
        createSection("section-1", [
          createTextBlock(
            "block-1",
            'Their mission is "To organize the world\'s information."'
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.mission).toHaveLength(1);
      expect(result.factsByType.mission[0]?.value).toContain("organize");
    });

    test("extracts CEO claims", () => {
      const module = createModule("test-6", [
        createSection("section-1", [
          createTextBlock("block-1", "The current CEO is Sundar Pichai."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.ceo).toHaveLength(1);
      expect(result.factsByType.ceo[0]?.value).toBe("Sundar Pichai");
    });

    test("extracts interview process claims", () => {
      const module = createModule("test-7", [
        createSection("section-1", [
          createTextBlock(
            "block-1",
            "The interview process consists of 5 rounds. Timeline is typically 4-6 weeks."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.interview_process.length).toBeGreaterThanOrEqual(1);
    });

    test("extracts culture claims", () => {
      const module = createModule("test-8", [
        createSection("section-1", [
          createTextBlock(
            "block-1",
            "The company values innovation and collaboration. They look for candidates who demonstrate growth mindset."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.culture_claim.length).toBeGreaterThanOrEqual(1);
    });

    test("extracts acquisition claims", () => {
      const module = createModule("test-9", [
        createSection("section-1", [
          createTextBlock("block-1", "Google acquired YouTube in 2006 for $1.65B."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.acquisition).toHaveLength(1);
      expect(result.factsByType.acquisition[0]?.value).toContain("YouTube");
    });

    test("extracts revenue claims", () => {
      const module = createModule("test-10", [
        createSection("section-1", [
          createTextBlock("block-1", "Annual revenue is approximately $280 billion."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.revenue).toHaveLength(1);
    });

    test("returns empty result for module with no facts", () => {
      const module = createModule("test-11", [
        createSection("section-1", [
          createTextBlock(
            "block-1",
            "Prepare well for your interview. Practice coding problems."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.totalFacts).toBe(0);
    });

    test("extracts multiple facts from same block", () => {
      const module = createModule("test-12", [
        createSection("section-1", [
          createTextBlock(
            "block-1",
            "Founded in 2004, Meta is headquartered in Menlo Park. CEO is Mark Zuckerberg."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.totalFacts).toBeGreaterThanOrEqual(3);
      expect(result.factsByType.founding_year).toHaveLength(1);
      expect(result.factsByType.headquarters).toHaveLength(1);
      expect(result.factsByType.ceo).toHaveLength(1);
    });

    test("avoids duplicate facts", () => {
      const module = createModule("test-13", [
        createSection("section-1", [
          createTextBlock("block-1", "Founded in 1998."),
          createTextBlock("block-2", "The company was founded in 1998."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      // Should deduplicate same year
      expect(result.factsByType.founding_year).toHaveLength(1);
    });
  });

  describe("fact location tracking", () => {
    test("tracks module, section, and block location", () => {
      const module = createModule("company-test", [
        createSection("overview-section", [
          createTextBlock("intro-block", "Founded in 2010."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.facts[0]?.location).toEqual({
        moduleId: "company-test",
        sectionId: "overview-section",
        blockId: "intro-block",
        blockType: "text",
      });
    });
  });

  describe("verification sources", () => {
    test("suggests Wikipedia for founding year", () => {
      const module = createModule("test", [
        createSection("s1", [createTextBlock("b1", "Founded in 2005.")]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founding_year[0]?.verificationSources).toContain(
        "Wikipedia"
      );
    });

    test("suggests Glassdoor for interview process claims", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock("b1", "Expect 4 rounds of interviews."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      const interviewFact = result.factsByType.interview_process[0];
      expect(interviewFact?.verificationSources).toContain("Glassdoor interviews");
    });

    test("suggests company website for mission", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock("b1", 'Their mission is "To make the world a better place."'),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.mission[0]?.verificationSources).toContain(
        "company website (Mission/About page)"
      );
    });
  });

  describe("confidence score", () => {
    test("returns high confidence for easily verifiable facts", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock(
            "b1",
            "Founded in 1998 by Larry Page. Headquartered in Mountain View. CEO is Sundar Pichai."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
    });

    test("returns lower confidence for mostly culture claims", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock(
            "b1",
            "The company values innovation. They look for creative thinkers. The culture rewards risk-taking."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.confidenceScore).toBeLessThan(100);
    });

    test("returns 100 for module with no facts", () => {
      const module = createModule("test", [
        createSection("s1", [createTextBlock("b1", "Practice coding daily.")]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.confidenceScore).toBe(100);
    });
  });

  describe("markdown checklist generation", () => {
    test("generates markdown with module title", () => {
      const module = createModule(
        "company-google",
        [createSection("s1", [createTextBlock("b1", "Founded in 1998.")])],
        "google"
      );

      const result = extractFactsFromModule(module);

      expect(result.markdown).toContain("# Fact Verification Checklist");
      expect(result.markdown).toContain("company-google");
    });

    test("includes checkbox syntax for each fact", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock("b1", "Founded in 2005. CEO is John Smith."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.markdown).toContain("- [ ]");
    });

    test("includes verification source suggestions", () => {
      const module = createModule("test", [
        createSection("s1", [createTextBlock("b1", "Founded in 2005.")]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.markdown).toContain("Verify:");
      expect(result.markdown).toContain("Wikipedia");
    });

    test("includes location information", () => {
      const module = createModule("test", [
        createSection("overview", [
          createTextBlock("intro", "Founded in 2005."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.markdown).toContain("overview > intro");
    });

    test("generates summary table with counts", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock("b1", "Founded in 2005. CEO is Jane Doe."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.markdown).toContain("## Verification Summary");
      expect(result.markdown).toContain("| Category | Count | Priority |");
    });

    test("includes context for each fact", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock(
            "b1",
            "The company was founded in 2005 by visionary entrepreneurs."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.markdown).toContain("Context:");
    });
  });

  describe("content block type handling", () => {
    test("extracts facts from tip blocks", () => {
      const module = createModule("test", [
        createSection("s1", [
          {
            id: "tip-1",
            type: "tip",
            content: "Google was founded in 1998.",
          } as ContentBlock,
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founding_year).toHaveLength(1);
    });

    test("extracts facts from header blocks", () => {
      const module = createModule("test", [
        createSection("s1", [
          {
            id: "header-1",
            type: "header",
            content: "Company founded in 2010",
            level: 2,
          } as ContentBlock,
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founding_year).toHaveLength(1);
    });

    test("extracts facts from quiz blocks", () => {
      const module = createModule("test", [
        createSection("s1", [
          {
            id: "quiz-1",
            type: "quiz",
            question: "When was Google founded?",
            options: [
              { id: "a", text: "1998", isCorrect: true },
              { id: "b", text: "2000", isCorrect: false },
            ],
            explanation: "Google was founded in 1998.",
          } as ContentBlock,
        ]),
      ]);

      const result = extractFactsFromModule(module);

      // Should extract from question and/or explanation
      expect(result.factsByType.founding_year.length).toBeGreaterThanOrEqual(1);
    });

    test("extracts facts from checklist blocks", () => {
      const module = createModule("test", [
        createSection("s1", [
          {
            id: "checklist-1",
            type: "checklist",
            title: "Interview prep for Google, founded in 1998",
            items: [
              { id: "i1", text: "Research company history", required: true },
            ],
          } as ContentBlock,
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founding_year).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    test("handles empty module", () => {
      const module = createModule("empty", []);

      const result = extractFactsFromModule(module);

      expect(result.totalFacts).toBe(0);
      expect(result.confidenceScore).toBe(100);
    });

    test("handles module with empty sections", () => {
      const module = createModule("test", [createSection("s1", [])]);

      const result = extractFactsFromModule(module);

      expect(result.totalFacts).toBe(0);
    });

    test("handles special characters in content", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock(
            "b1",
            "Founded in 1998 (originally as 'BackRub'). CEO: Sundar Pichai."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founding_year).toHaveLength(1);
      expect(result.factsByType.ceo).toHaveLength(1);
    });

    test("handles multi-paragraph content", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock(
            "b1",
            "First paragraph about the company.\n\nSecond paragraph: Founded in 2010.\n\nThird paragraph about culture."
          ),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.founding_year).toHaveLength(1);
    });

    test("handles numeric variations", () => {
      const module = createModule("test", [
        createSection("s1", [
          createTextBlock("b1", "The company has 50000 employees."),
        ]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.factsByType.employee_count).toHaveLength(1);
    });
  });

  describe("flags unverifiable claims", () => {
    test("marks all facts as unverified initially", () => {
      const module = createModule("test", [
        createSection("s1", [createTextBlock("b1", "Founded in 2005.")]),
      ]);

      const result = extractFactsFromModule(module);

      expect(result.facts[0]?.status).toBe("unverified");
    });
  });

  describe("real sample files", () => {
    const fs = require("fs");
    const path = require("path");

    test("extracts facts from with-facts.json sample", () => {
      const samplePath = path.join(__dirname, "../samples/with-facts.json");
      if (fs.existsSync(samplePath)) {
        const content = fs.readFileSync(samplePath, "utf-8");
        const module = JSON.parse(content) as Module;

        const result = extractFactsFromModule(module);

        expect(result.totalFacts).toBeGreaterThan(5);
        expect(result.factsByType.founding_year).toHaveLength(1);
        expect(result.factsByType.founders).toHaveLength(1);
        expect(result.factsByType.headquarters).toHaveLength(1);
        expect(result.factsByType.ceo).toHaveLength(1);
      }
    });

    test("extracts minimal facts from minimal-facts.json sample", () => {
      const samplePath = path.join(__dirname, "../samples/minimal-facts.json");
      if (fs.existsSync(samplePath)) {
        const content = fs.readFileSync(samplePath, "utf-8");
        const module = JSON.parse(content) as Module;

        const result = extractFactsFromModule(module);

        // This file should have very few or no company-specific facts
        expect(result.factsByType.founding_year).toHaveLength(0);
        expect(result.factsByType.founders).toHaveLength(0);
        expect(result.factsByType.ceo).toHaveLength(0);
      }
    });
  });
});
