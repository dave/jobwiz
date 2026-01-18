/**
 * Tests for Experiments Storage Module
 * Issue: #42 - Variant assignment + storage
 */

import {
  transformExperimentRow,
  validateTrafficSplit,
  validateVariantsMatchSplit,
  getExperiment,
  getExperimentById,
  getAllExperiments,
  getRunningExperiments,
  createExperiment,
  updateExperimentStatus,
  updateExperimentTrafficSplit,
  deleteExperiment,
  experimentExists,
} from "../experiments";
import type { ExperimentRow, CreateExperimentInput } from "../types";

// Mock Supabase client
const createMockSupabase = () => {
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockFrom = jest.fn();

  const mockChain = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
  };

  mockFrom.mockReturnValue(mockChain);
  mockSelect.mockReturnValue(mockChain);
  mockInsert.mockReturnValue(mockChain);
  mockUpdate.mockReturnValue(mockChain);
  mockDelete.mockReturnValue(mockChain);

  return {
    from: mockFrom,
    _chain: mockChain,
  };
};

describe("Experiments Storage", () => {
  describe("transformExperimentRow", () => {
    it("transforms snake_case to camelCase", () => {
      const row: ExperimentRow = {
        id: "exp-123",
        name: "test_experiment",
        description: "Test description",
        variants: ["a", "b", "c"],
        traffic_split: { a: 33, b: 33, c: 34 },
        status: "running",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T01:00:00Z",
      };

      const result = transformExperimentRow(row);

      expect(result).toEqual({
        id: "exp-123",
        name: "test_experiment",
        description: "Test description",
        variants: ["a", "b", "c"],
        trafficSplit: { a: 33, b: 33, c: 34 },
        status: "running",
        createdAt: "2026-01-18T00:00:00Z",
        updatedAt: "2026-01-18T01:00:00Z",
      });
    });

    it("handles null description", () => {
      const row: ExperimentRow = {
        id: "exp-123",
        name: "test",
        description: null,
        variants: ["a"],
        traffic_split: { a: 100 },
        status: "draft",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const result = transformExperimentRow(row);
      expect(result.description).toBeNull();
    });
  });

  describe("validateTrafficSplit", () => {
    it("returns true when split sums to 100", () => {
      expect(validateTrafficSplit({ a: 25, b: 25, c: 25, d: 25 })).toBe(true);
      expect(validateTrafficSplit({ a: 50, b: 50 })).toBe(true);
      expect(validateTrafficSplit({ a: 100 })).toBe(true);
    });

    it("returns false when split does not sum to 100", () => {
      expect(validateTrafficSplit({ a: 25, b: 25, c: 25 })).toBe(false);
      expect(validateTrafficSplit({ a: 50, b: 60 })).toBe(false);
      expect(validateTrafficSplit({})).toBe(false);
    });
  });

  describe("validateVariantsMatchSplit", () => {
    it("returns true when variants match split keys", () => {
      expect(
        validateVariantsMatchSplit(["a", "b", "c"], { a: 33, b: 33, c: 34 })
      ).toBe(true);
      expect(
        validateVariantsMatchSplit(["control", "test"], { control: 50, test: 50 })
      ).toBe(true);
    });

    it("returns true regardless of order", () => {
      expect(
        validateVariantsMatchSplit(["c", "a", "b"], { a: 33, b: 33, c: 34 })
      ).toBe(true);
    });

    it("returns false when variants don't match split keys", () => {
      expect(validateVariantsMatchSplit(["a", "b"], { a: 33, c: 67 })).toBe(
        false
      );
      expect(validateVariantsMatchSplit(["a"], { a: 50, b: 50 })).toBe(false);
    });
  });

  describe("getExperiment", () => {
    it("returns experiment when found", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "exp-123",
          name: "paywall_test",
          description: null,
          variants: ["direct", "freemium"],
          traffic_split: { direct: 50, freemium: 50 },
          status: "running",
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const result = await getExperiment(mockSupabase as any, "paywall_test");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("paywall_test");
      expect(result?.status).toBe("running");
      expect(mockSupabase.from).toHaveBeenCalledWith("experiments");
    });

    it("returns null when not found", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      const result = await getExperiment(mockSupabase as any, "nonexistent");
      expect(result).toBeNull();
    });

    it("throws on database error", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: null,
        error: { code: "500", message: "Database error" },
      });

      await expect(
        getExperiment(mockSupabase as any, "test")
      ).rejects.toThrow("Failed to get experiment");
    });
  });

  describe("getExperimentById", () => {
    it("returns experiment by ID", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "exp-123",
          name: "test",
          description: null,
          variants: ["a"],
          traffic_split: { a: 100 },
          status: "draft",
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const result = await getExperimentById(mockSupabase as any, "exp-123");
      expect(result?.id).toBe("exp-123");
    });
  });

  describe("getAllExperiments", () => {
    it("returns all experiments", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.order.mockResolvedValue({
        data: [
          {
            id: "1",
            name: "exp1",
            description: null,
            variants: ["a"],
            traffic_split: { a: 100 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
          {
            id: "2",
            name: "exp2",
            description: null,
            variants: ["b"],
            traffic_split: { b: 100 },
            status: "draft",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
        ],
        error: null,
      });

      const result = await getAllExperiments(mockSupabase as any);
      expect(result).toHaveLength(2);
    });

    it("filters by status", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.order.mockResolvedValue({
        data: [
          {
            id: "1",
            name: "exp1",
            description: null,
            variants: ["a"],
            traffic_split: { a: 100 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T00:00:00Z",
          },
        ],
        error: null,
      });

      await getAllExperiments(mockSupabase as any, "running");
      expect(mockSupabase._chain.eq).toHaveBeenCalledWith("status", "running");
    });
  });

  describe("getRunningExperiments", () => {
    it("calls getAllExperiments with running status", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getRunningExperiments(mockSupabase as any);
      expect(mockSupabase._chain.eq).toHaveBeenCalledWith("status", "running");
    });
  });

  describe("createExperiment", () => {
    it("creates experiment with valid input", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "new-exp",
          name: "new_experiment",
          description: "Test",
          variants: ["a", "b"],
          traffic_split: { a: 50, b: 50 },
          status: "draft",
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
        error: null,
      });

      const input: CreateExperimentInput = {
        name: "new_experiment",
        description: "Test",
        variants: ["a", "b"],
        trafficSplit: { a: 50, b: 50 },
      };

      const result = await createExperiment(mockSupabase as any, input);
      expect(result.name).toBe("new_experiment");
      expect(result.status).toBe("draft");
    });

    it("throws when traffic split doesn't sum to 100", async () => {
      const mockSupabase = createMockSupabase();

      const input: CreateExperimentInput = {
        name: "bad_split",
        variants: ["a", "b"],
        trafficSplit: { a: 30, b: 30 },
      };

      await expect(
        createExperiment(mockSupabase as any, input)
      ).rejects.toThrow("Traffic split must sum to 100");
    });

    it("throws when variants don't match split", async () => {
      const mockSupabase = createMockSupabase();

      const input: CreateExperimentInput = {
        name: "mismatch",
        variants: ["a", "b"],
        trafficSplit: { a: 50, c: 50 },
      };

      await expect(
        createExperiment(mockSupabase as any, input)
      ).rejects.toThrow("Variants must match traffic split keys");
    });
  });

  describe("updateExperimentStatus", () => {
    it("updates status", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: {
          id: "exp-123",
          name: "test",
          description: null,
          variants: ["a"],
          traffic_split: { a: 100 },
          status: "running",
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T01:00:00Z",
        },
        error: null,
      });

      const result = await updateExperimentStatus(
        mockSupabase as any,
        "test",
        "running"
      );
      expect(result.status).toBe("running");
    });
  });

  describe("updateExperimentTrafficSplit", () => {
    it("updates traffic split when valid", async () => {
      const mockSupabase = createMockSupabase();

      // Mock getExperiment call
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
        // Mock update call
        .mockResolvedValueOnce({
          data: {
            id: "exp-123",
            name: "test",
            description: null,
            variants: ["a", "b"],
            traffic_split: { a: 70, b: 30 },
            status: "running",
            created_at: "2026-01-18T00:00:00Z",
            updated_at: "2026-01-18T01:00:00Z",
          },
          error: null,
        });

      const result = await updateExperimentTrafficSplit(
        mockSupabase as any,
        "test",
        { a: 70, b: 30 }
      );
      expect(result.trafficSplit).toEqual({ a: 70, b: 30 });
    });

    it("throws when split doesn't sum to 100", async () => {
      const mockSupabase = createMockSupabase();

      await expect(
        updateExperimentTrafficSplit(mockSupabase as any, "test", {
          a: 30,
          b: 30,
        })
      ).rejects.toThrow("Traffic split must sum to 100");
    });
  });

  describe("deleteExperiment", () => {
    it("deletes experiment", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.eq.mockResolvedValue({
        error: null,
      });

      await expect(
        deleteExperiment(mockSupabase as any, "test")
      ).resolves.not.toThrow();
    });
  });

  describe("experimentExists", () => {
    it("returns true when experiment exists", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: { id: "exp-123" },
        error: null,
      });

      const result = await experimentExists(mockSupabase as any, "test");
      expect(result).toBe(true);
    });

    it("returns false when experiment doesn't exist", async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase._chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      const result = await experimentExists(mockSupabase as any, "nonexistent");
      expect(result).toBe(false);
    });
  });
});
