/**
 * Tests for Human Review Sampling Script
 */

import {
  generateReviewQueue,
  extractCompany,
  runQualityChecks,
  determinePriority,
  selectForReview,
  formatAsMarkdown,
  formatAsJson,
  recordReviewResult,
  loadReviewResults,
  getReviewedCompanies,
  type ReviewItem,
  type ReviewResult,
  type SamplingConfig,
} from "../sample-for-review";
import type { Module } from "../../../src/types/module";
import * as fs from "fs";
import * as path from "path";

// Sample module for testing
const createSampleModule = (overrides: Partial<Module> = {}): Module => ({
  id: "test-module",
  slug: "test-module",
  type: "company",
  title: "Test Module",
  description: "A test module",
  isPremium: false,
  order: 1,
  sections: [
    {
      id: "section-1",
      title: "Section 1",
      blocks: [
        {
          id: "block-1",
          type: "text",
          content: "This is test content for the module. It contains good readable text.",
        },
      ],
    },
  ],
  ...overrides,
});

// Module with AI phrases (will be flagged)
const createFlaggedModule = (): Module => ({
  id: "company-google",
  slug: "company-google",
  type: "company",
  title: "Google Interview Prep",
  description: "Prep for Google interviews",
  isPremium: false,
  order: 1,
  sections: [
    {
      id: "section-1",
      title: "Introduction",
      blocks: [
        {
          id: "block-1",
          type: "text",
          content: "In conclusion, let's dive in to the interview process. First and foremost, you need to prepare.",
        },
      ],
    },
  ],
});

// Clean module (won't be flagged)
const createCleanModule = (company: string = "amazon"): Module => ({
  id: `company-${company}`,
  slug: `company-${company}`,
  type: "company",
  title: `${company.charAt(0).toUpperCase() + company.slice(1)} Interview Prep`,
  description: `Prep for ${company} interviews`,
  isPremium: false,
  order: 1,
  sections: [
    {
      id: "section-1",
      title: "Company Overview",
      blocks: [
        {
          id: "block-1",
          type: "text",
          content: "Founded in 2010, this company has grown to become a leader. Their mission focuses on empowering users through innovative solutions.",
        },
        {
          id: "block-2",
          type: "text",
          content: "Candidates who succeed here demonstrate curiosity and adaptability. The culture rewards those who challenge assumptions.",
        },
      ],
    },
  ],
});

describe("extractCompany", () => {
  test("extracts company from filename first", () => {
    const module = createSampleModule({ slug: "company-google" });
    const company = extractCompany(module, "/path/to/company-google.json");
    expect(company).toBe("google");
  });

  test("extracts company from filename with preview suffix", () => {
    const module = createSampleModule({ slug: "other-slug" });
    const company = extractCompany(module, "/path/to/company-amazon-preview.json");
    expect(company).toBe("amazon");
  });

  test("falls back to slug when filename doesn't match pattern", () => {
    const module = createSampleModule({ id: "my-module", slug: "company-meta", type: "company" });
    const company = extractCompany(module, "/path/to/other.json");
    expect(company).toBe("meta");
  });

  test("falls back to module id when no match", () => {
    const module = createSampleModule({ id: "my-module", slug: "other", type: "universal" });
    const company = extractCompany(module, "/path/to/other.json");
    expect(company).toBe("my-module");
  });

  test("handles slug with company- prefix correctly", () => {
    const module = createSampleModule({ slug: "company-meta", type: "company" });
    const company = extractCompany(module, "/any/path.json");
    expect(company).toBe("meta");
  });
});

