/**
 * Tests for questions storage functions
 * Tests validation, CRUD operations, and edge cases
 */

import {
  isValidSlug,
  createQuestion,
  createQuestionsBatch,
  upsertQuestions,
  getQuestionById,
  getQuestions,
  getQuestionsForPosition,
  searchQuestions,
  getQuestionCounts,
  deleteQuestionsForPosition,
  createQuestionRun,
  completeQuestionRun,
  failQuestionRun,
  questionsExist,
} from "../storage";
import type { CreateQuestionInput, DbQuestion, DbQuestionRun } from "../types";

// ============================================================================
// Mock Supabase Client
// ============================================================================

interface MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  is: jest.Mock;
  overlaps: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  textSearch: jest.Mock;
}

function createMockQueryBuilder(): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    overlaps: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
    textSearch: jest.fn(),
  };

  // Chain all methods
  Object.values(builder).forEach((method) => {
    (method as jest.Mock).mockReturnValue(builder);
  });

  return builder;
}

function createMockSupabase() {
  const queryBuilder = createMockQueryBuilder();

  return {
    from: jest.fn(() => queryBuilder),
    queryBuilder,
  };
}

// ============================================================================
// Test Data
// ============================================================================

const sampleQuestionInput: CreateQuestionInput = {
  company_slug: "google",
  role_slug: "software-engineer",
  question_text: "Tell me about a time you led a project.",
  category: "behavioral",
  difficulty: "medium",
  interviewer_intent: "Testing leadership skills without formal authority...",
  good_answer_traits: ["Influence without authority", "Stakeholder management"],
  common_mistakes: ["Taking all credit", "Focusing on WHAT instead of HOW"],
  answer_framework: {
    structure: "STAR with leadership lens",
    key_elements: ["Why you stepped up", "How you built alignment"],
    time_allocation: "Situation: 15%, Action: 55%, Result: 20%",
  },
  tags: ["leadership", "influence"],
  original_id: "beh-leadership-001",
};

const sampleDbQuestion: DbQuestion = {
  id: "uuid-123",
  company_slug: "google",
  role_slug: "software-engineer",
  question_text: "Tell me about a time you led a project.",
  category: "behavioral",
  difficulty: "medium",
  interviewer_intent: "Testing leadership skills without formal authority...",
  good_answer_traits: ["Influence without authority", "Stakeholder management"],
  common_mistakes: ["Taking all credit", "Focusing on WHAT instead of HOW"],
  answer_framework: {
    structure: "STAR with leadership lens",
    key_elements: ["Why you stepped up", "How you built alignment"],
    time_allocation: "Situation: 15%, Action: 55%, Result: 20%",
  },
  tags: ["leadership", "influence"],
  question_type: null,
  target_value: null,
  is_premium: false,
  source: null,
  source_url: null,
  original_id: "beh-leadership-001",
  created_at: "2026-01-18T00:00:00Z",
  updated_at: "2026-01-18T00:00:00Z",
};

// ============================================================================
// Slug Validation Tests
// ============================================================================

