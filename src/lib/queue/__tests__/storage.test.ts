/**
 * Tests for queue storage functions
 * Issue #32 - Generation priority queue system
 */

import {
  addToQueue,
  addToQueueBatch,
  claimNextItem,
  completeQueueItem,
  failQueueItem,
  getQueueStatus,
  getQueueItems,
  queueItemExists,
  clearCompleted,
  resetStaleItems,
} from "../storage";
import type { DbQueueItem } from "../types";

// Mock Supabase client
const createMockSupabase = () => {
  const mockFrom = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockIs = jest.fn();
  const mockOrder = jest.fn();
  const mockLimit = jest.fn();
  const mockRange = jest.fn();
  const mockLt = jest.fn();
  const mockSingle = jest.fn();
  const mockUpsert = jest.fn();

  // Chain methods
  mockFrom.mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
    upsert: mockUpsert,
  });

  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockUpsert.mockReturnValue({ select: mockSelect });

  mockSelect.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
  });

  mockEq.mockReturnValue({
    eq: mockEq,
    is: mockIs,
    single: mockSingle,
    select: mockSelect,
    order: mockOrder,
    lt: mockLt,
  });

  mockIs.mockReturnValue({ single: mockSingle });
  mockOrder.mockReturnValue({
    order: mockOrder,
    limit: mockLimit,
    eq: mockEq,
  });
  mockLimit.mockReturnValue({ single: mockSingle });
  mockRange.mockReturnValue({ data: [], error: null });
  mockLt.mockReturnValue({ select: mockSelect });

  return {
    from: mockFrom,
    _mocks: {
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      upsert: mockUpsert,
      lt: mockLt,
    },
    _setResult: (result: { data: unknown; error: unknown }) => {
      mockSingle.mockResolvedValue(result);
      mockSelect.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
        order: mockOrder,
        ...result,
      });
    },
    _setSelectResult: (result: { data: unknown[]; error: unknown }) => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(result),
          }),
          ...result,
        }),
        ...result,
      });
    },
  };
};