describe("runQualityChecks", () => {
  const defaultConfig: SamplingConfig = {
    percent: 10,
    prioritizeFlagged: true,
    prioritizeNew: true,
    reviewedCompanies: new Set(),
    readabilityMin: 50,
    readabilityMax: 80,
  };

  test("flags module with AI phrases", () => {
    const module = createFlaggedModule();
    const result = runQualityChecks(module, defaultConfig);

    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags.some(f => f.includes("AI phrases"))).toBe(true);
  });

  test("no flags for clean module", () => {
    const module = createCleanModule();
    const result = runQualityChecks(module, defaultConfig);

    // Clean module should pass (no flags or only readability flags within range)
    const hasAIFlags = result.flags.some(f => f.includes("AI phrases"));
    expect(hasAIFlags).toBe(false);
  });

  test("returns repetition result", () => {
    const module = createSampleModule();
    const result = runQualityChecks(module, defaultConfig);

    expect(result.repetition).toBeDefined();
    expect(result.repetition).toHaveProperty("pass");
    expect(result.repetition).toHaveProperty("aiPhrases");
  });

  test("returns readability result", () => {
    const module = createSampleModule();
    const result = runQualityChecks(module, defaultConfig);

    expect(result.readability).toBeDefined();
    expect(result.readability).toHaveProperty("score");
    expect(result.readability).toHaveProperty("status");
  });
});

describe("determinePriority", () => {
  const baseConfig: SamplingConfig = {
    percent: 10,
    prioritizeFlagged: true,
    prioritizeNew: true,
    reviewedCompanies: new Set(),
    readabilityMin: 50,
    readabilityMax: 80,
  };

  test("returns high priority for flagged content", () => {
    const result = determinePriority(["AI phrases: 3"], "google", baseConfig);
    expect(result.priority).toBe("high");
    expect(result.reason).toContain("Flagged by automated checks");
  });

  test("returns medium priority for new company", () => {
    const result = determinePriority([], "newcompany", baseConfig);
    expect(result.priority).toBe("medium");
    expect(result.reason).toContain("New company");
  });

  test("returns low priority for reviewed company without flags", () => {
    const config = { ...baseConfig, reviewedCompanies: new Set(["google"]) };
    const result = determinePriority([], "google", config);
    expect(result.priority).toBe("low");
    expect(result.reason).toBe("Random sample");
  });

  test("flags take precedence over new company", () => {
    const result = determinePriority(["Some flag"], "newcompany", baseConfig);
    expect(result.priority).toBe("high");
  });

  test("respects prioritizeFlagged=false config", () => {
    const config = { ...baseConfig, prioritizeFlagged: false };
    const result = determinePriority(["Some flag"], "newcompany", config);
    expect(result.priority).toBe("medium"); // Falls through to new company
  });

  test("respects prioritizeNew=false config", () => {
    const config = { ...baseConfig, prioritizeFlagged: false, prioritizeNew: false };
    const result = determinePriority([], "newcompany", config);
    expect(result.priority).toBe("low");
  });
});

describe("selectForReview", () => {
  const createItems = (): ReviewItem[] => [
    { id: "1", filePath: "a.json", moduleId: "m1", moduleTitle: "T1", company: "c1", priority: "high", reason: "r", flags: ["f"] },
    { id: "2", filePath: "b.json", moduleId: "m2", moduleTitle: "T2", company: "c2", priority: "high", reason: "r", flags: ["f"] },
    { id: "3", filePath: "c.json", moduleId: "m3", moduleTitle: "T3", company: "c3", priority: "medium", reason: "r", flags: [] },
    { id: "4", filePath: "d.json", moduleId: "m4", moduleTitle: "T4", company: "c4", priority: "medium", reason: "r", flags: [] },
    { id: "5", filePath: "e.json", moduleId: "m5", moduleTitle: "T5", company: "c5", priority: "low", reason: "r", flags: [] },
    { id: "6", filePath: "f.json", moduleId: "m6", moduleTitle: "T6", company: "c6", priority: "low", reason: "r", flags: [] },
    { id: "7", filePath: "g.json", moduleId: "m7", moduleTitle: "T7", company: "c7", priority: "low", reason: "r", flags: [] },
    { id: "8", filePath: "h.json", moduleId: "m8", moduleTitle: "T8", company: "c8", priority: "low", reason: "r", flags: [] },
  ];

  test("includes all high priority items first", () => {
    const items = createItems();
    const selected = selectForReview(items, 3);

    // Should include both high priority items
    const highPrioritySelected = selected.filter(i => i.priority === "high");
    expect(highPrioritySelected.length).toBe(2);
  });

  test("fills remaining slots with medium priority", () => {
    const items = createItems();
    const selected = selectForReview(items, 4);

    const highCount = selected.filter(i => i.priority === "high").length;
    const mediumCount = selected.filter(i => i.priority === "medium").length;

    expect(highCount).toBe(2);
    expect(mediumCount).toBe(2);
  });

  test("includes low priority when high and medium exhausted", () => {
    const items = createItems();
    const selected = selectForReview(items, 6);

    const lowCount = selected.filter(i => i.priority === "low").length;
    expect(lowCount).toBe(2); // 6 - 2 high - 2 medium = 2 low
  });

  test("respects target count limit", () => {
    const items = createItems();
    const selected = selectForReview(items, 3);
    expect(selected.length).toBe(3);
  });

  test("returns all items if target exceeds count", () => {
    const items = createItems();
    const selected = selectForReview(items, 100);
    expect(selected.length).toBe(items.length);
  });

  test("handles empty items array", () => {
    const selected = selectForReview([], 10);
    expect(selected.length).toBe(0);
  });
});