describe("isValidSlug", () => {
  test("accepts lowercase single word", () => {
    expect(isValidSlug("google")).toBe(true);
    expect(isValidSlug("amazon")).toBe(true);
  });

  test("accepts hyphenated words", () => {
    expect(isValidSlug("software-engineer")).toBe(true);
    expect(isValidSlug("product-manager")).toBe(true);
    expect(isValidSlug("data-scientist")).toBe(true);
  });

  test("accepts numbers in slug", () => {
    expect(isValidSlug("web3")).toBe(true);
    expect(isValidSlug("level-10")).toBe(true);
  });

  test("rejects uppercase", () => {
    expect(isValidSlug("Google")).toBe(false);
    expect(isValidSlug("SOFTWARE-ENGINEER")).toBe(false);
  });

  test("rejects underscores", () => {
    expect(isValidSlug("software_engineer")).toBe(false);
  });

  test("rejects spaces", () => {
    expect(isValidSlug("software engineer")).toBe(false);
  });

  test("rejects special characters", () => {
    expect(isValidSlug("google!")).toBe(false);
    expect(isValidSlug("software@engineer")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  test("rejects leading/trailing hyphens", () => {
    expect(isValidSlug("-google")).toBe(false);
    expect(isValidSlug("google-")).toBe(false);
  });

  test("rejects double hyphens", () => {
    expect(isValidSlug("software--engineer")).toBe(false);
  });
});

// ============================================================================
// createQuestion Tests
// ============================================================================

describe("createQuestion", () => {
  test("creates question with valid input", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValue({ data: sampleDbQuestion, error: null });

    const result = await createQuestion(mock as unknown as Parameters<typeof createQuestion>[0], sampleQuestionInput);

    expect(result).toEqual(sampleDbQuestion);
    expect(mock.from).toHaveBeenCalledWith("questions");
    expect(mock.queryBuilder.insert).toHaveBeenCalled();
  });

  test("throws on invalid company_slug", async () => {
    const mock = createMockSupabase();
    const invalidInput = { ...sampleQuestionInput, company_slug: "Invalid_Slug" };

    await expect(
      createQuestion(mock as unknown as Parameters<typeof createQuestion>[0], invalidInput)
    ).rejects.toThrow("Invalid company_slug format");
  });

  test("throws on invalid role_slug", async () => {
    const mock = createMockSupabase();
    const invalidInput = { ...sampleQuestionInput, role_slug: "Software Engineer" };

    await expect(
      createQuestion(mock as unknown as Parameters<typeof createQuestion>[0], invalidInput)
    ).rejects.toThrow("Invalid role_slug format");
  });

  test("throws on database error", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    await expect(
      createQuestion(mock as unknown as Parameters<typeof createQuestion>[0], sampleQuestionInput)
    ).rejects.toThrow("Failed to create question");
  });

  test("handles optional fields correctly", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValue({ data: sampleDbQuestion, error: null });

    const inputWithOptional = {
      ...sampleQuestionInput,
      question_type: "estimation" as const,
      target_value: "Leadership",
      is_premium: true,
      source: "Glassdoor",
      source_url: "https://glassdoor.com/...",
    };

    await createQuestion(mock as unknown as Parameters<typeof createQuestion>[0], inputWithOptional);

    const insertCall = mock.queryBuilder.insert.mock.calls[0][0];
    expect(insertCall.question_type).toBe("estimation");
    expect(insertCall.target_value).toBe("Leadership");
    expect(insertCall.is_premium).toBe(true);
    expect(insertCall.source).toBe("Glassdoor");
  });
});

// ============================================================================
// createQuestionsBatch Tests
// ============================================================================

describe("createQuestionsBatch", () => {
  test("creates multiple questions", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.select.mockResolvedValue({ data: [sampleDbQuestion, sampleDbQuestion], error: null });

    const questions = [sampleQuestionInput, sampleQuestionInput];
    const result = await createQuestionsBatch(mock as unknown as Parameters<typeof createQuestionsBatch>[0], questions);

    expect(result).toHaveLength(2);
    expect(mock.queryBuilder.insert).toHaveBeenCalled();
  });

  test("returns empty array for empty input", async () => {
    const mock = createMockSupabase();

    const result = await createQuestionsBatch(mock as unknown as Parameters<typeof createQuestionsBatch>[0], []);

    expect(result).toEqual([]);
    expect(mock.from).not.toHaveBeenCalled();
  });

  test("validates all slugs before inserting", async () => {
    const mock = createMockSupabase();
    const questions = [
      sampleQuestionInput,
      { ...sampleQuestionInput, company_slug: "Invalid" },
    ];

    await expect(
      createQuestionsBatch(mock as unknown as Parameters<typeof createQuestionsBatch>[0], questions)
    ).rejects.toThrow("Invalid company_slug format");
  });
});

// ============================================================================
// upsertQuestions Tests
// ============================================================================

describe("upsertQuestions", () => {
  test("skips existing questions with same original_id", async () => {
    const mock = createMockSupabase();
    // First query returns existing question
    mock.queryBuilder.single.mockResolvedValueOnce({ data: { id: "existing" }, error: null });
    // Second question doesn't exist
    mock.queryBuilder.single.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });
    // Insert succeeds
    mock.queryBuilder.single.mockResolvedValueOnce({ data: sampleDbQuestion, error: null });

    const questions = [
      { ...sampleQuestionInput, original_id: "existing-001" },
      { ...sampleQuestionInput, original_id: "new-001" },
    ];

    const result = await upsertQuestions(mock as unknown as Parameters<typeof upsertQuestions>[0], questions);

    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(1);
  });

  test("skips questions with invalid slugs", async () => {
    const mock = createMockSupabase();

    const questions = [{ ...sampleQuestionInput, company_slug: "Invalid" }];

    const result = await upsertQuestions(mock as unknown as Parameters<typeof upsertQuestions>[0], questions);

    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(0);
  });

  test("returns zeros for empty input", async () => {
    const mock = createMockSupabase();

    const result = await upsertQuestions(mock as unknown as Parameters<typeof upsertQuestions>[0], []);

    expect(result).toEqual({ inserted: 0, skipped: 0 });
  });
});

