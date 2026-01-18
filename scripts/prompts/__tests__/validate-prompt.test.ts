/**
 * Tests for prompt output validation.
 */

import { validatePromptOutput } from "../../../src/lib/prompts/validation";

describe("validatePromptOutput", () => {
  describe("company-culture prompt", () => {
    const validCultureOutput = {
      section: {
        id: "culture-values",
        title: "Company Culture & Values",
        blocks: [
          {
            id: "culture-header",
            type: "header",
            content: "What Google Looks For",
            level: 2,
          },
          {
            id: "culture-text",
            type: "text",
            content: "Google evaluates candidates on four core attributes...",
          },
          {
            id: "culture-tip",
            type: "tip",
            content: "When answering behavioral questions, explicitly connect your examples.",
          },
        ],
      },
    };

    test("accepts valid culture output", () => {
      const result = validatePromptOutput(validCultureOutput, "company-culture");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects missing section id", () => {
      const invalid = {
        section: {
          title: "Culture",
          blocks: [
            { id: "h1", type: "header", content: "Test", level: 2 },
          ],
        },
      };
      const result = validatePromptOutput(invalid, "company-culture");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("id"))).toBe(true);
    });

    test("rejects empty blocks array", () => {
      const invalid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [],
        },
      };
      const result = validatePromptOutput(invalid, "company-culture");
      expect(result.valid).toBe(false);
    });

    test("rejects invalid block type", () => {
      const invalid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [
            { id: "b1", type: "invalid-type", content: "test" },
          ],
        },
      };
      const result = validatePromptOutput(invalid, "company-culture");
      expect(result.valid).toBe(false);
    });

    test("rejects duplicate IDs", () => {
      const invalid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [
            { id: "same-id", type: "header", content: "Header", level: 2 },
            { id: "same-id", type: "text", content: "Text" },
          ],
        },
      };
      const result = validatePromptOutput(invalid, "company-culture");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    test("warns on AI-sounding phrases", () => {
      const withAIPhrases = {
        section: {
          id: "culture-values",
          title: "Company Culture & Values",
          blocks: [
            {
              id: "culture-header",
              type: "header",
              content: "What Google Looks For",
              level: 2,
            },
            {
              id: "culture-text",
              type: "text",
              content: "In conclusion, Google values excellence. Furthermore, they prioritize teamwork.",
            },
          ],
        },
      };
      const result = validatePromptOutput(withAIPhrases, "company-culture");
      expect(result.valid).toBe(true); // Still valid, but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("AI-sounding phrases");
    });
  });

  describe("company-interview-stages prompt", () => {
    const validInterviewOutput = {
      section: {
        id: "interview-process",
        title: "Interview Process",
        blocks: [
          {
            id: "process-header",
            type: "header",
            content: "Google's Interview Process",
            level: 2,
          },
          {
            id: "process-text",
            type: "text",
            content: "The interview typically takes 4-6 weeks...",
          },
          {
            id: "process-tip",
            type: "tip",
            content: "Be prepared for multiple rounds.",
          },
          {
            id: "process-checklist",
            type: "checklist",
            title: "Pre-Interview Checklist",
            items: [
              { id: "item-1", text: "Research the company", required: true },
              { id: "item-2", text: "Prepare STAR stories", required: true },
            ],
          },
        ],
      },
    };

    test("accepts valid interview stages output", () => {
      const result = validatePromptOutput(validInterviewOutput, "company-interview-stages");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("validates checklist items have unique IDs", () => {
      const invalid = {
        section: {
          id: "interview-process",
          title: "Interview Process",
          blocks: [
            {
              id: "process-header",
              type: "header",
              content: "Process",
              level: 2,
            },
            {
              id: "checklist",
              type: "checklist",
              title: "Checklist",
              items: [
                { id: "same-id", text: "Item 1", required: true },
                { id: "same-id", text: "Item 2", required: true },
              ],
            },
          ],
        },
      };
      const result = validatePromptOutput(invalid, "company-interview-stages");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });
  });

  describe("company-tips prompt", () => {
    const validTipsOutput = {
      sections: [
        {
          id: "insider-tips",
          title: "Insider Tips",
          blocks: [
            {
              id: "tips-header",
              type: "header",
              content: "From Those Who've Been There",
              level: 2,
            },
            {
              id: "tips-text",
              type: "text",
              content: "Successful candidates share these traits...",
            },
            {
              id: "tips-advice",
              type: "tip",
              content: "Practice STAR format stories.",
            },
          ],
        },
        {
          id: "red-flags",
          title: "Red Flags & Deal Breakers",
          blocks: [
            {
              id: "flags-header",
              type: "header",
              content: "What Gets You Rejected",
              level: 2,
            },
            {
              id: "flags-text",
              type: "text",
              content: "Avoid these mistakes...",
            },
            {
              id: "flags-warning",
              type: "warning",
              content: "Never say 'I don't have an example'.",
            },
            {
              id: "flags-checklist",
              type: "checklist",
              title: "Red Flag Check",
              items: [
                { id: "check-1", text: "Stories use 'I' not 'We'", required: false },
              ],
            },
          ],
        },
      ],
    };

    test("accepts valid tips output with two sections", () => {
      const result = validatePromptOutput(validTipsOutput, "company-tips");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects if sections array length is not 2", () => {
      const invalid = {
        sections: [
          {
            id: "tips",
            title: "Tips",
            blocks: [
              { id: "h1", type: "header", content: "Tips", level: 2 },
            ],
          },
        ],
      };
      const result = validatePromptOutput(invalid, "company-tips");
      expect(result.valid).toBe(false);
    });
  });

  describe("company-trivia prompt", () => {
    const validTriviaOutput = {
      section: {
        id: "company-trivia",
        title: "Google Trivia",
        blocks: [
          {
            id: "trivia-header",
            type: "header",
            content: "Know Your Google Facts",
            level: 2,
          },
          {
            id: "trivia-facts",
            type: "text",
            content: "Quick facts about Google:\n- Founded: 1998\n- CEO: Sundar Pichai",
          },
          {
            id: "trivia-quiz-1",
            type: "quiz",
            question: "What year was Google founded?",
            options: [
              { id: "q1-a", text: "1998", isCorrect: true },
              { id: "q1-b", text: "1995", isCorrect: false },
              { id: "q1-c", text: "2000", isCorrect: false },
              { id: "q1-d", text: "2002", isCorrect: false },
            ],
            explanation: "Google was founded in 1998 by Larry Page and Sergey Brin.",
          },
        ],
      },
    };

    test("accepts valid trivia output", () => {
      const result = validatePromptOutput(validTriviaOutput, "company-trivia");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects quiz with no correct answer", () => {
      const invalid = {
        section: {
          id: "trivia",
          title: "Trivia",
          blocks: [
            {
              id: "trivia-header",
              type: "header",
              content: "Facts",
              level: 2,
            },
            {
              id: "quiz",
              type: "quiz",
              question: "When was it founded?",
              options: [
                { id: "a", text: "1998", isCorrect: false },
                { id: "b", text: "1999", isCorrect: false },
              ],
            },
          ],
        },
      };
      const result = validatePromptOutput(invalid, "company-trivia");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("correct answers"))).toBe(true);
    });

    test("rejects quiz with multiple correct answers", () => {
      const invalid = {
        section: {
          id: "trivia",
          title: "Trivia",
          blocks: [
            {
              id: "trivia-header",
              type: "header",
              content: "Facts",
              level: 2,
            },
            {
              id: "quiz",
              type: "quiz",
              question: "When was it founded?",
              options: [
                { id: "a", text: "1998", isCorrect: true },
                { id: "b", text: "1999", isCorrect: true },
              ],
            },
          ],
        },
      };
      const result = validatePromptOutput(invalid, "company-trivia");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("correct answers"))).toBe(true);
    });
  });

  describe("error handling", () => {
    test("rejects unknown prompt type", () => {
      const data = { section: { id: "test", title: "Test", blocks: [] } };
      const result = validatePromptOutput(data, "unknown-type" as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Unknown prompt type"))).toBe(true);
    });
  });

  describe("block types", () => {
    test("validates header block level must be 1, 2, or 3", () => {
      const invalid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [
            { id: "h1", type: "header", content: "Header", level: 5 },
          ],
        },
      };
      const result = validatePromptOutput(invalid, "company-culture");
      expect(result.valid).toBe(false);
    });

    test("accepts quote block with optional author", () => {
      const valid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [
            { id: "h1", type: "header", content: "Header", level: 2 },
            {
              id: "quote",
              type: "quote",
              content: "Great quote here",
              author: "CEO, Company",
            },
          ],
        },
      };
      const result = validatePromptOutput(valid, "company-culture");
      expect(result.valid).toBe(true);
    });

    test("accepts quote block without author", () => {
      const valid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [
            { id: "h1", type: "header", content: "Header", level: 2 },
            {
              id: "quote",
              type: "quote",
              content: "Great quote here",
            },
          ],
        },
      };
      const result = validatePromptOutput(valid, "company-culture");
      expect(result.valid).toBe(true);
    });

    test("validates warning block", () => {
      const valid = {
        sections: [
          {
            id: "tips",
            title: "Tips",
            blocks: [
              { id: "h1", type: "header", content: "Header", level: 2 },
              { id: "t1", type: "text", content: "Some text" },
              { id: "tip1", type: "tip", content: "A tip" },
            ],
          },
          {
            id: "flags",
            title: "Flags",
            blocks: [
              { id: "h2", type: "header", content: "Flags", level: 2 },
              { id: "t2", type: "text", content: "Some text" },
              { id: "w1", type: "warning", content: "A warning" },
              {
                id: "cl",
                type: "checklist",
                title: "Checks",
                items: [{ id: "c1", text: "Check 1", required: false }],
              },
            ],
          },
        ],
      };
      const result = validatePromptOutput(valid, "company-tips");
      expect(result.valid).toBe(true);
    });
  });

  describe("content quality", () => {
    test("warns on high word count", () => {
      // Create content with many words
      const longText = "word ".repeat(1500);
      const valid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [
            { id: "h1", type: "header", content: "Header", level: 2 },
            { id: "t1", type: "text", content: longText },
          ],
        },
      };
      const result = validatePromptOutput(valid, "company-culture");
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("word count"))).toBe(true);
    });

    test("detects multiple AI phrases", () => {
      const valid = {
        section: {
          id: "test",
          title: "Test",
          blocks: [
            { id: "h1", type: "header", content: "Let's dive in to this topic", level: 2 },
            { id: "t1", type: "text", content: "At the end of the day, it is important to note that success matters." },
          ],
        },
      };
      const result = validatePromptOutput(valid, "company-culture");
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
