/**
 * Tests for flatten-modules.ts
 */

import {
  flattenToCarouselItems,
  getModuleBlockCount,
  getModuleItemCount,
  type FlattenResult,
} from "../flatten-modules";
import type { Module, ModuleSection, ContentBlock } from "@/types/module";

// Helper to create a test module
function createTestModule(
  slug: string,
  title: string,
  type: "universal" | "company" | "role" | "company-role",
  isPremium: boolean,
  sections: ModuleSection[]
): Module {
  return {
    id: slug,
    slug,
    type,
    title,
    description: `Test description for ${title}`,
    sections,
    isPremium,
    order: 0,
  };
}

// Helper to create a test section
function createTestSection(
  id: string,
  title: string,
  blocks: ContentBlock[]
): ModuleSection {
  return { id, title, blocks };
}

// Helper to create a text block
function createTextBlock(id: string, text: string): ContentBlock {
  return {
    id,
    type: "text",
    content: text,
  } as ContentBlock;
}

// Helper to create a quiz block
function createQuizBlock(id: string, question: string): ContentBlock {
  return {
    id,
    type: "quiz",
    question,
    options: [
      { id: "a", text: "Option A", isCorrect: true },
      { id: "b", text: "Option B", isCorrect: false },
    ],
    explanation: "Test explanation",
  } as ContentBlock;
}

// Helper to create a checklist block
function createChecklistBlock(id: string, title: string): ContentBlock {
  return {
    id,
    type: "checklist",
    title,
    items: [
      { id: "item1", text: "Item 1", required: true },
      { id: "item2", text: "Item 2", required: false },
    ],
  } as ContentBlock;
}

// Helper to create a tip block
function createTipBlock(id: string, text: string): ContentBlock {
  return {
    id,
    type: "tip",
    content: text,
  } as ContentBlock;
}

// Helper to create a warning block
function createWarningBlock(id: string, text: string): ContentBlock {
  return {
    id,
    type: "warning",
    content: text,
  } as ContentBlock;
}