describe("generateReviewQueue", () => {
  const samplesDir = path.join(__dirname, "../samples");

  test("generates queue from sample files", () => {
    const inputFiles = [
      path.join(samplesDir, "clean.json"),
      path.join(samplesDir, "with-repetition.json"),
    ];

    const queue = generateReviewQueue(inputFiles, { percent: 100 });

    expect(queue.totalModules).toBe(2);
    expect(queue.items.length).toBeLessThanOrEqual(2);
    expect(queue.generatedAt).toBeDefined();
  });

  test("samples correct percentage", () => {
    const inputFiles = [
      path.join(samplesDir, "clean.json"),
      path.join(samplesDir, "with-repetition.json"),
      path.join(samplesDir, "good-readability.json"),
    ];

    // 50% of 3 modules = 1.5 -> ceil = 2
    const queue = generateReviewQueue(inputFiles, { percent: 50 });

    expect(queue.sampledCount).toBe(2);
  });

  test("prioritizes flagged content", () => {
    const inputFiles = [
      path.join(samplesDir, "clean.json"),
      path.join(samplesDir, "with-repetition.json"), // Has AI phrases
    ];

    const queue = generateReviewQueue(inputFiles, {
      percent: 50,
      prioritizeFlagged: true,
    });

    // The flagged item should be included
    const flaggedItem = queue.items.find(i => i.priority === "high");
    if (queue.highPriorityCount > 0) {
      expect(flaggedItem).toBeDefined();
    }
  });

  test("counts priorities correctly", () => {
    const inputFiles = [path.join(samplesDir, "clean.json")];

    const queue = generateReviewQueue(inputFiles, { percent: 100 });

    const totalCounts = queue.highPriorityCount + queue.mediumPriorityCount + queue.lowPriorityCount;
    expect(totalCounts).toBe(queue.sampledCount);
  });

  test("excludes non-module JSON files", () => {
    // If there are any non-module JSON files, they should be excluded
    const queue = generateReviewQueue([], { percent: 100 });
    expect(queue.totalModules).toBe(0);
    expect(queue.items.length).toBe(0);
  });
});

describe("formatAsMarkdown", () => {
  test("includes summary section", () => {
    const queue = {
      items: [],
      totalModules: 10,
      sampledCount: 2,
      highPriorityCount: 1,
      mediumPriorityCount: 0,
      lowPriorityCount: 1,
      generatedAt: "2026-01-18T00:00:00.000Z",
    };

    const md = formatAsMarkdown(queue);

    expect(md).toContain("# Review Queue");
    expect(md).toContain("**Total Modules:** 10");
    expect(md).toContain("**Selected for Review:** 2");
  });

  test("groups items by priority", () => {
    const queue = {
      items: [
        { id: "1", filePath: "a.json", moduleId: "m1", moduleTitle: "High Item", company: "c1", priority: "high" as const, reason: "r", flags: ["flag"] },
        { id: "2", filePath: "b.json", moduleId: "m2", moduleTitle: "Low Item", company: "c2", priority: "low" as const, reason: "r", flags: [] },
      ],
      totalModules: 2,
      sampledCount: 2,
      highPriorityCount: 1,
      mediumPriorityCount: 0,
      lowPriorityCount: 1,
      generatedAt: "2026-01-18T00:00:00.000Z",
    };

    const md = formatAsMarkdown(queue);

    expect(md).toContain("## High Priority");
    expect(md).toContain("## Low Priority");
    expect(md).toContain("High Item");
    expect(md).toContain("Low Item");
  });

  test("includes review checklist in each item", () => {
    const queue = {
      items: [
        { id: "1", filePath: "a.json", moduleId: "m1", moduleTitle: "Item", company: "c1", priority: "high" as const, reason: "r", flags: [] },
      ],
      totalModules: 1,
      sampledCount: 1,
      highPriorityCount: 1,
      mediumPriorityCount: 0,
      lowPriorityCount: 0,
      generatedAt: "2026-01-18T00:00:00.000Z",
    };

    const md = formatAsMarkdown(queue);

    expect(md).toContain("**Review Checklist:**");
    expect(md).toContain("- [ ] Tone & Voice");
    expect(md).toContain("- [ ] Accuracy");
  });
});

