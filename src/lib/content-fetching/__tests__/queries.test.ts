/**
 * Tests for content fetching queries
 *
 * Note: Module content is now loaded from JSON files by the carousel loader.
 * This file only tests the remaining functions: getCompanyBySlug, getRoleBySlug, checkUserAccess.
 */

import { getCompanyBySlug, getRoleBySlug, checkUserAccess } from "../queries";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock Supabase client
function createMockSupabase(
  options: {
    accessGrants?: unknown[];
    accessError?: { message: string; code?: string };
  } = {}
): SupabaseClient {
  const { accessGrants = [], accessError } = options;

  // Create chainable mock that properly resolves as a promise
  const createChain = (
    data: unknown[],
    error?: { message: string; code?: string }
  ) => {
    const chain: Record<string, unknown> = {};

    // All chainable methods return the chain
    const chainMethods = ["select", "eq", "or", "gte", "lte", "limit"];
    chainMethods.forEach((method) => {
      chain[method] = jest.fn().mockReturnValue(chain);
    });

    // Terminal methods
    chain.single = jest.fn().mockResolvedValue({
      data: data[0] ?? null,
      error: error ?? null,
    });

    chain.maybeSingle = jest.fn().mockResolvedValue({
      data: data[0] ?? null,
      error: error ?? null,
    });

    return chain;
  };

  const mockClient = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "access_grants") {
        return createChain(accessGrants, accessError);
      }
      return createChain([]);
    }),
  };

  return mockClient as unknown as SupabaseClient;
}

describe("Content fetching queries", () => {
  describe("getCompanyBySlug", () => {
    it("returns company for valid slug", () => {
      const company = getCompanyBySlug("google");
      expect(company).not.toBeNull();
      expect(company?.slug).toBe("google");
      expect(company?.name).toBe("Google");
    });

    it("returns null for invalid slug", () => {
      const company = getCompanyBySlug("invalid-company");
      expect(company).toBeNull();
    });

    it("handles case-insensitive matching", () => {
      const company = getCompanyBySlug("GOOGLE");
      expect(company).not.toBeNull();
      expect(company?.slug).toBe("google");
    });
  });

  describe("getRoleBySlug", () => {
    it("returns role for valid company and role", () => {
      const role = getRoleBySlug("google", "software-engineer");
      expect(role).not.toBeNull();
      expect(role?.slug).toBe("software-engineer");
    });

    it("returns null for invalid company", () => {
      const role = getRoleBySlug("invalid-company", "software-engineer");
      expect(role).toBeNull();
    });

    it("returns null for invalid role", () => {
      const role = getRoleBySlug("google", "invalid-role");
      expect(role).toBeNull();
    });

    it("handles case-insensitive matching", () => {
      const role = getRoleBySlug("google", "SOFTWARE-ENGINEER");
      expect(role).not.toBeNull();
      expect(role?.slug).toBe("software-engineer");
    });
  });

  describe("checkUserAccess", () => {
    it("returns no access when no grants exist", async () => {
      const supabase = createMockSupabase({ accessGrants: [] });

      const result = await checkUserAccess(
        supabase,
        "user-123",
        "google",
        "software-engineer"
      );

      expect(result.hasAccess).toBe(false);
    });

    it("returns access when valid grant exists", async () => {
      const supabase = createMockSupabase({
        accessGrants: [{ id: "grant-1", expires_at: "2099-12-31T23:59:59Z" }],
      });

      const result = await checkUserAccess(
        supabase,
        "user-123",
        "google",
        "software-engineer"
      );

      expect(result.hasAccess).toBe(true);
      expect(result.purchaseId).toBe("grant-1");
    });

    it("returns no access on database error", async () => {
      const supabase = createMockSupabase({
        accessError: { message: "Table not found" },
      });

      const result = await checkUserAccess(
        supabase,
        "user-123",
        "google",
        "software-engineer"
      );

      expect(result.hasAccess).toBe(false);
    });

    it("includes userId in successful access result", async () => {
      const supabase = createMockSupabase({
        accessGrants: [{ id: "grant-1", expires_at: "2099-12-31T23:59:59Z" }],
      });

      const result = await checkUserAccess(
        supabase,
        "user-456",
        "google",
        "software-engineer"
      );

      expect(result.hasAccess).toBe(true);
      expect(result.userId).toBe("user-456");
    });

    it("includes expiresAt in successful access result", async () => {
      const expiresAt = "2099-12-31T23:59:59Z";
      const supabase = createMockSupabase({
        accessGrants: [{ id: "grant-1", expires_at: expiresAt }],
      });

      const result = await checkUserAccess(
        supabase,
        "user-123",
        "google",
        "software-engineer"
      );

      expect(result.hasAccess).toBe(true);
      expect(result.expiresAt).toBe(expiresAt);
    });
  });
});