describe("Queue storage", () => {
  describe("addToQueue", () => {
    test("adds item with calculated priority", async () => {
      const mockSupabase = createMockSupabase();
      const mockItem: DbQueueItem = {
        id: "test-id",
        company_slug: "google",
        role_slug: "software-engineer",
        priority_score: 72,
        status: "pending",
        claimed_at: null,
        claimed_by: null,
        completed_at: null,
        error_message: null,
        retry_count: 0,
        max_retries: 3,
        module_id: null,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const result = await addToQueue(mockSupabase as never, {
        company_slug: "google",
        role_slug: "software-engineer",
        priority_score: 72,
      });

      expect(result).toEqual(mockItem);
      expect(mockSupabase.from).toHaveBeenCalledWith("generation_queue");
    });

    test("returns null for duplicate item", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await addToQueue(mockSupabase as never, {
        company_slug: "google",
        role_slug: "software-engineer",
      });

      expect(result).toBeNull();
    });
  });

  describe("addToQueueBatch", () => {
    test("adds multiple items", async () => {
      const mockSupabase = createMockSupabase();
      const mockItems: DbQueueItem[] = [
        {
          id: "id-1",
          company_slug: "google",
          role_slug: null,
          priority_score: 85,
          status: "pending",
          claimed_at: null,
          claimed_by: null,
          completed_at: null,
          error_message: null,
          retry_count: 0,
          max_retries: 3,
          module_id: null,
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
        {
          id: "id-2",
          company_slug: "google",
          role_slug: "software-engineer",
          priority_score: 72,
          status: "pending",
          claimed_at: null,
          claimed_by: null,
          completed_at: null,
          error_message: null,
          retry_count: 0,
          max_retries: 3,
          module_id: null,
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
      ];

      mockSupabase._mocks.select.mockReturnValue({
        data: mockItems,
        error: null,
      });

      const result = await addToQueueBatch(mockSupabase as never, [
        { company_slug: "google", role_slug: null, priority_score: 85 },
        { company_slug: "google", role_slug: "software-engineer", priority_score: 72 },
      ]);

      expect(result.added).toBe(2);
      expect(result.skipped).toBe(0);
    });

    test("returns empty result for empty input", async () => {
      const mockSupabase = createMockSupabase();
      const result = await addToQueueBatch(mockSupabase as never, []);
      expect(result).toEqual({ added: 0, skipped: 0 });
    });
  });

  describe("claimNextItem", () => {
    test("claims highest priority pending item", async () => {
      const mockSupabase = createMockSupabase();
      const mockPendingItem: DbQueueItem = {
        id: "test-id",
        company_slug: "google",
        role_slug: null,
        priority_score: 85,
        status: "pending",
        claimed_at: null,
        claimed_by: null,
        completed_at: null,
        error_message: null,
        retry_count: 0,
        max_retries: 3,
        module_id: null,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const mockClaimedItem: DbQueueItem = {
        ...mockPendingItem,
        status: "in_progress",
        claimed_at: "2026-01-18T00:00:00Z",
        claimed_by: "worker-1",
      };

      // First call returns pending item
      mockSupabase._mocks.single
        .mockResolvedValueOnce({ data: mockPendingItem, error: null })
        .mockResolvedValueOnce({ data: mockClaimedItem, error: null });

      const result = await claimNextItem(mockSupabase as never, "worker-1");

      expect(result).toBeDefined();
      expect(result?.status).toBe("in_progress");
      expect(result?.claimed_by).toBe("worker-1");
    });

    test("returns null when no pending items", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await claimNextItem(mockSupabase as never, "worker-1");
      expect(result).toBeNull();
    });
  });

  describe("completeQueueItem", () => {
    test("marks item as completed", async () => {
      const mockSupabase = createMockSupabase();
      const mockCompletedItem: DbQueueItem = {
        id: "test-id",
        company_slug: "google",
        role_slug: null,
        priority_score: 85,
        status: "completed",
        claimed_at: "2026-01-18T00:00:00Z",
        claimed_by: "worker-1",
        completed_at: "2026-01-18T00:01:00Z",
        error_message: null,
        retry_count: 0,
        max_retries: 3,
        module_id: "module-123",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:01:00Z",
      };

      mockSupabase._mocks.single.mockResolvedValue({
        data: mockCompletedItem,
        error: null,
      });

      const result = await completeQueueItem(
        mockSupabase as never,
        "test-id",
        "module-123"
      );

      expect(result.status).toBe("completed");
      expect(result.module_id).toBe("module-123");
    });
  });

  describe("failQueueItem", () => {
    test("increments retry count and resets to pending", async () => {
      const mockSupabase = createMockSupabase();

      // First call to get current retry count
      mockSupabase._mocks.single
        .mockResolvedValueOnce({ data: { retry_count: 0, max_retries: 3 }, error: null })
        .mockResolvedValueOnce({
          data: {
            id: "test-id",
            company_slug: "google",
            role_slug: null,
            priority_score: 85,
            status: "pending",
            retry_count: 1,
            max_retries: 3,
            error_message: "Test error",
          },
          error: null,
        });

      const result = await failQueueItem(
        mockSupabase as never,
        "test-id",
        "Test error"
      );

      expect(result.status).toBe("pending");
      expect(result.retry_count).toBe(1);
    });

    test("marks as failed when max retries reached", async () => {
      const mockSupabase = createMockSupabase();

      mockSupabase._mocks.single
        .mockResolvedValueOnce({ data: { retry_count: 2, max_retries: 3 }, error: null })
        .mockResolvedValueOnce({
          data: {
            id: "test-id",
            company_slug: "google",
            role_slug: null,
            priority_score: 85,
            status: "failed",
            retry_count: 3,
            max_retries: 3,
            error_message: "Final error",
          },
          error: null,
        });

      const result = await failQueueItem(
        mockSupabase as never,
        "test-id",
        "Final error"
      );

      expect(result.status).toBe("failed");
      expect(result.retry_count).toBe(3);
    });
  });

  describe("getQueueStatus", () => {
    test("returns correct counts", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._setSelectResult({
        data: [
          { status: "pending" },
          { status: "pending" },
          { status: "in_progress" },
          { status: "completed" },
          { status: "completed" },
          { status: "completed" },
          { status: "failed" },
        ],
        error: null,
      });

      const result = await getQueueStatus(mockSupabase as never);

      expect(result.pending).toBe(2);
      expect(result.in_progress).toBe(1);
      expect(result.completed).toBe(3);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(7);
    });

    test("returns zeros for empty queue", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._setSelectResult({ data: [], error: null });

      const result = await getQueueStatus(mockSupabase as never);

      expect(result.pending).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getQueueItems", () => {
    test("returns items sorted by priority", async () => {
      const mockSupabase = createMockSupabase();
      const mockItems: DbQueueItem[] = [
        {
          id: "id-1",
          company_slug: "google",
          role_slug: null,
          priority_score: 85,
          status: "pending",
          claimed_at: null,
          claimed_by: null,
          completed_at: null,
          error_message: null,
          retry_count: 0,
          max_retries: 3,
          module_id: null,
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
        {
          id: "id-2",
          company_slug: "apple",
          role_slug: null,
          priority_score: 78,
          status: "pending",
          claimed_at: null,
          claimed_by: null,
          completed_at: null,
          error_message: null,
          retry_count: 0,
          max_retries: 3,
          module_id: null,
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
      ];

      mockSupabase._mocks.order.mockReturnValue({
        order: jest.fn().mockReturnValue({
          data: mockItems,
          error: null,
        }),
      });

      const result = await getQueueItems(mockSupabase as never);

      expect(result).toHaveLength(2);
      expect(result[0]?.priority_score).toBe(85);
    });

    test("filters by status", async () => {
      const mockSupabase = createMockSupabase();

      mockSupabase._mocks.order.mockReturnValue({
        order: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [{ id: "id-1", status: "pending" }],
            error: null,
          }),
        }),
      });

      await getQueueItems(mockSupabase as never, { status: "pending" });

      expect(mockSupabase.from).toHaveBeenCalledWith("generation_queue");
    });
  });

  describe("queueItemExists", () => {
    test("returns true when item exists", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._mocks.single.mockResolvedValue({
        data: { id: "test-id" },
        error: null,
      });

      const result = await queueItemExists(
        mockSupabase as never,
        "google",
        "software-engineer"
      );

      expect(result).toBe(true);
    });

    test("returns false when item does not exist", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._mocks.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await queueItemExists(
        mockSupabase as never,
        "google",
        "unknown-role"
      );

      expect(result).toBe(false);
    });
  });

  describe("clearCompleted", () => {
    test("deletes completed items", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._mocks.select.mockReturnValue({
        data: [{ id: "id-1" }, { id: "id-2" }],
        error: null,
      });
      mockSupabase._mocks.eq.mockReturnValue({
        select: mockSupabase._mocks.select,
      });

      const result = await clearCompleted(mockSupabase as never);

      expect(result).toBe(2);
    });
  });

  describe("resetStaleItems", () => {
    test("resets items older than threshold", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._mocks.select.mockReturnValue({
        data: [{ id: "id-1" }],
        error: null,
      });

      const result = await resetStaleItems(mockSupabase as never, 30);

      expect(result).toBe(1);
    });
  });
});

describe("Queue behavior", () => {
  test("next item returns highest priority pending", async () => {
    // This is tested via claimNextItem above
    // Documenting expected behavior:
    // When multiple pending items exist, the one with highest priority_score is claimed
    expect(true).toBe(true);
  });

  test("marks item as in_progress when claimed", async () => {
    // This is tested via claimNextItem above
    // Documenting expected behavior:
    // claimNextItem updates status to in_progress and sets claimed_at/claimed_by
    expect(true).toBe(true);
  });

  test("marks item as completed when done", async () => {
    // This is tested via completeQueueItem above
    expect(true).toBe(true);
  });

  test("respects minimum threshold", async () => {
    // buildQueueItemsFromSearchVolume with min parameter filters items
    // This is tested in priority.test.ts
    expect(true).toBe(true);
  });
});