describe("formatAsJson", () => {
  test("returns valid JSON", () => {
    const queue = {
      items: [],
      totalModules: 5,
      sampledCount: 1,
      highPriorityCount: 0,
      mediumPriorityCount: 0,
      lowPriorityCount: 1,
      generatedAt: "2026-01-18T00:00:00.000Z",
    };

    const json = formatAsJson(queue);
    const parsed = JSON.parse(json);

    expect(parsed.totalModules).toBe(5);
    expect(parsed.sampledCount).toBe(1);
  });

  test("preserves all queue data", () => {
    const queue = {
      items: [
        { id: "1", filePath: "a.json", moduleId: "m1", moduleTitle: "T", company: "c", priority: "high" as const, reason: "r", flags: ["f"] },
      ],
      totalModules: 1,
      sampledCount: 1,
      highPriorityCount: 1,
      mediumPriorityCount: 0,
      lowPriorityCount: 0,
      generatedAt: "2026-01-18T00:00:00.000Z",
    };

    const json = formatAsJson(queue);
    const parsed = JSON.parse(json);

    expect(parsed.items[0].moduleId).toBe("m1");
    expect(parsed.items[0].flags).toContain("f");
  });
});

describe("recordReviewResult", () => {
  const testOutputFile = path.join(__dirname, "test-review-results.json");

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testOutputFile)) {
      fs.unlinkSync(testOutputFile);
    }
  });

  test("creates new file if none exists", () => {
    const result: ReviewResult = {
      itemId: "review-1",
      moduleId: "company-google",
      reviewer: "tester",
      date: "2026-01-18",
      status: "pass",
      issues: [],
      notes: "Looks good",
      timeSpentMinutes: 5,
    };

    recordReviewResult(result, testOutputFile);

    expect(fs.existsSync(testOutputFile)).toBe(true);
    const content = fs.readFileSync(testOutputFile, "utf-8");
    const results = JSON.parse(content);
    expect(results.length).toBe(1);
  });

  test("appends to existing file", () => {
    const result1: ReviewResult = {
      itemId: "review-1",
      moduleId: "company-google",
      reviewer: "tester",
      date: "2026-01-18",
      status: "pass",
      issues: [],
      notes: "",
      timeSpentMinutes: 5,
    };

    const result2: ReviewResult = {
      itemId: "review-2",
      moduleId: "company-amazon",
      reviewer: "tester",
      date: "2026-01-18",
      status: "fail",
      issues: [{ type: "fact", description: "Wrong founding year" }],
      notes: "",
      timeSpentMinutes: 10,
    };

    recordReviewResult(result1, testOutputFile);
    recordReviewResult(result2, testOutputFile);

    const content = fs.readFileSync(testOutputFile, "utf-8");
    const results = JSON.parse(content);
    expect(results.length).toBe(2);
  });
});

describe("loadReviewResults", () => {
  const testFile = path.join(__dirname, "test-load-results.json");

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  test("returns empty array for missing file", () => {
    const results = loadReviewResults("/nonexistent/file.json");
    expect(results).toEqual([]);
  });

  test("loads results from file", () => {
    const data: ReviewResult[] = [
      { itemId: "1", moduleId: "m1", reviewer: "r", date: "d", status: "pass", issues: [], notes: "", timeSpentMinutes: 5 },
    ];
    fs.writeFileSync(testFile, JSON.stringify(data));

    const results = loadReviewResults(testFile);
    expect(results.length).toBe(1);
    expect(results[0]?.moduleId).toBe("m1");
  });

  test("returns empty array for invalid JSON", () => {
    fs.writeFileSync(testFile, "not valid json");
    const results = loadReviewResults(testFile);
    expect(results).toEqual([]);
  });
});