// ============================================================================
// getQuestionById Tests
// ============================================================================

describe("getQuestionById", () => {
  test("returns question when found", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValue({ data: sampleDbQuestion, error: null });

    const result = await getQuestionById(mock as unknown as Parameters<typeof getQuestionById>[0], "uuid-123");

    expect(result).toEqual(sampleDbQuestion);
    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("id", "uuid-123");
  });

  test("returns null when not found", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const result = await getQuestionById(mock as unknown as Parameters<typeof getQuestionById>[0], "nonexistent");

    expect(result).toBeNull();
  });

  test("throws on other errors", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValue({ data: null, error: { message: "Error", code: "OTHER" } });

    await expect(
      getQuestionById(mock as unknown as Parameters<typeof getQuestionById>[0], "uuid-123")
    ).rejects.toThrow("Failed to get question");
  });
});

// ============================================================================
// getQuestions Tests
// ============================================================================

describe("getQuestions", () => {
  test("gets all questions without filters", async () => {
    const mock = createMockSupabase();
    // Make order always return the builder (for chaining)
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      // Last order call resolves the query
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [sampleDbQuestion], error: null });
      }
      return mock.queryBuilder;
    });

    const result = await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], {});

    expect(result).toEqual([sampleDbQuestion]);
  });

  test("filters by company_slug", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [], error: null });
      }
      return mock.queryBuilder;
    });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { company_slug: "google" });

    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("company_slug", "google");
  });

  test("filters by role_slug", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [], error: null });
      }
      return mock.queryBuilder;
    });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { role_slug: "software-engineer" });

    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("role_slug", "software-engineer");
  });

  test("filters by category", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [], error: null });
      }
      return mock.queryBuilder;
    });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { category: "behavioral" });

    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("category", "behavioral");
  });

  test("filters by difficulty", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [], error: null });
      }
      return mock.queryBuilder;
    });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { difficulty: "hard" });

    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("difficulty", "hard");
  });

  test("filters by tags with overlaps", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [], error: null });
      }
      return mock.queryBuilder;
    });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { tags: ["leadership", "conflict"] });

    expect(mock.queryBuilder.overlaps).toHaveBeenCalledWith("tags", ["leadership", "conflict"]);
  });

  test("filters by is_premium", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [], error: null });
      }
      return mock.queryBuilder;
    });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { is_premium: true });

    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("is_premium", true);
  });

  test("applies limit", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      return mock.queryBuilder;
    });
    mock.queryBuilder.limit.mockResolvedValue({ data: [], error: null });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { limit: 10 });

    expect(mock.queryBuilder.limit).toHaveBeenCalledWith(10);
  });

  test("applies pagination with offset", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.order.mockReturnValue(mock.queryBuilder);
    mock.queryBuilder.range.mockResolvedValue({ data: [], error: null });

    await getQuestions(mock as unknown as Parameters<typeof getQuestions>[0], { offset: 20, limit: 10 });

    expect(mock.queryBuilder.range).toHaveBeenCalledWith(20, 29);
  });
});

// ============================================================================
// getQuestionsForPosition Tests
// ============================================================================

describe("getQuestionsForPosition", () => {
  test("gets questions for specific company/role", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 3) {
        return Promise.resolve({ data: [sampleDbQuestion], error: null });
      }
      return mock.queryBuilder;
    });

    const result = await getQuestionsForPosition(
      mock as unknown as Parameters<typeof getQuestionsForPosition>[0],
      "google",
      "software-engineer"
    );

    expect(result).toEqual([sampleDbQuestion]);
    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("company_slug", "google");
    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("role_slug", "software-engineer");
  });
});

// ============================================================================
// searchQuestions Tests
// ============================================================================

describe("searchQuestions", () => {
  test("searches with full-text search", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.textSearch.mockReturnValue(mock.queryBuilder);
    mock.queryBuilder.limit.mockResolvedValue({ data: [sampleDbQuestion], error: null });

    const result = await searchQuestions(
      mock as unknown as Parameters<typeof searchQuestions>[0],
      "leadership",
      { limit: 10 }
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.rank).toBe(1);
    expect(mock.queryBuilder.textSearch).toHaveBeenCalledWith(
      "search_vector",
      "leadership",
      expect.any(Object)
    );
  });

  test("applies additional filters to search", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.textSearch.mockReturnValue(mock.queryBuilder);
    mock.queryBuilder.eq.mockReturnValue(mock.queryBuilder);
    mock.queryBuilder.limit.mockResolvedValue({ data: [], error: null });

    await searchQuestions(
      mock as unknown as Parameters<typeof searchQuestions>[0],
      "leadership",
      { company_slug: "google", category: "behavioral", limit: 10 }
    );

    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("company_slug", "google");
    expect(mock.queryBuilder.eq).toHaveBeenCalledWith("category", "behavioral");
  });
});

