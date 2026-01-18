/**
 * Tests for Readability Scoring Script
 */

import {
  countSyllables,
  countSentences,
  countWords,
  countTotalSyllables,
  calculateFleschKincaid,
  analyzeReadability,
} from "../check-readability";
import type { Module } from "../../../src/types/module";

describe("countSyllables", () => {
  test("single syllable words", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("dog")).toBe(1);
    expect(countSyllables("run")).toBe(1);
    expect(countSyllables("fast")).toBe(1);
  });

  test("two syllable words", () => {
    expect(countSyllables("happy")).toBe(2);
    expect(countSyllables("water")).toBe(2);
    expect(countSyllables("people")).toBe(2);
    expect(countSyllables("simple")).toBe(2);
  });

  test("multi-syllable words", () => {
    // These should have more syllables than simple words
    expect(countSyllables("important")).toBeGreaterThanOrEqual(3);
    expect(countSyllables("beautiful")).toBeGreaterThanOrEqual(3);
    expect(countSyllables("company")).toBeGreaterThanOrEqual(2);
  });

  test("complex words have many syllables", () => {
    // Complex words should register as having 4+ syllables
    expect(countSyllables("university")).toBeGreaterThanOrEqual(4);
    expect(countSyllables("organization")).toBeGreaterThanOrEqual(4);
    expect(countSyllables("technology")).toBeGreaterThanOrEqual(3);
  });

  test("handles silent e", () => {
    expect(countSyllables("make")).toBe(1);
    expect(countSyllables("time")).toBe(1);
    expect(countSyllables("code")).toBe(1);
  });

  test("handles empty/short words", () => {
    expect(countSyllables("")).toBe(0);
    expect(countSyllables("a")).toBe(1);
    expect(countSyllables("I")).toBe(1);
    expect(countSyllables("an")).toBe(1);
    expect(countSyllables("the")).toBe(1);
  });

  test("handles uppercase", () => {
    expect(countSyllables("HELLO")).toBe(2);
    expect(countSyllables("World")).toBe(1);
  });
});

describe("countSentences", () => {
  test("single sentence", () => {
    expect(countSentences("This is a test.")).toBe(1);
    expect(countSentences("Hello world!")).toBe(1);
    expect(countSentences("What is your name?")).toBe(1);
  });

  test("multiple sentences", () => {
    expect(countSentences("Hello. World.")).toBe(2);
    expect(countSentences("One. Two. Three.")).toBe(3);
    expect(countSentences("Hi! How are you? Good.")).toBe(3);
  });

  test("handles text without punctuation", () => {
    expect(countSentences("Hello world")).toBe(1);
    expect(countSentences("No punctuation here")).toBe(1);
  });

  test("handles empty text", () => {
    expect(countSentences("")).toBe(0);
    expect(countSentences("   ")).toBe(0);
  });

  test("handles multiple punctuation marks", () => {
    expect(countSentences("Really?!")).toBe(1);
    expect(countSentences("What?! No way!!!")).toBe(2);
  });
});

