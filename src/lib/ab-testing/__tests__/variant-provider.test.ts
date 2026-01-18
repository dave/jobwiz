/**
 * Tests for Variant Provider Module
 * Issue: #42 - Variant assignment + storage
 */

import {
  getUnifiedVariant,
  getVariantForAnonymous,
  syncAllVariantsToSupabase,
  getVariantWithSplit,
  preloadExperiment,
} from "../variant-provider";
import * as stickyBucketing from "../sticky-bucketing";
import * as assignments from "../assignments";
import * as experiments from "../experiments";

// Mock modules
jest.mock("../sticky-bucketing", () => ({
  getStoredVariant: jest.fn(),
  storeVariant: jest.fn(),
  getOrAssignVariant: jest.fn(),
  createVariantAssigner: jest.fn(),
}));

jest.mock("../assignments", () => ({
  getVariantForUser: jest.fn(),
  syncLocalAssignment: jest.fn(),
}));

jest.mock("../experiments", () => ({
  getExperiment: jest.fn(),
}));

describe("Variant Provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUnifiedVariant", () => {
    it("returns localStorage variant when available", async () => {
      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue({
        variant: "cached_variant",
        bucket: 25,
        assignedAt: "2026-01-18T00:00:00Z",
      });

      const result = await getUnifiedVariant("user-123", "test_experiment");

      expect(result.variant).toBe("cached_variant");
      expect(result.source).toBe("localStorage");
      expect(result.isNew).toBe(false);
    });

    it("syncs localStorage to Supabase when logged in", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue({
        variant: "local_variant",
        bucket: 30,
        assignedAt: "2026-01-18T00:00:00Z",
      });

      (assignments.syncLocalAssignment as jest.Mock).mockResolvedValue({
        variant: "local_variant",
        isNew: false,
      });

      await getUnifiedVariant("user-123", "test", {
        supabase: mockSupabase as any,
        syncToSupabase: true,
      });

      // Sync should be called (in background)
      expect(assignments.syncLocalAssignment).toHaveBeenCalledWith(
        mockSupabase,
        "user-123",
        "test",
        "local_variant",
        30
      );
    });

    it("checks Supabase when localStorage is empty", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue(null);
      (assignments.getVariantForUser as jest.Mock).mockResolvedValue({
        variant: "db_variant",
        assignment: { bucket: 50 },
        isNew: false,
      });

      const result = await getUnifiedVariant("user-123", "test", {
        supabase: mockSupabase as any,
      });

      expect(result.variant).toBe("db_variant");
      expect(result.source).toBe("supabase");
      expect(stickyBucketing.storeVariant).toHaveBeenCalledWith(
        "test",
        "db_variant",
        50
      );
    });

    it("creates new assignment when none exists", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue(null);
      (assignments.getVariantForUser as jest.Mock).mockResolvedValue({
        variant: "new_variant",
        assignment: { bucket: 75 },
        isNew: true,
      });

      const result = await getUnifiedVariant("user-123", "test", {
        supabase: mockSupabase as any,
      });

      expect(result.variant).toBe("new_variant");
      expect(result.source).toBe("calculated");
      expect(result.isNew).toBe(true);
    });

    it("falls back to local calculation on Supabase error", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue(null);
      (assignments.getVariantForUser as jest.Mock).mockRejectedValue(
        new Error("DB connection failed")
      );
      (stickyBucketing.getOrAssignVariant as jest.Mock).mockReturnValue({
        variant: "local_fallback",
        bucket: 10,
        isNew: true,
      });

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await getUnifiedVariant("user-123", "test", {
        supabase: mockSupabase as any,
      });

      expect(result.variant).toBe("local_fallback");
      expect(result.source).toBe("calculated");

      consoleSpy.mockRestore();
    });

    it("returns error from Supabase when experiment not running", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue(null);
      (assignments.getVariantForUser as jest.Mock).mockResolvedValue({
        variant: null,
        assignment: null,
        isNew: false,
        error: "Experiment is in draft status",
      });

      const result = await getUnifiedVariant("user-123", "draft_test", {
        supabase: mockSupabase as any,
      });

      expect(result.variant).toBeNull();
      expect(result.error).toContain("draft");
    });

    it("uses local calculation without Supabase", async () => {
      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue(null);
      (stickyBucketing.getOrAssignVariant as jest.Mock).mockReturnValue({
        variant: "local_only",
        bucket: 45,
        isNew: true,
      });

      const result = await getUnifiedVariant("user-123", "test");

      expect(result.variant).toBe("local_only");
      expect(result.source).toBe("calculated");
      expect(assignments.getVariantForUser).not.toHaveBeenCalled();
    });
  });

  describe("getVariantForAnonymous", () => {
    it("returns localStorage variant", () => {
      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue({
        variant: "stored",
        bucket: 20,
        assignedAt: "2026-01-18T00:00:00Z",
      });

      const result = getVariantForAnonymous("anon-123", "test");

      expect(result.variant).toBe("stored");
      expect(result.source).toBe("localStorage");
    });

    it("calculates new variant when localStorage empty", () => {
      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue(null);
      (stickyBucketing.getOrAssignVariant as jest.Mock).mockReturnValue({
        variant: "calculated",
        bucket: 55,
        isNew: true,
      });

      const result = getVariantForAnonymous("anon-123", "test");

      expect(result.variant).toBe("calculated");
      expect(result.source).toBe("calculated");
      expect(result.isNew).toBe(true);
    });
  });

  describe("syncAllVariantsToSupabase", () => {
    it("syncs all stored variants", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock)
        .mockReturnValueOnce({
          variant: "variant_a",
          bucket: 10,
          assignedAt: "2026-01-18T00:00:00Z",
        })
        .mockReturnValueOnce({
          variant: "variant_b",
          bucket: 60,
          assignedAt: "2026-01-18T00:00:00Z",
        });

      (assignments.syncLocalAssignment as jest.Mock)
        .mockResolvedValueOnce({
          variant: "variant_a",
          isNew: false,
        })
        .mockResolvedValueOnce({
          variant: "variant_b",
          isNew: true,
        });

      const results = await syncAllVariantsToSupabase(
        mockSupabase as any,
        "user-123",
        ["exp_a", "exp_b"]
      );

      expect(results.size).toBe(2);
      expect(results.get("exp_a")?.variant).toBe("variant_a");
      expect(results.get("exp_b")?.variant).toBe("variant_b");
    });

    it("handles sync errors gracefully", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue({
        variant: "error_variant",
        bucket: 30,
        assignedAt: "2026-01-18T00:00:00Z",
      });

      (assignments.syncLocalAssignment as jest.Mock).mockRejectedValue(
        new Error("Sync failed")
      );

      const results = await syncAllVariantsToSupabase(
        mockSupabase as any,
        "user-123",
        ["failing_exp"]
      );

      expect(results.get("failing_exp")?.variant).toBe("error_variant");
      expect(results.get("failing_exp")?.source).toBe("localStorage");
      expect(results.get("failing_exp")?.error).toBe("Sync failed");
    });

    it("skips experiments not in localStorage", async () => {
      const mockSupabase = { from: jest.fn() };

      (stickyBucketing.getStoredVariant as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          variant: "exists",
          bucket: 40,
          assignedAt: "2026-01-18T00:00:00Z",
        });

      (assignments.syncLocalAssignment as jest.Mock).mockResolvedValue({
        variant: "exists",
        isNew: false,
      });

      const results = await syncAllVariantsToSupabase(
        mockSupabase as any,
        "user-123",
        ["not_stored", "stored"]
      );

      // Only one should be synced
      expect(results.size).toBe(1);
      expect(results.has("not_stored")).toBe(false);
      expect(results.get("stored")?.variant).toBe("exists");
    });
  });

  describe("getVariantWithSplit", () => {
    it("uses custom traffic split", () => {
      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue(null);
      (stickyBucketing.createVariantAssigner as jest.Mock).mockReturnValue(
        () => "custom_variant"
      );
      (stickyBucketing.getOrAssignVariant as jest.Mock).mockReturnValue({
        variant: "custom_variant",
        bucket: 35,
        isNew: true,
      });

      const result = getVariantWithSplit("user-123", "test", {
        control: 80,
        test: 20,
      });

      expect(result.variant).toBe("custom_variant");
      expect(stickyBucketing.createVariantAssigner).toHaveBeenCalledWith({
        control: 80,
        test: 20,
      });
    });

    it("returns localStorage variant if exists", () => {
      (stickyBucketing.getStoredVariant as jest.Mock).mockReturnValue({
        variant: "cached",
        bucket: 50,
        assignedAt: "2026-01-18T00:00:00Z",
      });

      const result = getVariantWithSplit("user-123", "test", {
        a: 50,
        b: 50,
      });

      expect(result.variant).toBe("cached");
      expect(result.source).toBe("localStorage");
      expect(stickyBucketing.createVariantAssigner).not.toHaveBeenCalled();
    });
  });

  describe("preloadExperiment", () => {
    it("returns true when experiment exists", async () => {
      const mockSupabase = { from: jest.fn() };
      (experiments.getExperiment as jest.Mock).mockResolvedValue({
        id: "exp-123",
        name: "test",
      });

      const result = await preloadExperiment(mockSupabase as any, "test");
      expect(result).toBe(true);
    });

    it("returns false when experiment doesn't exist", async () => {
      const mockSupabase = { from: jest.fn() };
      (experiments.getExperiment as jest.Mock).mockResolvedValue(null);

      const result = await preloadExperiment(
        mockSupabase as any,
        "nonexistent"
      );
      expect(result).toBe(false);
    });

    it("returns false on error", async () => {
      const mockSupabase = { from: jest.fn() };
      (experiments.getExperiment as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const result = await preloadExperiment(mockSupabase as any, "error_exp");
      expect(result).toBe(false);
    });
  });
});