describe("flattenToCarouselItems", () => {
  describe("basic flattening", () => {
    it("should flatten a single free module", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Text content 1"),
            createTextBlock("block2", "Text content 2"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items).toHaveLength(3); // 1 title + 2 blocks
      expect(result.paywallIndex).toBeNull();
      expect(result.totalItems).toBe(3);
    });

    it("should add module title at start of each module", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module Title",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Text content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[0]).toMatchObject({
        id: "universal-test-title",
        type: "content",
        moduleSlug: "universal-test",
        isPremium: false,
        sectionTitle: "Test Module Title",
        order: 0,
      });
      expect(result.items[0]?.content.type).toBe("header");
    });

    it("should set correct order for each item", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Text 1"),
            createTextBlock("block2", "Text 2"),
            createTextBlock("block3", "Text 3"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[0]?.order).toBe(0);
      expect(result.items[1]?.order).toBe(1);
      expect(result.items[2]?.order).toBe(2);
      expect(result.items[3]?.order).toBe(3);
    });

    it("should preserve section title on each item", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "First Section", [
            createTextBlock("block1", "Text 1"),
          ]),
          createTestSection("sec2", "Second Section", [
            createTextBlock("block2", "Text 2"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      // Title item gets module title as sectionTitle
      expect(result.items[0]?.sectionTitle).toBe("Test Module");
      // Blocks get their section title
      expect(result.items[1]?.sectionTitle).toBe("First Section");
      expect(result.items[2]?.sectionTitle).toBe("Second Section");
    });
  });

  describe("block type mapping", () => {
    it("should map quiz blocks to quiz carousel type", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createQuizBlock("quiz1", "What is the answer?"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[1]?.type).toBe("quiz");
    });

    it("should map checklist blocks to checklist carousel type", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createChecklistBlock("checklist1", "My Checklist"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[1]?.type).toBe("checklist");
    });

    it("should map text, tip, warning to content carousel type", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("text1", "Text"),
            createTipBlock("tip1", "Tip"),
            createWarningBlock("warning1", "Warning"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[1]?.type).toBe("content");
      expect(result.items[2]?.type).toBe("content");
      expect(result.items[3]?.type).toBe("content");
    });
  });

  describe("paywall insertion", () => {
    it("should insert paywall between free and premium modules", () => {
      const freeModule = createTestModule(
        "universal-test",
        "Free Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Free content"),
          ]),
        ]
      );

      const premiumModule = createTestModule(
        "company-google",
        "Premium Module",
        "company",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Premium content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([freeModule], [premiumModule]);

      expect(result.paywallIndex).toBe(2); // After title + 1 block
      expect(result.items[2]).toMatchObject({
        id: "paywall",
        type: "paywall",
        moduleSlug: "paywall",
        isPremium: false,
      });
    });

    it("should not insert paywall when no premium modules", () => {
      const freeModule = createTestModule(
        "universal-test",
        "Free Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Free content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([freeModule], []);

      expect(result.paywallIndex).toBeNull();
      expect(result.items.find((item) => item.type === "paywall")).toBeUndefined();
    });

    it("should insert paywall at correct position with multiple free modules", () => {
      const freeModule1 = createTestModule(
        "universal-1",
        "Free Module 1",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 1"),
            createTextBlock("block2", "Content 2"),
          ]),
        ]
      );

      const freeModule2 = createTestModule(
        "universal-2",
        "Free Module 2",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 3"),
          ]),
        ]
      );

      const premiumModule = createTestModule(
        "company-test",
        "Premium Module",
        "company",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Premium content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems(
        [freeModule1, freeModule2],
        [premiumModule]
      );

      // Free module 1: title + 2 blocks = 3 items
      // Free module 2: title + 1 block = 2 items
      // Total free items = 5, paywall at index 5
      expect(result.paywallIndex).toBe(5);
    });
  });

  describe("premium content handling", () => {
    it("should mark premium module items as premium", () => {
      const premiumModule = createTestModule(
        "company-google",
        "Premium Module",
        "company",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Premium content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([], [premiumModule]);

      // Skip paywall item (index 0), check title and block
      expect(result.items[1]?.isPremium).toBe(true);
      expect(result.items[2]?.isPremium).toBe(true);
    });

    it("should mark free module items as not premium", () => {
      const freeModule = createTestModule(
        "universal-test",
        "Free Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Free content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([freeModule], []);

      expect(result.items[0]?.isPremium).toBe(false);
      expect(result.items[1]?.isPremium).toBe(false);
    });
  });

  describe("multiple modules", () => {
    it("should flatten multiple modules in order", () => {
      const module1 = createTestModule(
        "universal-1",
        "Module 1",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 1"),
          ]),
        ]
      );

      const module2 = createTestModule(
        "company-google",
        "Module 2",
        "company",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 2"),
          ]),
        ]
      );

      const module3 = createTestModule(
        "role-swe",
        "Module 3",
        "role",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 3"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([module1], [module2, module3]);

      // Module 1: title + 1 block = 2 items
      // Paywall = 1 item
      // Module 2: title + 1 block = 2 items
      // Module 3: title + 1 block = 2 items
      // Total = 7 items
      expect(result.totalItems).toBe(7);

      // Check module order via moduleSlug
      expect(result.items[0]?.moduleSlug).toBe("universal-1");
      expect(result.items[1]?.moduleSlug).toBe("universal-1");
      expect(result.items[2]?.moduleSlug).toBe("paywall");
      expect(result.items[3]?.moduleSlug).toBe("company-google");
      expect(result.items[4]?.moduleSlug).toBe("company-google");
      expect(result.items[5]?.moduleSlug).toBe("role-swe");
      expect(result.items[6]?.moduleSlug).toBe("role-swe");
    });
  });

  describe("acceptance criteria: 3 modules with 10 blocks each → ~33 items", () => {
    it("should produce approximately 33 items for 3 modules with 10 blocks each", () => {
      // Create 3 modules, each with 10 blocks
      const freeModule = createTestModule(
        "universal-test",
        "Free Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 1"),
            createTextBlock("block2", "Content 2"),
            createTextBlock("block3", "Content 3"),
            createTextBlock("block4", "Content 4"),
            createTextBlock("block5", "Content 5"),
            createTextBlock("block6", "Content 6"),
            createTextBlock("block7", "Content 7"),
            createTextBlock("block8", "Content 8"),
            createTextBlock("block9", "Content 9"),
            createTextBlock("block10", "Content 10"),
          ]),
        ]
      );

      const premiumModule1 = createTestModule(
        "company-google",
        "Premium Module 1",
        "company",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 1"),
            createTextBlock("block2", "Content 2"),
            createTextBlock("block3", "Content 3"),
            createTextBlock("block4", "Content 4"),
            createTextBlock("block5", "Content 5"),
            createTextBlock("block6", "Content 6"),
            createTextBlock("block7", "Content 7"),
            createTextBlock("block8", "Content 8"),
            createTextBlock("block9", "Content 9"),
            createTextBlock("block10", "Content 10"),
          ]),
        ]
      );

      const premiumModule2 = createTestModule(
        "role-swe",
        "Premium Module 2",
        "role",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 1"),
            createTextBlock("block2", "Content 2"),
            createTextBlock("block3", "Content 3"),
            createTextBlock("block4", "Content 4"),
            createTextBlock("block5", "Content 5"),
            createTextBlock("block6", "Content 6"),
            createTextBlock("block7", "Content 7"),
            createTextBlock("block8", "Content 8"),
            createTextBlock("block9", "Content 9"),
            createTextBlock("block10", "Content 10"),
          ]),
        ]
      );

      const result = flattenToCarouselItems(
        [freeModule],
        [premiumModule1, premiumModule2]
      );

      // 3 modules × (1 title + 10 blocks) = 33 items + 1 paywall = 34 items
      expect(result.totalItems).toBe(34);
      expect(result.paywallIndex).toBe(11); // After free module (1 title + 10 blocks)
    });
  });

  describe("content normalization", () => {
    it("should handle blocks with content as object", () => {
      // This simulates how JSON modules store content
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            {
              id: "text1",
              type: "text",
              content: { text: "Nested text content" },
            } as unknown as ContentBlock,
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[1]?.content).toMatchObject({
        id: "text1",
        type: "text",
        content: "Nested text content",
      });
    });

    it("should handle quiz blocks with nested content", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            {
              id: "quiz1",
              type: "quiz",
              content: {
                question: "What is the answer?",
                options: [
                  { id: "a", text: "Option A", isCorrect: true },
                  { id: "b", text: "Option B", isCorrect: false },
                ],
                explanation: "Because A is correct",
              },
            } as unknown as ContentBlock,
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[1]?.type).toBe("quiz");
      expect(result.items[1]?.content).toMatchObject({
        id: "quiz1",
        type: "quiz",
        question: "What is the answer?",
        explanation: "Because A is correct",
      });
    });

    it("should handle checklist blocks with nested content", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            {
              id: "checklist1",
              type: "checklist",
              content: {
                title: "My Checklist",
                items: [
                  { id: "item1", text: "Item 1", required: true },
                  { id: "item2", text: "Item 2", required: false },
                ],
              },
            } as unknown as ContentBlock,
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[1]?.type).toBe("checklist");
      expect(result.items[1]?.content).toMatchObject({
        id: "checklist1",
        type: "checklist",
        title: "My Checklist",
      });
    });

    it("should handle tip and warning blocks with nested content", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            {
              id: "tip1",
              type: "tip",
              content: { text: "This is a tip" },
            } as unknown as ContentBlock,
            {
              id: "warning1",
              type: "warning",
              content: { text: "This is a warning" },
            } as unknown as ContentBlock,
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items[1]?.content).toMatchObject({
        id: "tip1",
        type: "tip",
        content: "This is a tip",
      });
      expect(result.items[2]?.content).toMatchObject({
        id: "warning1",
        type: "warning",
        content: "This is a warning",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty free modules array", () => {
      const premiumModule = createTestModule(
        "company-google",
        "Premium Module",
        "company",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([], [premiumModule]);

      expect(result.items).toHaveLength(3); // paywall + title + 1 block
      expect(result.paywallIndex).toBe(0);
    });

    it("should handle empty premium modules array", () => {
      const freeModule = createTestModule(
        "universal-test",
        "Free Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([freeModule], []);

      expect(result.paywallIndex).toBeNull();
    });

    it("should handle both arrays empty", () => {
      const result = flattenToCarouselItems([], []);

      expect(result.items).toHaveLength(0);
      expect(result.paywallIndex).toBeNull();
      expect(result.totalItems).toBe(0);
    });

    it("should handle module with empty sections", () => {
      const testMod = createTestModule(
        "universal-test",
        "Empty Module",
        "universal",
        false,
        []
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items).toHaveLength(1); // Only title
    });

    it("should handle section with empty blocks", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [createTestSection("sec1", "Empty Section", [])]
      );

      const result = flattenToCarouselItems([testMod], []);

      expect(result.items).toHaveLength(1); // Only title
    });

    it("should handle blocks without id", () => {
      const testMod = createTestModule(
        "universal-test",
        "Test Module",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            {
              type: "text",
              content: "Text without id",
            } as unknown as ContentBlock,
          ]),
        ]
      );

      const result = flattenToCarouselItems([testMod], []);

      // Should generate an id
      expect(result.items[1]?.id).toContain("universal-test");
    });
  });

  describe("unique item IDs", () => {
    it("should generate unique IDs for all items", () => {
      const module1 = createTestModule(
        "universal-1",
        "Module 1",
        "universal",
        false,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 1"),
            createTextBlock("block2", "Content 2"),
          ]),
        ]
      );

      const module2 = createTestModule(
        "company-google",
        "Module 2",
        "company",
        true,
        [
          createTestSection("sec1", "Section 1", [
            createTextBlock("block1", "Content 3"),
          ]),
        ]
      );

      const result = flattenToCarouselItems([module1], [module2]);

      const ids = result.items.map((item) => item.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

describe("getModuleBlockCount", () => {
  it("should return total block count across all sections", () => {
    const testMod = createTestModule(
      "universal-test",
      "Test Module",
      "universal",
      false,
      [
        createTestSection("sec1", "Section 1", [
          createTextBlock("block1", "Content 1"),
          createTextBlock("block2", "Content 2"),
        ]),
        createTestSection("sec2", "Section 2", [
          createTextBlock("block3", "Content 3"),
        ]),
      ]
    );

    expect(getModuleBlockCount(testMod)).toBe(3);
  });

  it("should return 0 for module with no sections", () => {
    const testMod = createTestModule(
      "universal-test",
      "Empty Module",
      "universal",
      false,
      []
    );

    expect(getModuleBlockCount(testMod)).toBe(0);
  });
});

describe("getModuleItemCount", () => {
  it("should return block count plus 1 for title", () => {
    const testMod = createTestModule(
      "universal-test",
      "Test Module",
      "universal",
      false,
      [
        createTestSection("sec1", "Section 1", [
          createTextBlock("block1", "Content 1"),
          createTextBlock("block2", "Content 2"),
        ]),
      ]
    );

    expect(getModuleItemCount(testMod)).toBe(3); // 2 blocks + 1 title
  });

  it("should return 1 for module with no blocks", () => {
    const testMod = createTestModule(
      "universal-test",
      "Empty Module",
      "universal",
      false,
      []
    );

    expect(getModuleItemCount(testMod)).toBe(1); // Just title
  });
});