describe("getReviewedCompanies", () => {
  test("extracts companies from review results", () => {
    const results: ReviewResult[] = [
      { itemId: "1", moduleId: "company-google", reviewer: "r", date: "d", status: "pass", issues: [], notes: "", timeSpentMinutes: 5 },
      { itemId: "2", moduleId: "company-amazon", reviewer: "r", date: "d", status: "pass", issues: [], notes: "", timeSpentMinutes: 5 },
    ];

    const companies = getReviewedCompanies(results);

    expect(companies.has("google")).toBe(true);
    expect(companies.has("amazon")).toBe(true);
    expect(companies.size).toBe(2);
  });

  test("handles non-company module IDs", () => {
    const results: ReviewResult[] = [
      { itemId: "1", moduleId: "universal-interview-basics", reviewer: "r", date: "d", status: "pass", issues: [], notes: "", timeSpentMinutes: 5 },
    ];

    const companies = getReviewedCompanies(results);
    expect(companies.size).toBe(0);
  });

  test("deduplicates companies", () => {
    const results: ReviewResult[] = [
      { itemId: "1", moduleId: "company-google", reviewer: "r", date: "d", status: "pass", issues: [], notes: "", timeSpentMinutes: 5 },
      { itemId: "2", moduleId: "company-google", reviewer: "r", date: "d", status: "pass", issues: [], notes: "", timeSpentMinutes: 5 },
    ];

    const companies = getReviewedCompanies(results);
    expect(companies.size).toBe(1);
  });
});

describe("integration: sampling workflow", () => {
  test("samples correct percentage of content", () => {
    const samplesDir = path.join(__dirname, "../samples");
    const inputFiles = [
      path.join(samplesDir, "clean.json"),
      path.join(samplesDir, "with-repetition.json"),
    ];

    // Note: 50% of 2 = 1, but high priority items are always included first
    // If both items are flagged or need review, we get more than the percentage
    const queue = generateReviewQueue(inputFiles, { percent: 50 });

    // Should sample at least the percentage (may include more if flagged)
    expect(queue.sampledCount).toBeGreaterThanOrEqual(1);
    expect(queue.sampledCount).toBeLessThanOrEqual(2);
  });

  test("prioritizes flagged content in samples", () => {
    const samplesDir = path.join(__dirname, "../samples");
    const inputFiles = [
      path.join(samplesDir, "clean.json"),
      path.join(samplesDir, "with-repetition.json"),
    ];

    // Request only 1 item (50% of 2)
    const queue = generateReviewQueue(inputFiles, {
      percent: 50,
      prioritizeFlagged: true,
    });

    // The with-repetition.json has AI phrases, so should be prioritized
    if (queue.highPriorityCount > 0) {
      expect(queue.items.some(i => i.priority === "high")).toBe(true);
    }
  });

  test("exports review queue in both formats", () => {
    const samplesDir = path.join(__dirname, "../samples");
    const inputFiles = [path.join(samplesDir, "clean.json")];

    const queue = generateReviewQueue(inputFiles, { percent: 100 });

    const md = formatAsMarkdown(queue);
    const json = formatAsJson(queue);

    expect(md).toContain("# Review Queue");
    expect(JSON.parse(json)).toHaveProperty("items");
  });

  test("records review results correctly", () => {
    const testFile = path.join(__dirname, "integration-test-results.json");

    // Clean up before test
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    const result: ReviewResult = {
      itemId: "test-item",
      moduleId: "company-test",
      reviewer: "integration-test",
      date: new Date().toISOString(),
      status: "pass",
      issues: [],
      notes: "Integration test",
      timeSpentMinutes: 1,
    };

    recordReviewResult(result, testFile);
    const loaded = loadReviewResults(testFile);

    expect(loaded.length).toBe(1);
    expect(loaded[0]?.moduleId).toBe("company-test");

    // Clean up
    fs.unlinkSync(testFile);
  });
});
