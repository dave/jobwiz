/**
 * Tests for Variant Assignments Storage Module
 * Issue: #42 - Variant assignment + storage
 */

import {
  transformAssignmentRow,
  getAssignment,
  getAssignmentByName,
  getUserAssignments,
  createAssignment,
  upsertAssignment,
  deleteAssignment,
  getVariantForUser,
  forceAssignVariant,
  syncLocalAssignment,
  getExperimentStats,
} from "../assignments";
import type { VariantAssignmentRow, CreateVariantAssignmentInput } from "../types";

// Mock bucketing module
jest.mock("../bucketing", () => ({
  getBucket: jest.fn().mockReturnValue(25),
}));

// Mock Supabase client
const createMockSupabase = () => {
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockUpsert = jest.fn();
  const mockFrom = jest.fn();

  const mockChain = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    upsert: mockUpsert,
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
  };

  mockFrom.mockReturnValue(mockChain);
  mockSelect.mockReturnValue(mockChain);
  mockInsert.mockReturnValue(mockChain);
  mockUpdate.mockReturnValue(mockChain);
  mockDelete.mockReturnValue(mockChain);
  mockUpsert.mockReturnValue(mockChain);

  return {
    from: mockFrom,
    _chain: mockChain,
  };
};

describe("Variant Assignments Storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("transformAssignmentRow", () => {
    it("transforms snake_case to camelCase", () => {
      const row: VariantAssignmentRow = {
        id: "assign-123",
        user_id: "user-456",
        experiment_id: "exp-789",
        experiment_name: "paywall_test",
        variant: "direct_paywall",
        bucket: 25,
        source: "calculated",
        assigned_at: "2026-01-18T00:00:00Z",
      };

      const result = transformAssignmentRow(row);

      expect(result).toEqual({
        id: "assign-123",
        userId: "user-456",
        experimentId: "exp-789",
        experimentName: "paywall_test",
        variant: "direct_paywall",
        bucket: 25,
        source: "calculated",
        assignedAt: "2026-01-18T00:00:00Z",
      });
    });
  });

  describe("getAssignment", () => {
    it("returns assignment when found", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "assign-123",
          user_id: "user-456",
          experiment_id: "exp-789",
          experiment_name: "test",
          variant: "control",
          bucket: 50,
          source: "calculated",
          assigned_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const result = await getAssignment(
        mockSupabase as any,
        "user-456",
        "exp-789"
      );

      expect(result).not.toBeNull();
      expect(result?.variant).toBe("control");
      expect(mockSupabase.from).toHaveBeenCalledWith("variant_assignments");
    });

    it("returns null when not found", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      const result = await getAssignment(
        mockSupabase as any,
        "user-456",
        "exp-789"
      );
      expect(result).toBeNull();
    });
  });

  describe("getAssignmentByName", () => {
    it("returns assignment by experiment name", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "assign-123",
          user_id: "user-456",
          experiment_id: "exp-789",
          experiment_name: "paywall_test",
          variant: "freemium",
          bucket: 30,
          source: "calculated",
          assigned_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const result = await getAssignmentByName(
        mockSupabase as any,
        "user-456",
        "paywall_test"
      );

      expect(result?.variant).toBe("freemium");
      expect(result?.experimentName).toBe("paywall_test");
    });
  });

  describe("getUserAssignments", () => {
    it("returns all assignments for user", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.order.mockResolvedValue({
        data: [
          {
            id: "1",
            user_id: "user-456",
            experiment_id: "exp-1",
            experiment_name: "exp1",
            variant: "a",
            bucket: 10,
            source: "calculated",
            assigned_at: "2026-01-18T00:00:00Z",
          },
          {
            id: "2",
            user_id: "user-456",
            experiment_id: "exp-2",
            experiment_name: "exp2",
            variant: "b",
            bucket: 50,
            source: "calculated",
            assigned_at: "2026-01-18T01:00:00Z",
          },
        ],
        error: null,
      });

      const result = await getUserAssignments(mockSupabase as any, "user-456");
      expect(result).toHaveLength(2);
      expect(result[0]?.variant).toBe("a");
      expect(result[1]?.variant).toBe("b");
    });
  });

  describe("createAssignment", () => {
    it("creates new assignment", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "new-assign",
          user_id: "user-456",
          experiment_id: "exp-789",
          experiment_name: "test",
          variant: "control",
          bucket: 25,
          source: "calculated",
          assigned_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const input: CreateVariantAssignmentInput = {
        userId: "user-456",
        experimentId: "exp-789",
        experimentName: "test",
        variant: "control",
        bucket: 25,
      };

      const result = await createAssignment(mockSupabase as any, input);

      expect(result.variant).toBe("control");
      expect(result.bucket).toBe(25);
      expect(result.source).toBe("calculated");
    });

    it("handles duplicate assignment gracefully", async () => {
      const mockSupabase = createMockSupabase();

      // First call: insert fails with duplicate
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: "23505", message: "Unique violation" },
        })
        // Second call: fetch existing
        .mockResolvedValueOnce({
          data: {
            id: "existing",
            user_id: "user-456",
            experiment_id: "exp-789",
            experiment_name: "test",
            variant: "control",
            bucket: 25,
            source: "calculated",
            assigned_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        });

      const input: CreateVariantAssignmentInput = {
        userId: "user-456",
        experimentId: "exp-789",
        experimentName: "test",
        variant: "control",
        bucket: 25,
      };

      const result = await createAssignment(mockSupabase as any, input);
      expect(result.id).toBe("existing");
    });
  });

  describe("upsertAssignment", () => {
    it("upserts assignment", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "assign-123",
          user_id: "user-456",
          experiment_id: "exp-789",
          experiment_name: "test",
          variant: "new_variant",
          bucket: 50,
          source: "forced",
          assigned_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const input: CreateVariantAssignmentInput = {
        userId: "user-456",
        experimentId: "exp-789",
        experimentName: "test",
        variant: "new_variant",
        bucket: 50,
        source: "forced",
      };

      const result = await upsertAssignment(mockSupabase as any, input);
      expect(result.variant).toBe("new_variant");
      expect(result.source).toBe("forced");
    });
  });

  describe("deleteAssignment", () => {
    it("deletes assignment", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.eq.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      await expect(
        deleteAssignment(mockSupabase as any, "user-456", "exp-789")
      ).resolves.not.toThrow();
    });
  });

  describe("getVariantForUser", () => {
    it("returns null for draft experiments", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "exp-123",
          name: "draft_test",
          description: null,
          variants: ["a", "b"],
          traffic_split: { a: 50, b: 50 },
          status: "draft",
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const result = await getVariantForUser(
        mockSupabase as any,
        "user-456",
        "draft_test"
      );

      expect(result.variant).toBeNull();
      expect(result.error).toContain("draft");
    });

    it("returns existing assignment for running experiment", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "paywall_test",
            description: null,
            variants: ["direct_paywall", "freemium"],
            traffic_split: { direct_paywall: 50, freemium: 50 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        })
        // Mock getAssignmentByName - existing assignment
        .mockResolvedValueOnce({
          data: {
            id: "assign-123",
            user_id: "user-456",
            experiment_id: "exp-123",
            experiment_name: "paywall_test",
            variant: "freemium",
            bucket: 60,
            source: "calculated",
            assigned_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        });

      const result = await getVariantForUser(
        mockSupabase as any,
        "user-456",
        "paywall_test"
      );

      expect(result.variant).toBe("freemium");
      expect(result.isNew).toBe(false);
    });

    it("creates new assignment for running experiment without existing", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "paywall_test",
            description: null,
            variants: ["direct_paywall", "freemium"],
            traffic_split: { direct_paywall: 50, freemium: 50 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        })
        // Mock getAssignmentByName - no existing
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        })
        // Mock createAssignment
        .mockResolvedValueOnce({
          data: {
            id: "new-assign",
            user_id: "user-456",
            experiment_id: "exp-123",
            experiment_name: "paywall_test",
            variant: "direct_paywall",
            bucket: 25,
            source: "calculated",
            assigned_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        });

      const result = await getVariantForUser(
        mockSupabase as any,
        "user-456",
        "paywall_test"
      );

      expect(result.variant).not.toBeNull();
      expect(result.isNew).toBe(true);
    });

    it("returns null for concluded experiment without assignment", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "concluded_test",
            description: null,
            variants: ["a", "b"],
            traffic_split: { a: 50, b: 50 },
            status: "concluded",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        })
        // Mock getAssignmentByName - no existing
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        });

      const result = await getVariantForUser(
        mockSupabase as any,
        "user-456",
        "concluded_test"
      );

      expect(result.variant).toBeNull();
      expect(result.error).toContain("concluded");
    });

    it("returns existing assignment for concluded experiment", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "concluded_test",
            description: null,
            variants: ["a", "b"],
            traffic_split: { a: 50, b: 50 },
            status: "concluded",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        })
        // Mock getAssignmentByName - existing assignment
        .mockResolvedValueOnce({
          data: {
            id: "assign-123",
            user_id: "user-456",
            experiment_id: "exp-123",
            experiment_name: "concluded_test",
            variant: "a",
            bucket: 10,
            source: "calculated",
            assigned_at: "2026-01-17T00:00:00Z",
          },
          error: null,
        });

      const result = await getVariantForUser(
        mockSupabase as any,
        "user-456",
        "concluded_test"
      );

      expect(result.variant).toBe("a");
      expect(result.isNew).toBe(false);
    });

    it("returns error for non-existent experiment", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      const result = await getVariantForUser(
        mockSupabase as any,
        "user-456",
        "nonexistent"
      );

      expect(result.variant).toBeNull();
      expect(result.error).toContain("not found");
    });
  });

  describe("forceAssignVariant", () => {
    it("forces assignment of valid variant", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "test",
            description: null,
            variants: ["control", "test"],
            traffic_split: { control: 50, test: 50 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        })
        // Mock upsert
        .mockResolvedValueOnce({
          data: {
            id: "assign-123",
            user_id: "user-456",
            experiment_id: "exp-123",
            experiment_name: "test",
            variant: "test",
            bucket: -1,
            source: "forced",
            assigned_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        });

      const result = await forceAssignVariant(
        mockSupabase as any,
        "user-456",
        "test",
        "test"
      );

      expect(result.variant).toBe("test");
      expect(result.assignment?.source).toBe("forced");
      expect(result.assignment?.bucket).toBe(-1);
    });

    it("rejects invalid variant", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single.mockResolvedValueOnce({
        data: {
          id: "exp-123",
          name: "test",
          description: null,
          variants: ["control", "test"],
          traffic_split: { control: 50, test: 50 },
          status: "running",
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const result = await forceAssignVariant(
        mockSupabase as any,
        "user-456",
        "test",
        "invalid_variant"
      );

      expect(result.variant).toBeNull();
      expect(result.error).toContain("Invalid variant");
    });
  });

  describe("syncLocalAssignment", () => {
    it("syncs local assignment to database", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "test",
            description: null,
            variants: ["a", "b"],
            traffic_split: { a: 50, b: 50 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        })
        // Mock getAssignmentByName - no existing
        .mockResolvedValueOnce({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        })
        // Mock createAssignment
        .mockResolvedValueOnce({
          data: {
            id: "synced-assign",
            user_id: "user-456",
            experiment_id: "exp-123",
            experiment_name: "test",
            variant: "a",
            bucket: 15,
            source: "localStorage",
            assigned_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        });

      const result = await syncLocalAssignment(
        mockSupabase as any,
        "user-456",
        "test",
        "a",
        15
      );

      expect(result.variant).toBe("a");
      expect(result.assignment?.source).toBe("localStorage");
    });

    it("preserves existing DB assignment over local", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment
      mockSupabase._chain.single
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "test",
            description: null,
            variants: ["a", "b"],
            traffic_split: { a: 50, b: 50 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          error: null,
        })
        // Mock getAssignmentByName - existing DB assignment
        .mockResolvedValueOnce({
          data: {
            id: "existing-assign",
            user_id: "user-456",
            experiment_id: "exp-123",
            experiment_name: "test",
            variant: "b", // Different from local
            bucket: 60,
            source: "calculated",
            assigned_at: "2026-01-17T00:00:00Z",
          },
          error: null,
        });

      const result = await syncLocalAssignment(
        mockSupabase as any,
        "user-456",
        "test",
        "a", // Local variant is different
        15
      );

      // DB assignment takes precedence
      expect(result.variant).toBe("b");
      expect(result.isNew).toBe(false);
    });
  });

  describe("getExperimentStats", () => {
    it("returns variant counts", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.eq.mockResolvedValue({
        data: [
          { variant: "a" },
          { variant: "a" },
          { variant: "a" },
          { variant: "b" },
          { variant: "b" },
        ],
        error: null,
      });

      const result = await getExperimentStats(
        mockSupabase as any,
        "test"
      );

      expect(result).toContainEqual({ variant: "a", count: 3 });
      expect(result).toContainEqual({ variant: "b", count: 2 });
    });
  });
});
