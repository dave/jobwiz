/**
 * Tests for Supabase journey sync functionality
 */

import { loadFromSupabase, saveToSupabase } from "../supabase-sync";
import type { JourneyState } from "@/types";

// Mock the Supabase client
const mockGetUser = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockUpsert = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

describe("loadFromSupabase", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });
  });

  test("returns null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await loadFromSupabase("test-journey");

    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("returns null when no saved progress exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await loadFromSupabase("test-journey");

    expect(result).toBeNull();
  });

  test("returns null on Supabase error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

    const result = await loadFromSupabase("test-journey");

    expect(result).toBeNull();
  });

  test("loads and converts Supabase row to JourneyState", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });

    const supabaseRow = {
      id: "row-1",
      user_id: "user-123",
      journey_id: "test-journey",
      current_step_index: 2,
      completed_steps: ["step-1", "step-2"],
      answers: [
        { questionId: "q1", answer: "answer1", timestamp: 1000 },
      ],
      last_updated: "2026-01-17T10:00:00.000Z",
      created_at: "2026-01-17T09:00:00.000Z",
    };

    mockSingle.mockResolvedValue({ data: supabaseRow, error: null });

    const result = await loadFromSupabase("test-journey");

    expect(result).not.toBeNull();
    expect(result?.journeyId).toBe("test-journey");
    expect(result?.currentStepIndex).toBe(2);
    expect(result?.completedSteps).toEqual(["step-1", "step-2"]);
    expect(result?.answers).toEqual([
      { questionId: "q1", answer: "answer1", timestamp: 1000 },
    ]);
    expect(result?.lastUpdated).toBe(
      new Date("2026-01-17T10:00:00.000Z").getTime()
    );
  });

  test("queries with correct user_id and journey_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-456" } } });
    mockSingle.mockResolvedValue({ data: null, error: null });

    await loadFromSupabase("my-journey");

    expect(mockFrom).toHaveBeenCalledWith("journey_progress");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-456");
    expect(mockEq).toHaveBeenCalledWith("journey_id", "my-journey");
  });

  test("handles unexpected errors gracefully", async () => {
    mockGetUser.mockRejectedValue(new Error("Network error"));

    const result = await loadFromSupabase("test-journey");

    expect(result).toBeNull();
  });
});

describe("saveToSupabase", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });
  });

  const testState: JourneyState = {
    journeyId: "test-journey",
    currentStepIndex: 1,
    completedSteps: ["step-1"],
    answers: [{ questionId: "q1", answer: "a1", timestamp: 1000 }],
    lastUpdated: 1705500000000, // 2024-01-17T15:20:00.000Z
  };

  test("returns false when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await saveToSupabase(testState);

    expect(result).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("upserts data correctly when user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-789" } } });
    mockUpsert.mockResolvedValue({ error: null });

    const result = await saveToSupabase(testState);

    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("journey_progress");
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: "user-789",
        journey_id: "test-journey",
        current_step_index: 1,
        completed_steps: ["step-1"],
        answers: [{ questionId: "q1", answer: "a1", timestamp: 1000 }],
        last_updated: expect.any(String), // ISO date string
      },
      {
        onConflict: "user_id,journey_id",
      }
    );
  });

  test("returns false on Supabase error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-789" } } });
    mockUpsert.mockResolvedValue({ error: { message: "Upsert failed" } });

    const result = await saveToSupabase(testState);

    expect(result).toBe(false);
  });

  test("handles unexpected errors gracefully", async () => {
    mockGetUser.mockRejectedValue(new Error("Network error"));

    const result = await saveToSupabase(testState);

    expect(result).toBe(false);
  });
});
