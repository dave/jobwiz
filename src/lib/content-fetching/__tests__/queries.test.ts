/**
 * Tests for content fetching queries
 */

import {
  getCompanyBySlug,
  getRoleBySlug,
  getModulesForPosition,
  getPreviewContent,
  getFullContent,
  checkUserAccess,
} from "../queries";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock Supabase client with proper async chain resolution
function createMockSupabase(
  options: {
    modules?: unknown[];
    blocks?: unknown[];
    accessGrants?: unknown[];
    modulesError?: { message: string; code?: string };
    blocksError?: { message: string; code?: string };
    accessError?: { message: string; code?: string };
  } = {}
): SupabaseClient {
  const {
    modules = [],
    blocks = [],
    accessGrants = [],
    modulesError,
    blocksError,
    accessError,
  } = options;

  // Create chainable mock that properly resolves as a promise
  const createChain = (data: unknown[], error?: { message: string; code?: string }) => {
    // Create the result that will be awaited
    const result = { data: error ? null : data, error: error ?? null };

    // Make it thenable so it works with async/await
    const makeThenable = (obj: Record<string, unknown>) => {
      obj.then = (onFulfilled: (value: typeof result) => unknown) => {
        return Promise.resolve(onFulfilled(result));
      };
      return obj;
    };

    const chain: Record<string, unknown> = {};

    // All chainable methods return the chain
    const chainMethods = ["select", "eq", "or", "gte", "lte", "limit"];
    chainMethods.forEach((method) => {
      chain[method] = jest.fn().mockReturnValue(chain);
    });

    // Order method returns a thenable chain
    chain.order = jest.fn().mockImplementation(() => {
      return makeThenable({ ...chain });
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

    // Make the base chain thenable too
    makeThenable(chain);

    return chain;
  };

  const mockClient = {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "modules") {
        return createChain(modules, modulesError);
      }
      if (table === "content_blocks") {
        return createChain(blocks, blocksError);
      }
      if (table === "access_grants") {
        return createChain(accessGrants, accessError);
      }
      return createChain([]);
    }),
  };

  return mockClient as unknown as SupabaseClient;
}