// ============================================================================
// getQuestionCounts Tests
// ============================================================================

describe("getQuestionCounts", () => {
  test("returns grouped counts", async () => {
    const mock = createMockSupabase();
    let orderCallCount = 0;
    mock.queryBuilder.order.mockImplementation(() => {
      orderCallCount++;
      if (orderCallCount === 2) {
        return Promise.resolve({
          data: [
            { company_slug: "google", role_slug: "software-engineer" },
            { company_slug: "google", role_slug: "software-engineer" },
            { company_slug: "amazon", role_slug: "product-manager" },
          ],
          error: null,
        });
      }
      return mock.queryBuilder;
    });

    const result = await getQuestionCounts(mock as unknown as Parameters<typeof getQuestionCounts>[0]);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ company_slug: "google", role_slug: "software-engineer", count: 2 });
    expect(result).toContainEqual({ company_slug: "amazon", role_slug: "product-manager", count: 1 });
  });
});

// ============================================================================
// deleteQuestionsForPosition Tests
// ============================================================================

describe("deleteQuestionsForPosition", () => {
  test("deletes questions and returns count", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.select.mockResolvedValue({
      data: [{ id: "1" }, { id: "2" }],
      error: null,
    });

    const count = await deleteQuestionsForPosition(
      mock as unknown as Parameters<typeof deleteQuestionsForPosition>[0],
      "google",
      "software-engineer"
    );

    expect(count).toBe(2);
    expect(mock.queryBuilder.delete).toHaveBeenCalled();
  });

  test("returns 0 when no questions deleted", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.select.mockResolvedValue({ data: [], error: null });

    const count = await deleteQuestionsForPosition(
      mock as unknown as Parameters<typeof deleteQuestionsForPosition>[0],
      "google",
      "software-engineer"
    );

    expect(count).toBe(0);
  });
});

// ============================================================================
// Question Run Tests
// ============================================================================

describe("createQuestionRun", () => {
  test("creates a new run", async () => {
    const mock = createMockSupabase();
    const mockRun: DbQuestionRun = {
      id: "run-123",
      company_slug: "google",
      role_slug: "software-engineer",
      questions_generated: 0,
      status: "started",
      error_message: null,
      started_at: "2026-01-18T00:00:00Z",
      completed_at: null,
      duration_ms: null,
    };
    mock.queryBuilder.single.mockResolvedValue({ data: mockRun, error: null });

    const result = await createQuestionRun(
      mock as unknown as Parameters<typeof createQuestionRun>[0],
      { company_slug: "google", role_slug: "software-engineer" }
    );

    expect(result.status).toBe("started");
    expect(mock.queryBuilder.insert).toHaveBeenCalled();
  });
});

describe("completeQuestionRun", () => {
  test("completes run with count", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValueOnce({
      data: { started_at: "2026-01-18T00:00:00Z" },
      error: null,
    });
    mock.queryBuilder.single.mockResolvedValueOnce({
      data: { id: "run-123", status: "completed", questions_generated: 25 },
      error: null,
    });

    const result = await completeQuestionRun(
      mock as unknown as Parameters<typeof completeQuestionRun>[0],
      "run-123",
      25
    );

    expect(result.questions_generated).toBe(25);
    expect(mock.queryBuilder.update).toHaveBeenCalled();
  });
});

describe("failQuestionRun", () => {
  test("marks run as failed", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.single.mockResolvedValue({
      data: { id: "run-123", status: "failed", error_message: "Test error" },
      error: null,
    });

    const result = await failQuestionRun(
      mock as unknown as Parameters<typeof failQuestionRun>[0],
      "run-123",
      "Test error"
    );

    expect(result.status).toBe("failed");
    expect(result.error_message).toBe("Test error");
  });
});

describe("questionsExist", () => {
  test("returns true when questions exist", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.limit.mockResolvedValue({ data: [{ id: "1" }], error: null });

    const exists = await questionsExist(
      mock as unknown as Parameters<typeof questionsExist>[0],
      "google",
      "software-engineer"
    );

    expect(exists).toBe(true);
  });

  test("returns false when no questions", async () => {
    const mock = createMockSupabase();
    mock.queryBuilder.limit.mockResolvedValue({ data: [], error: null });

    const exists = await questionsExist(
      mock as unknown as Parameters<typeof questionsExist>[0],
      "google",
      "software-engineer"
    );

    expect(exists).toBe(false);
  });
});
