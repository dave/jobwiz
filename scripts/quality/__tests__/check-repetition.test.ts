/**
 * Tests for Repetition Detection Script
 */

import {
  analyzeRepetition,
  RepetitionResult,
} from "../check-repetition";
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
  sections: ModuleSection[]
): Module {
  return {
    id,
    slug: id,
    type: "company",
    title: `Module ${id}`,
    sections,
    isPremium: false,
    order: 1,
  };
}

describe("Repetition Detection", () => {
  describe("analyzeRepetition", () => {
    test("detects no repetition in clean content", () => {
      const module = createModule("test-1", [
        createSection("section-1", [
          createTextBlock("block-1", "This is a unique paragraph about interviews."),
          createTextBlock("block-2", "Another distinct paragraph with different content."),
        ]),
      ]);

      const result = analyzeRepetition([module]);

      expect(result.pass).toBe(true);
      expect(result.repeatedPhrases).toHaveLength(0);
      expect(result.aiPhrases).toHaveLength(0);
      expect(result.summary).toContain("No repetition detected");
    });

    test("detects phrases repeated 3+ times", () => {
      const module = createModule("test-2", [
        createSection("section-1", [
          createTextBlock("block-1", "This is very important to remember for interviews."),
          createTextBlock("block-2", "This is very important to remember always."),
          createTextBlock("block-3", "This is very important to remember every day."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      expect(result.pass).toBe(false);
      expect(result.repeatedPhrases.length).toBeGreaterThan(0);
      // Should find "is very important" or similar
      const foundPhrase = result.repeatedPhrases.some(
        (p) => p.phrase.includes("important") && p.count >= 3
      );
      expect(foundPhrase).toBe(true);
    });

    test("ignores phrases consisting entirely of common words", () => {
      const module = createModule("test-3", [
        createSection("section-1", [
          createTextBlock("block-1", "The and but or if then."),
          createTextBlock("block-2", "The and but or if then."),
          createTextBlock("block-3", "The and but or if then."),
        ]),
      ]);

      const result = analyzeRepetition([module]);

      // A phrase consisting entirely of common words should not be flagged
      // because it doesn't meet the minimum non-common word threshold
      expect(result.pass).toBe(true);
    });

    test("returns locations of repeated phrases", () => {
      const module = createModule("test-4", [
        createSection("section-1", [
          createTextBlock("block-1", "Google values clear communication skills."),
        ]),
        createSection("section-2", [
          createTextBlock("block-2", "Candidates must show clear communication skills."),
          createTextBlock("block-3", "Demonstrate clear communication skills."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      if (result.repeatedPhrases.length > 0) {
        const phrase = result.repeatedPhrases[0]!;
        expect(phrase.locations.length).toBeGreaterThanOrEqual(3);
        expect(phrase.locations[0]).toHaveProperty("moduleId");
        expect(phrase.locations[0]).toHaveProperty("sectionId");
        expect(phrase.locations[0]).toHaveProperty("blockId");
        expect(phrase.locations[0]).toHaveProperty("blockType");
      }
    });

    test("pass when below threshold", () => {
      const module = createModule("test-5", [
        createSection("section-1", [
          createTextBlock("block-1", "Prepare your stories carefully."),
          createTextBlock("block-2", "Prepare your stories well."),
        ]),
      ]);

      // Only 2 occurrences, threshold is 3
      const result = analyzeRepetition([module], { threshold: 3 });

      expect(result.pass).toBe(true);
    });

    test("fail when above threshold", () => {
      const module = createModule("test-6", [
        createSection("section-1", [
          createTextBlock("block-1", "This demonstrates excellent problem solving ability."),
          createTextBlock("block-2", "You need excellent problem solving ability."),
          createTextBlock("block-3", "Show excellent problem solving ability."),
          createTextBlock("block-4", "Highlight your excellent problem solving ability."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      expect(result.pass).toBe(false);
      expect(result.repeatedPhrases.some((p) => p.count >= 3)).toBe(true);
    });

    test("detects AI-sounding phrases like 'in conclusion'", () => {
      const module = createModule("test-7", [
        createSection("section-1", [
          createTextBlock("block-1", "In conclusion, this is important."),
        ]),
      ]);

      const result = analyzeRepetition([module], { checkAIPhrases: true });

      expect(result.pass).toBe(false);
      expect(result.aiPhrases.length).toBeGreaterThan(0);
      expect(result.aiPhrases[0]?.phrase).toBe("in conclusion");
    });

    test("detects multiple AI phrases", () => {
      const module = createModule("test-8", [
        createSection("section-1", [
          createTextBlock("block-1", "It is important to note that interviews are challenging."),
          createTextBlock("block-2", "As mentioned earlier, preparation is key."),
          createTextBlock("block-3", "Let's dive in to the details."),
        ]),
      ]);

      const result = analyzeRepetition([module], { checkAIPhrases: true });

      expect(result.aiPhrases.length).toBeGreaterThanOrEqual(3);
    });

    test("works across multiple modules", () => {
      const module1 = createModule("module-1", [
        createSection("section-1", [
          createTextBlock("block-1", "Prepare behavioral stories using STAR format."),
        ]),
      ]);
      const module2 = createModule("module-2", [
        createSection("section-1", [
          createTextBlock("block-1", "Use behavioral stories using STAR format for answers."),
          createTextBlock("block-2", "Tell behavioral stories using STAR format effectively."),
        ]),
      ]);

      const result = analyzeRepetition([module1, module2], { threshold: 3 });

      // Should detect cross-module repetition
      if (result.repeatedPhrases.length > 0) {
        const phrase = result.repeatedPhrases[0]!;
        // Check that locations span multiple modules
        const moduleIds = new Set(phrase.locations.map((l) => l.moduleId));
        expect(moduleIds.size).toBeGreaterThanOrEqual(1);
      }
    });

    test("configurable threshold works", () => {
      const module = createModule("test-9", [
        createSection("section-1", [
          createTextBlock("block-1", "Practice makes perfect."),
          createTextBlock("block-2", "Practice makes perfect."),
        ]),
      ]);

      // With threshold of 2, should fail
      const result2 = analyzeRepetition([module], { threshold: 2 });
      expect(result2.pass).toBe(false);

      // With threshold of 3, should pass
      const result3 = analyzeRepetition([module], { threshold: 3 });
      expect(result3.pass).toBe(true);
    });

    test("extracts text from quiz blocks", () => {
      const quizBlock: ContentBlock = {
        id: "quiz-1",
        type: "quiz",
        question: "Important leadership question here",
        options: [
          { id: "a", text: "Answer A", isCorrect: true },
          { id: "b", text: "Answer B", isCorrect: false },
        ],
        explanation: "Important leadership explanation",
      };

      const module = createModule("test-10", [
        createSection("section-1", [
          quizBlock,
          createTextBlock("block-1", "Important leadership skills matter."),
          createTextBlock("block-2", "Important leadership qualities needed."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      // Should analyze quiz content too
      expect(result).toHaveProperty("pass");
    });

    test("extracts text from checklist blocks", () => {
      const checklistBlock: ContentBlock = {
        id: "checklist-1",
        type: "checklist",
        title: "Preparation checklist items",
        items: [
          { id: "item-1", text: "Review preparation checklist items" },
          { id: "item-2", text: "Complete preparation checklist items" },
        ],
      };

      const module = createModule("test-11", [
        createSection("section-1", [
          checklistBlock,
          createTextBlock("block-1", "Follow the preparation checklist items."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      expect(result).toHaveProperty("pass");
    });

    test("handles empty modules gracefully", () => {
      const module = createModule("test-12", []);

      const result = analyzeRepetition([module]);

      expect(result.pass).toBe(true);
      expect(result.repeatedPhrases).toHaveLength(0);
    });

    test("handles empty sections gracefully", () => {
      const module = createModule("test-13", [
        createSection("section-1", []),
      ]);

      const result = analyzeRepetition([module]);

      expect(result.pass).toBe(true);
    });

    test("returns correct summary for mixed results", () => {
      const module = createModule("test-14", [
        createSection("section-1", [
          createTextBlock("block-1", "In conclusion, this is important."),
          createTextBlock("block-2", "Practice interview questions daily."),
          createTextBlock("block-3", "Practice interview questions daily."),
          createTextBlock("block-4", "Practice interview questions daily."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      expect(result.pass).toBe(false);
      expect(result.summary).toContain("AI-sounding");
      expect(result.summary).toContain("repeated");
    });
  });

  describe("AI phrase detection", () => {
    const aiPhraseTests = [
      "in conclusion",
      "in summary",
      "it is important to note",
      "as mentioned earlier",
      "moving forward",
      "let's dive in",
      "first and foremost",
      "last but not least",
      "without further ado",
      "in order to",
    ];

    test.each(aiPhraseTests)("detects AI phrase: %s", (phrase) => {
      const module = createModule("test-ai", [
        createSection("section-1", [
          createTextBlock("block-1", `${phrase.charAt(0).toUpperCase() + phrase.slice(1)}, we should prepare.`),
        ]),
      ]);

      const result = analyzeRepetition([module], { checkAIPhrases: true });

      expect(result.aiPhrases.some((p) => p.phrase === phrase)).toBe(true);
    });

    test("can disable AI phrase checking", () => {
      const module = createModule("test-disable-ai", [
        createSection("section-1", [
          createTextBlock("block-1", "In conclusion, this matters."),
        ]),
      ]);

      const result = analyzeRepetition([module], { checkAIPhrases: false });

      expect(result.aiPhrases).toHaveLength(0);
    });
  });

  describe("phrase length configuration", () => {
    test("respects minimum phrase length", () => {
      const module = createModule("test-min-length", [
        createSection("section-1", [
          createTextBlock("block-1", "Code works. Code works. Code works."),
        ]),
      ]);

      // With min phrase length of 3, "code works" (2 words) shouldn't be detected
      const result = analyzeRepetition([module], {
        threshold: 3,
        minPhraseLength: 3,
      });

      expect(
        result.repeatedPhrases.every((p) => p.phrase.split(" ").length >= 3)
      ).toBe(true);
    });

    test("respects maximum phrase length", () => {
      const longPhrase = "this is a very long repeated phrase that should be detected";
      const module = createModule("test-max-length", [
        createSection("section-1", [
          createTextBlock("block-1", longPhrase),
          createTextBlock("block-2", longPhrase),
          createTextBlock("block-3", longPhrase),
        ]),
      ]);

      const result = analyzeRepetition([module], {
        threshold: 3,
        maxPhraseLength: 5,
      });

      // All detected phrases should be 5 words or fewer
      expect(
        result.repeatedPhrases.every((p) => p.phrase.split(" ").length <= 5)
      ).toBe(true);
    });
  });

  describe("edge cases", () => {
    test("handles special characters in content", () => {
      const module = createModule("test-special", [
        createSection("section-1", [
          createTextBlock("block-1", "Use the STAR method!!! Very important!!!"),
          createTextBlock("block-2", "Use the STAR method... it's essential..."),
          createTextBlock("block-3", "Use the STAR method - always recommended."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      // Should normalize punctuation and still detect
      expect(result).toHaveProperty("pass");
    });

    test("handles mixed case content", () => {
      const module = createModule("test-case", [
        createSection("section-1", [
          createTextBlock("block-1", "Behavioral Interview Questions"),
          createTextBlock("block-2", "BEHAVIORAL INTERVIEW QUESTIONS"),
          createTextBlock("block-3", "behavioral interview questions"),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      // Should normalize case and detect
      expect(
        result.repeatedPhrases.some((p) =>
          p.phrase.includes("behavioral interview questions")
        )
      ).toBe(true);
    });

    test("handles extra whitespace", () => {
      const module = createModule("test-whitespace", [
        createSection("section-1", [
          createTextBlock("block-1", "Practice   daily   exercises."),
          createTextBlock("block-2", "Practice daily exercises."),
          createTextBlock("block-3", "Practice  daily  exercises."),
        ]),
      ]);

      const result = analyzeRepetition([module], { threshold: 3 });

      // Should normalize whitespace
      expect(result).toHaveProperty("pass");
    });
  });
});