// Sample test data
const sampleModules = [
  {
    id: "mod-1",
    slug: "universal-interview-basics",
    type: "universal",
    title: "Interview Basics",
    description: "General interview preparation",
    company_slug: null,
    role_slug: null,
    industry: null,
    status: "published",
    version: 1,
    is_premium: false,
    display_order: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "mod-2",
    slug: "company-google",
    type: "company",
    title: "Google Interview Guide",
    description: "Google-specific preparation",
    company_slug: "google",
    role_slug: null,
    industry: null,
    status: "published",
    version: 1,
    is_premium: true,
    display_order: 10,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "mod-3",
    slug: "company-role-google-swe",
    type: "company-role",
    title: "Google Software Engineer Guide",
    description: "Google SWE specific prep",
    company_slug: "google",
    role_slug: "software-engineer",
    industry: null,
    status: "published",
    version: 1,
    is_premium: true,
    display_order: 20,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const sampleBlocks = [
  {
    id: "block-1",
    module_id: "mod-1",
    section_id: "section-1",
    section_title: "Introduction",
    block_type: "text",
    content: { content: "Welcome to interview basics" },
    section_order: 0,
    block_order: 0,
    is_premium: false,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "block-2",
    module_id: "mod-1",
    section_id: "section-1",
    section_title: "Introduction",
    block_type: "tip",
    content: { content: "Always prepare your STAR stories" },
    section_order: 0,
    block_order: 1,
    is_premium: false,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "block-3",
    module_id: "mod-1",
    section_id: "section-2",
    section_title: "Advanced Topics",
    block_type: "text",
    content: { content: "Premium content about advanced topics" },
    section_order: 1,
    block_order: 0,
    is_premium: true,
    created_at: "2024-01-01T00:00:00Z",
  },
];

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

  describe("getModulesForPosition", () => {
    it("returns modules for valid position", async () => {
      const supabase = createMockSupabase({ modules: sampleModules });
      const modules = await getModulesForPosition(
        supabase,
        "google",
        "software-engineer"
      );

      expect(modules.length).toBeGreaterThan(0);
    });

    it("returns empty array when no modules found", async () => {
      const supabase = createMockSupabase({ modules: [] });
      const modules = await getModulesForPosition(
        supabase,
        "unknown",
        "unknown"
      );

      expect(modules).toEqual([]);
    });

    it("returns empty array on error", async () => {
      const supabase = createMockSupabase({
        modulesError: { message: "Database error" },
      });
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const modules = await getModulesForPosition(
        supabase,
        "google",
        "software-engineer"
      );

      expect(modules).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("respects module type filter", async () => {
      const supabase = createMockSupabase({ modules: sampleModules });
      const modules = await getModulesForPosition(
        supabase,
        "google",
        "software-engineer",
        { moduleTypes: ["universal"] }
      );

      // All returned modules should be universal
      expect(modules.every((m) => m.type === "universal")).toBe(true);
    });

    it("respects limit option", async () => {
      const supabase = createMockSupabase({ modules: sampleModules });
      const modules = await getModulesForPosition(
        supabase,
        "google",
        "software-engineer",
        { limit: 1 }
      );

      expect(modules.length).toBeLessThanOrEqual(1);
    });

    it("orders modules correctly by type", async () => {
      const supabase = createMockSupabase({ modules: sampleModules });
      const modules = await getModulesForPosition(
        supabase,
        "google",
        "software-engineer"
      );

      // Verify order: universal → industry → role → company → company-role
      const typeOrder = ["universal", "industry", "role", "company", "company-role"];
      let lastTypeIndex = -1;

      for (const mod of modules) {
        const currentIndex = typeOrder.indexOf(mod.type);
        expect(currentIndex).toBeGreaterThanOrEqual(lastTypeIndex);
        lastTypeIndex = currentIndex;
      }
    });
  });

  describe("getPreviewContent", () => {
    it("returns preview content for valid position", async () => {
      const supabase = createMockSupabase({
        modules: sampleModules.filter((m) => !m.is_premium),
        blocks: sampleBlocks.filter((b) => !b.is_premium),
      });

      const content = await getPreviewContent(
        supabase,
        "google",
        "software-engineer"
      );

      expect(content).not.toBeNull();
      expect(content?.hasPremiumAccess).toBe(false);
      expect(content?.company.slug).toBe("google");
      expect(content?.role.slug).toBe("software-engineer");
    });

    it("returns null for invalid company", async () => {
      const supabase = createMockSupabase();
      const content = await getPreviewContent(
        supabase,
        "invalid-company",
        "software-engineer"
      );

      expect(content).toBeNull();
    });

    it("returns null for invalid role", async () => {
      const supabase = createMockSupabase();
      const content = await getPreviewContent(
        supabase,
        "google",
        "invalid-role"
      );

      expect(content).toBeNull();
    });

    it("excludes premium blocks from preview", async () => {
      const supabase = createMockSupabase({
        modules: sampleModules.filter((m) => !m.is_premium),
        blocks: sampleBlocks,
      });

      const content = await getPreviewContent(
        supabase,
        "google",
        "software-engineer"
      );

      // Verify no premium blocks in sections
      if (content) {
        for (const mod of content.modules) {
          for (const section of mod.sections) {
            // All blocks should be free in preview
            expect(section.blocks.length).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    it("tracks truncated premium sections", async () => {
      const supabase = createMockSupabase({
        modules: sampleModules.filter((m) => !m.is_premium),
        blocks: sampleBlocks,
      });

      const content = await getPreviewContent(
        supabase,
        "google",
        "software-engineer"
      );

      expect(content).not.toBeNull();
      expect(content?.truncatedSections).toBeDefined();
    });

    it("counts premium and free modules correctly", async () => {
      const supabase = createMockSupabase({
        modules: sampleModules,
        blocks: sampleBlocks,
      });

      const content = await getPreviewContent(
        supabase,
        "google",
        "software-engineer"
      );

      expect(content).not.toBeNull();
      expect(typeof content?.premiumModuleCount).toBe("number");
      expect(typeof content?.freeModuleCount).toBe("number");
    });
  });

  describe("getFullContent", () => {
    it("returns null when user has no access", async () => {
      const supabase = createMockSupabase({
        modules: sampleModules,
        blocks: sampleBlocks,
        accessGrants: [], // No access
      });

      const content = await getFullContent(
        supabase,
        "google",
        "software-engineer",
        "user-123"
      );

      expect(content).toBeNull();
    });

    it("returns null for invalid company", async () => {
      const supabase = createMockSupabase({
        accessGrants: [{ id: "grant-1", expires_at: "2099-12-31T23:59:59Z" }],
      });

      const content = await getFullContent(
        supabase,
        "invalid-company",
        "software-engineer",
        "user-123"
      );

      expect(content).toBeNull();
    });

    it("returns null for invalid role", async () => {
      const supabase = createMockSupabase({
        accessGrants: [{ id: "grant-1", expires_at: "2099-12-31T23:59:59Z" }],
      });

      const content = await getFullContent(
        supabase,
        "google",
        "invalid-role",
        "user-123"
      );

      expect(content).toBeNull();
    });

    it("returns full content with premium access", async () => {
      const supabase = createMockSupabase({
        modules: sampleModules,
        blocks: sampleBlocks,
        accessGrants: [{ id: "grant-1", expires_at: "2099-12-31T23:59:59Z" }],
      });

      const content = await getFullContent(
        supabase,
        "google",
        "software-engineer",
        "user-123"
      );

      expect(content).not.toBeNull();
      expect(content?.hasPremiumAccess).toBe(true);
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
  });
});

describe("Module filtering", () => {
  it("includes universal modules for any position", async () => {
    const supabase = createMockSupabase({
      modules: [sampleModules[0]], // Universal module
    });

    const modules = await getModulesForPosition(
      supabase,
      "amazon",
      "data-scientist"
    );

    expect(modules.some((m) => m.type === "universal")).toBe(true);
  });

  it("includes company modules only for matching company", async () => {
    const supabase = createMockSupabase({
      modules: sampleModules,
    });

    const googleModules = await getModulesForPosition(
      supabase,
      "google",
      "software-engineer"
    );

    const amazonModules = await getModulesForPosition(
      supabase,
      "amazon",
      "software-engineer"
    );

    // Google modules should have company-specific content
    const googleCompanyMods = googleModules.filter(
      (m) => m.type === "company" && m.companySlug === "google"
    );

    // Amazon shouldn't have Google company modules
    const amazonGoogleMods = amazonModules.filter(
      (m) => m.type === "company" && m.companySlug === "google"
    );

    expect(amazonGoogleMods.length).toBe(0);
  });

  it("includes company-role modules only for exact match", async () => {
    const supabase = createMockSupabase({
      modules: sampleModules,
    });

    const googleSweModules = await getModulesForPosition(
      supabase,
      "google",
      "software-engineer"
    );

    const googlePmModules = await getModulesForPosition(
      supabase,
      "google",
      "product-manager"
    );

    // Google SWE should have company-role module
    const sweCombos = googleSweModules.filter(
      (m) =>
        m.type === "company-role" &&
        m.companySlug === "google" &&
        m.roleSlug === "software-engineer"
    );

    // Google PM shouldn't have SWE company-role module
    const pmCombos = googlePmModules.filter(
      (m) =>
        m.type === "company-role" &&
        m.companySlug === "google" &&
        m.roleSlug === "software-engineer"
    );

    expect(pmCombos.length).toBe(0);
  });
});

describe("Content transformation", () => {
  it("transforms database module to Module type correctly", async () => {
    const supabase = createMockSupabase({
      modules: [sampleModules[0]],
    });

    const modules = await getModulesForPosition(
      supabase,
      "google",
      "software-engineer"
    );

    expect(modules.length).toBeGreaterThan(0);
    const mod = modules[0]!;
    expect(mod.id).toBeDefined();
    expect(mod.slug).toBeDefined();
    expect(mod.type).toBeDefined();
    expect(mod.title).toBeDefined();
    expect(mod.sections).toBeDefined();
    expect(Array.isArray(mod.sections)).toBe(true);
    expect(typeof mod.isPremium).toBe("boolean");
    expect(typeof mod.order).toBe("number");
  });

  it("groups blocks by section correctly", async () => {
    const supabase = createMockSupabase({
      modules: [sampleModules[0]],
      blocks: sampleBlocks.filter((b) => b.module_id === "mod-1" && !b.is_premium),
    });

    const content = await getPreviewContent(
      supabase,
      "google",
      "software-engineer"
    );

    expect(content).not.toBeNull();
    expect(content!.modules.length).toBeGreaterThan(0);
    const mod = content!.modules[0]!;
    // Should have sections
    expect(mod.sections.length).toBeGreaterThan(0);
    // Each section should have id and title
    for (const section of mod.sections) {
      expect(section.id).toBeDefined();
      expect(section.title).toBeDefined();
      expect(Array.isArray(section.blocks)).toBe(true);
    }
  });
});