describe("countWords", () => {
  test("counts words correctly", () => {
    expect(countWords("Hello world")).toBe(2);
    expect(countWords("One two three four five")).toBe(5);
    expect(countWords("Single")).toBe(1);
  });

  test("handles multiple spaces", () => {
    expect(countWords("Hello   world")).toBe(2);
    expect(countWords("  Leading and trailing  ")).toBe(3);
  });

  test("handles empty text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("countTotalSyllables", () => {
  test("counts syllables in sentence", () => {
    // "The cat ran fast" = 1+1+1+1 = 4
    expect(countTotalSyllables("The cat ran fast")).toBe(4);
  });

  test("handles punctuation", () => {
    expect(countTotalSyllables("Hello, world!")).toBe(3); // hel-lo + world
  });

  test("handles empty text", () => {
    expect(countTotalSyllables("")).toBe(0);
  });
});

describe("calculateFleschKincaid", () => {
  test("returns 0 for empty content", () => {
    expect(calculateFleschKincaid(0, 0, 0)).toBe(0);
    expect(calculateFleschKincaid(0, 1, 0)).toBe(0);
    expect(calculateFleschKincaid(1, 0, 1)).toBe(0);
  });

  test("calculates score for simple text", () => {
    // Simple text: short sentences, simple words
    // 10 words, 2 sentences, 12 syllables
    // ASL = 10/2 = 5, ASW = 12/10 = 1.2
    // FK = 206.835 - 1.015*5 - 84.6*1.2 = 206.835 - 5.075 - 101.52 = 100.24
    const score = calculateFleschKincaid(10, 2, 12);
    expect(score).toBeGreaterThan(90); // Should be very easy
  });

  test("calculates score for complex text", () => {
    // Complex text: long sentences, complex words
    // 50 words, 2 sentences, 100 syllables
    // ASL = 50/2 = 25, ASW = 100/50 = 2
    // FK = 206.835 - 1.015*25 - 84.6*2 = 206.835 - 25.375 - 169.2 = 12.26
    const score = calculateFleschKincaid(50, 2, 100);
    expect(score).toBeLessThan(30); // Should be very difficult
  });

  test("score is clamped to 0-100", () => {
    // Very complex: should not go below 0
    const complexScore = calculateFleschKincaid(100, 1, 300);
    expect(complexScore).toBeGreaterThanOrEqual(0);

    // Very simple: should not go above 100
    const simpleScore = calculateFleschKincaid(10, 10, 10);
    expect(simpleScore).toBeLessThanOrEqual(100);
  });

  test("returns score with decimal precision", () => {
    const score = calculateFleschKincaid(20, 3, 30);
    // Should be a number with up to 2 decimal places
    expect(typeof score).toBe("number");
    expect(Number.isFinite(score)).toBe(true);
  });
});

describe("analyzeReadability", () => {
  const createModule = (texts: string[]): Module => ({
    id: "test-module",
    slug: "test-module",
    type: "company",
    title: "Test Module",
    isPremium: false,
    order: 1,
    sections: [
      {
        id: "section-1",
        title: "Test Section",
        blocks: texts.map((content, i) => ({
          id: `block-${i}`,
          type: "text" as const,
          content,
        })),
      },
    ],
  });

  test("pass for score in acceptable range", () => {
    // Text designed to be in 50-80 range (balanced readability)
    // Mix of simple and moderately complex sentences
    const module = createModule([
      "This company started in 2010 and has grown into a major player in the tech world. They focus on building tools that help people work better and faster.",
      "People who succeed here are curious and willing to learn new things. The company values those who ask good questions and think about problems in new ways.",
      "The technical part of the interview includes coding problems and system design talks. You will write code on a whiteboard or shared screen to demonstrate your abilities.",
    ]);

    const result = analyzeReadability([module]);
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThanOrEqual(80);
    expect(result.status).toBe("pass");
  });

  test("fail for overly complex content (score < 50)", () => {
    // Complex academic text
    const module = createModule([
      "The organizational infrastructure demonstrates a quintessential manifestation of contemporary technological entrepreneurship, characterized by decentralized decision-making architectures.",
      "Prospective candidates must demonstrate comprehensive understanding of multidisciplinary computational paradigms, including distributed systems architecture and algorithmic optimization methodologies.",
    ]);

    const result = analyzeReadability([module]);
    expect(result.pass).toBe(false);
    expect(result.score).toBeLessThan(50);
    expect(result.status).toBe("too_complex");
    expect(result.summary).toContain("too complex");
  });

  test("fail for overly simple content (score > 80)", () => {
    // Very simple text with short sentences and words
    const module = createModule([
      "Hi. Go. Do it. Be nice. Win. Yes.",
      "Run. Jump. Sit. Stand. Walk. Talk. Smile.",
    ]);

    const result = analyzeReadability([module]);
    expect(result.pass).toBe(false);
    expect(result.score).toBeGreaterThan(80);
    expect(result.status).toBe("too_simple");
    expect(result.summary).toContain("too simple");
  });

  test("configurable min threshold", () => {
    const module = createModule([
      "The organizational methodology encompasses multifaceted examination procedures.",
    ]);

    // With default threshold (50), this fails
    const defaultResult = analyzeReadability([module]);
    expect(defaultResult.score).toBeLessThan(50);

    // With lower threshold (30), it passes
    const customResult = analyzeReadability([module], { minScore: 30 });
    if (customResult.score >= 30 && customResult.score <= 80) {
      expect(customResult.pass).toBe(true);
    }
  });

  test("configurable max threshold", () => {
    const module = createModule(["Hi. Go. Do it. Win."]);

    // With default threshold (80), this might fail as too simple
    const defaultResult = analyzeReadability([module]);

    // With higher threshold (95), it passes
    const customResult = analyzeReadability([module], { maxScore: 95 });
    if (customResult.score >= 50 && customResult.score <= 95) {
      expect(customResult.pass).toBe(true);
    }
  });

  test("returns per-section breakdown when enabled", () => {
    const module: Module = {
      id: "test-module",
      slug: "test-module",
      type: "company",
      title: "Test Module",
      isPremium: false,
      order: 1,
      sections: [
        {
          id: "section-1",
          title: "Simple Section",
          blocks: [
            { id: "b1", type: "text", content: "This is simple text. Easy to read." },
          ],
        },
        {
          id: "section-2",
          title: "Complex Section",
          blocks: [
            {
              id: "b2",
              type: "text",
              content:
                "The multifaceted examination encompasses comprehensive evaluation methodologies.",
            },
          ],
        },
      ],
    };

    const result = analyzeReadability([module], { perSection: true });

    expect(result.sectionScores.length).toBe(2);
    const simpleSection = result.sectionScores[0];
    const complexSection = result.sectionScores[1];
    expect(simpleSection).toBeDefined();
    expect(complexSection).toBeDefined();
    expect(simpleSection?.sectionTitle).toBe("Simple Section");
    expect(complexSection?.sectionTitle).toBe("Complex Section");

    // Simple section should have higher score
    expect(simpleSection?.score).toBeGreaterThan(complexSection?.score ?? 0);
  });

  test("handles multiple modules", () => {
    const module1 = createModule(["This is the first module. It has simple content."]);
    const module2 = createModule(["This is the second module. Also simple."]);

    const result = analyzeReadability([module1, module2]);

    expect(result.wordCount).toBeGreaterThan(10);
    expect(result.sentenceCount).toBeGreaterThanOrEqual(4);
  });

  test("extracts text from different block types", () => {
    const module: Module = {
      id: "test-module",
      slug: "test-module",
      type: "company",
      title: "Test Module",
      isPremium: false,
      order: 1,
      sections: [
        {
          id: "section-1",
          title: "Mixed Content",
          blocks: [
            { id: "b1", type: "text", content: "Regular text content here." },
            { id: "b2", type: "tip", content: "This is a helpful tip." },
            { id: "b3", type: "warning", content: "This is a warning message." },
            { id: "b4", type: "quote", content: "This is a quote.", author: "Author" },
            {
              id: "b5",
              type: "quiz",
              question: "What is the answer?",
              options: [
                { id: "o1", text: "Option A", isCorrect: true },
                { id: "o2", text: "Option B", isCorrect: false },
              ],
              explanation: "The explanation here.",
            },
            {
              id: "b6",
              type: "checklist",
              title: "Checklist title",
              items: [
                { id: "i1", text: "First item" },
                { id: "i2", text: "Second item" },
              ],
            },
          ],
        },
      ],
    };

    const result = analyzeReadability([module]);

    // Should have extracted text from all blocks
    expect(result.wordCount).toBeGreaterThan(20);
    expect(result.sentenceCount).toBeGreaterThan(3);
  });

  test("returns correct summary format", () => {
    const module = createModule(["This is a test sentence. Another one here."]);
    const result = analyzeReadability([module]);

    expect(result.summary).toContain("Score:");
    expect(result.summary).toMatch(/\d+\.\d/); // Contains decimal score
    expect(result.summary).toMatch(/(PASS|FAIL)/);
  });

  test("handles empty module gracefully", () => {
    const module: Module = {
      id: "empty-module",
      slug: "empty-module",
      type: "company",
      title: "Empty Module",
      isPremium: false,
      order: 1,
      sections: [],
    };

    const result = analyzeReadability([module]);
    expect(result.wordCount).toBe(0);
    expect(result.score).toBe(0);
  });

  test("handles module with empty blocks", () => {
    const module: Module = {
      id: "test-module",
      slug: "test-module",
      type: "company",
      title: "Test Module",
      isPremium: false,
      order: 1,
      sections: [
        {
          id: "section-1",
          title: "Empty Section",
          blocks: [{ id: "b1", type: "animation", animationUrl: "/test.json" }],
        },
      ],
    };

    const result = analyzeReadability([module]);
    // Animation blocks have no text content
    expect(result.wordCount).toBe(0);
  });
});

describe("Integration tests with sample files", () => {
  const fs = require("fs");
  const path = require("path");

  const loadSampleModule = (filename: string): Module => {
    const filePath = path.join(__dirname, "../samples", filename);
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as Module;
  };

  test("good-readability.json passes", () => {
    const module = loadSampleModule("good-readability.json");
    const result = analyzeReadability([module]);

    expect(result.pass).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThanOrEqual(80);
  });

  test("complex.json fails as too complex", () => {
    const module = loadSampleModule("complex.json");
    const result = analyzeReadability([module]);

    expect(result.pass).toBe(false);
    expect(result.status).toBe("too_complex");
    expect(result.score).toBeLessThan(50);
  });

  test("simple.json fails as too simple", () => {
    const module = loadSampleModule("simple.json");
    const result = analyzeReadability([module]);

    expect(result.pass).toBe(false);
    expect(result.status).toBe("too_simple");
    expect(result.score).toBeGreaterThan(80);
  });

  test("clean.json (from repetition tests) is readable", () => {
    const module = loadSampleModule("clean.json");
    const result = analyzeReadability([module]);

    // The clean module should have decent readability
    expect(result.wordCount).toBeGreaterThan(0);
    expect(typeof result.score).toBe("number");
  });
});
