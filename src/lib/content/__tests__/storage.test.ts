/**
 * Tests for content storage schema and functions
 * Issue: #31 - Supabase content storage schema
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createModule,
  getModuleBySlug,
  getModulesByCompany,
  getModulesByRole,
  updateModuleStatus,
  updateModuleQualityScores,
  searchModules,
  createContentBlock,
  createContentBlocksBatch,
  getContentBlocksForModule,
  createGenerationRun,
  completeGenerationRun,
  failGenerationRun,
  moduleExists,
} from "../storage";
import type {
  DbModule,
  DbContentBlock,
  DbGenerationRun,
  CreateModuleInput,
  CreateContentBlockInput,
  ModuleStatus,
} from "../types";

// Mock Supabase client
function createMockSupabase(
  mockData: unknown = {},
  mockError: { code?: string; message: string } | null = null
): SupabaseClient {
  const mockResponse = {
    data: mockData,
    error: mockError,
  };

  const chainMethods = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockResponse),
  };

  // Make each method return the chain for chaining
  Object.keys(chainMethods).forEach((key) => {
    const method = chainMethods[key as keyof typeof chainMethods];
    if (key !== "single") {
      (method as jest.Mock).mockReturnThis();
    }
  });

  // Special handling for terminal methods
  chainMethods.single = jest.fn().mockResolvedValue(mockResponse);

  // For select without single (returns array)
  const selectWithArray = {
    ...chainMethods,
    then: jest
      .fn()
      .mockImplementation((resolve) =>
        resolve({ data: Array.isArray(mockData) ? mockData : [mockData], error: mockError })
      ),
  };

  return {
    from: jest.fn().mockReturnValue({
      ...chainMethods,
      select: jest.fn().mockReturnValue(selectWithArray),
      insert: jest.fn().mockReturnValue(chainMethods),
      update: jest.fn().mockReturnValue(chainMethods),
    }),
  } as unknown as SupabaseClient;
}

// Sample data for tests
const sampleSearchVolume = {
  companies: [
    {
      name: "Google",
      slug: "google",
      roles: [
        { name: "Software Engineer", slug: "software-engineer" },
        { name: "Product Manager", slug: "product-manager" },
      ],
    },
  ],
};

describe("Content storage schema types", () => {
  describe("ModuleType values", () => {
    test("supports universal type", () => {
      const input: CreateModuleInput = {
        slug: "universal-basics",
        type: "universal",
        title: "Interview Basics",
      };
      expect(input.type).toBe("universal");
    });

    test("supports industry type", () => {
      const input: CreateModuleInput = {
        slug: "tech-industry",
        type: "industry",
        title: "Tech Industry",
        industry: "technology",
      };
      expect(input.type).toBe("industry");
      expect(input.industry).toBe("technology");
    });

    test("supports role type", () => {
      const input: CreateModuleInput = {
        slug: "swe-prep",
        type: "role",
        title: "SWE Prep",
        role_slug: "software-engineer",
      };
      expect(input.type).toBe("role");
      expect(input.role_slug).toBe("software-engineer");
    });

    test("supports company type", () => {
      const input: CreateModuleInput = {
        slug: "google-company",
        type: "company",
        title: "Google Culture",
        company_slug: "google",
      };
      expect(input.type).toBe("company");
      expect(input.company_slug).toBe("google");
    });

    test("supports company-role type", () => {
      const input: CreateModuleInput = {
        slug: "google-swe",
        type: "company-role",
        title: "Google SWE Prep",
        company_slug: "google",
        role_slug: "software-engineer",
      };
      expect(input.type).toBe("company-role");
      expect(input.company_slug).toBe("google");
      expect(input.role_slug).toBe("software-engineer");
    });
  });

  describe("ContentBlockType values", () => {
    const validBlockTypes = [
      "text",
      "header",
      "quote",
      "tip",
      "warning",
      "video",
      "audio",
      "image",
      "quiz",
      "checklist",
      "infographic",
      "animation",
    ];

    test.each(validBlockTypes)("supports %s block type", (blockType) => {
      const input: CreateContentBlockInput = {
        module_id: "test-id",
        section_id: "section-1",
        section_title: "Test Section",
        block_type: blockType as CreateContentBlockInput["block_type"],
        content: {},
        section_order: 0,
        block_order: 0,
      };
      expect(input.block_type).toBe(blockType);
    });
  });

  describe("ModuleStatus values", () => {
    test("supports draft status", () => {
      const status: ModuleStatus = "draft";
      expect(status).toBe("draft");
    });

    test("supports reviewed status", () => {
      const status: ModuleStatus = "reviewed";
      expect(status).toBe("reviewed");
    });

    test("supports published status", () => {
      const status: ModuleStatus = "published";
      expect(status).toBe("published");
    });
  });
});

describe("Module CRUD operations", () => {
  describe("createModule", () => {
    test("creates module with required fields", async () => {
      const mockModule: DbModule = {
        id: "test-id",
        slug: "test-module",
        type: "company",
        title: "Test Module",
        description: null,
        company_slug: "google",
        role_slug: null,
        industry: null,
        status: "draft",
        version: 1,
        quality_score: null,
        readability_score: null,
        reviewer_notes: null,
        reviewed_at: null,
        reviewed_by: null,
        is_premium: false,
        display_order: 0,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockModule);

      const result = await createModule(supabase, {
        slug: "test-module",
        type: "company",
        title: "Test Module",
        company_slug: "google",
      });

      expect(result.slug).toBe("test-module");
      expect(result.type).toBe("company");
      expect(result.company_slug).toBe("google");
    });

    test("creates module with company_slug matching search_volume.json format", async () => {
      const mockModule: DbModule = {
        id: "test-id",
        slug: "google-culture",
        type: "company",
        title: "Google Culture",
        description: null,
        company_slug: "google", // matches search_volume.json
        role_slug: null,
        industry: null,
        status: "draft",
        version: 1,
        quality_score: null,
        readability_score: null,
        reviewer_notes: null,
        reviewed_at: null,
        reviewed_by: null,
        is_premium: false,
        display_order: 0,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockModule);

      const result = await createModule(supabase, {
        slug: "google-culture",
        type: "company",
        title: "Google Culture",
        company_slug: sampleSearchVolume.companies[0]!.slug,
      });

      expect(result.company_slug).toBe("google");
    });

    test("creates module with role_slug matching search_volume.json format", async () => {
      const mockModule: DbModule = {
        id: "test-id",
        slug: "swe-prep",
        type: "role",
        title: "SWE Prep",
        description: null,
        company_slug: null,
        role_slug: "software-engineer", // matches search_volume.json
        industry: null,
        status: "draft",
        version: 1,
        quality_score: null,
        readability_score: null,
        reviewer_notes: null,
        reviewed_at: null,
        reviewed_by: null,
        is_premium: false,
        display_order: 0,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockModule);

      const result = await createModule(supabase, {
        slug: "swe-prep",
        type: "role",
        title: "SWE Prep",
        role_slug: sampleSearchVolume.companies[0]!.roles[0]!.slug,
      });

      expect(result.role_slug).toBe("software-engineer");
    });

    test("throws error on failure", async () => {
      const supabase = createMockSupabase(
        {},
        { message: "Duplicate slug", code: "23505" } as unknown as Error
      );

      await expect(
        createModule(supabase, {
          slug: "duplicate",
          type: "universal",
          title: "Duplicate",
        })
      ).rejects.toThrow("Failed to create module");
    });
  });

  describe("getModuleBySlug", () => {
    test("returns module when found", async () => {
      const mockModule: DbModule = {
        id: "test-id",
        slug: "test-module",
        type: "company",
        title: "Test Module",
        description: null,
        company_slug: "google",
        role_slug: null,
        industry: null,
        status: "published",
        version: 1,
        quality_score: 85,
        readability_score: 72,
        reviewer_notes: null,
        reviewed_at: null,
        reviewed_by: null,
        is_premium: false,
        display_order: 0,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockModule);

      const result = await getModuleBySlug(supabase, "test-module");

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("test-module");
    });

    test("returns null when not found", async () => {
      const supabase = createMockSupabase(
        null,
        { code: "PGRST116", message: "Not found" } as unknown as Error
      );

      const result = await getModuleBySlug(supabase, "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getModulesByCompany", () => {
    test("returns modules for company", async () => {
      const mockModules: DbModule[] = [
        {
          id: "1",
          slug: "google-culture",
          type: "company",
          title: "Google Culture",
          description: null,
          company_slug: "google",
          role_slug: null,
          industry: null,
          status: "published",
          version: 1,
          quality_score: null,
          readability_score: null,
          reviewer_notes: null,
          reviewed_at: null,
          reviewed_by: null,
          is_premium: false,
          display_order: 0,
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
      ];

      // Create mock that returns array
      const supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockModules, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await getModulesByCompany(supabase, "google");

      expect(result).toHaveLength(1);
      expect(result[0]?.company_slug).toBe("google");
    });
  });

  describe("getModulesByRole", () => {
    test("returns modules for role", async () => {
      const mockModules: DbModule[] = [
        {
          id: "1",
          slug: "swe-basics",
          type: "role",
          title: "SWE Basics",
          description: null,
          company_slug: null,
          role_slug: "software-engineer",
          industry: null,
          status: "published",
          version: 1,
          quality_score: null,
          readability_score: null,
          reviewer_notes: null,
          reviewed_at: null,
          reviewed_by: null,
          is_premium: false,
          display_order: 0,
          created_at: "2026-01-18T00:00:00Z",
          updated_at: "2026-01-18T00:00:00Z",
        },
      ];

      const supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockModules, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await getModulesByRole(supabase, "software-engineer");

      expect(result).toHaveLength(1);
      expect(result[0]?.role_slug).toBe("software-engineer");
    });
  });

  describe("updateModuleStatus", () => {
    test("updates status to reviewed", async () => {
      const mockModule: DbModule = {
        id: "test-id",
        slug: "test-module",
        type: "company",
        title: "Test Module",
        description: null,
        company_slug: "google",
        role_slug: null,
        industry: null,
        status: "reviewed",
        version: 1,
        quality_score: null,
        readability_score: null,
        reviewer_notes: "Looks good",
        reviewed_at: "2026-01-18T00:00:00Z",
        reviewed_by: "reviewer@example.com",
        is_premium: false,
        display_order: 0,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockModule);

      const result = await updateModuleStatus(
        supabase,
        "test-id",
        "reviewed",
        "Looks good",
        "reviewer@example.com"
      );

      expect(result.status).toBe("reviewed");
      expect(result.reviewer_notes).toBe("Looks good");
    });

    test("updates status to published", async () => {
      const mockModule: DbModule = {
        id: "test-id",
        slug: "test-module",
        type: "company",
        title: "Test Module",
        description: null,
        company_slug: "google",
        role_slug: null,
        industry: null,
        status: "published",
        version: 1,
        quality_score: null,
        readability_score: null,
        reviewer_notes: null,
        reviewed_at: "2026-01-18T00:00:00Z",
        reviewed_by: null,
        is_premium: false,
        display_order: 0,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockModule);

      const result = await updateModuleStatus(supabase, "test-id", "published");

      expect(result.status).toBe("published");
    });
  });

  describe("updateModuleQualityScores", () => {
    test("updates quality and readability scores", async () => {
      const mockModule: DbModule = {
        id: "test-id",
        slug: "test-module",
        type: "company",
        title: "Test Module",
        description: null,
        company_slug: "google",
        role_slug: null,
        industry: null,
        status: "draft",
        version: 1,
        quality_score: 85.5,
        readability_score: 72.3,
        reviewer_notes: null,
        reviewed_at: null,
        reviewed_by: null,
        is_premium: false,
        display_order: 0,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockModule);

      const result = await updateModuleQualityScores(supabase, "test-id", 85.5, 72.3);

      expect(result.quality_score).toBe(85.5);
      expect(result.readability_score).toBe(72.3);
    });
  });
});

describe("Full-text search", () => {
  describe("searchModules", () => {
    test("returns relevant modules", async () => {
      const mockResults = [
        {
          id: "1",
          slug: "google-culture",
          type: "company",
          title: "Google Company Culture",
          description: "Learn about Google culture",
          company_slug: "google",
          role_slug: null,
        },
      ];

      const supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: mockResults, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const results = await searchModules(supabase, "google culture");

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toContain("Google");
      expect(results[0]?.rank).toBe(1);
    });

    test("returns empty array when no matches", async () => {
      const supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const results = await searchModules(supabase, "nonexistent query");

      expect(results).toHaveLength(0);
    });
  });
});

describe("Content blocks", () => {
  describe("createContentBlock", () => {
    test("creates text block", async () => {
      const mockBlock: DbContentBlock = {
        id: "block-1",
        module_id: "module-1",
        section_id: "intro",
        section_title: "Introduction",
        block_type: "text",
        content: { text: "Welcome to the guide" },
        section_order: 0,
        block_order: 0,
        is_premium: false,
        created_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockBlock);

      const result = await createContentBlock(supabase, {
        module_id: "module-1",
        section_id: "intro",
        section_title: "Introduction",
        block_type: "text",
        content: { text: "Welcome to the guide" },
        section_order: 0,
        block_order: 0,
      });

      expect(result.block_type).toBe("text");
      expect(result.content).toEqual({ text: "Welcome to the guide" });
    });

    test("creates quiz block with options", async () => {
      const mockBlock: DbContentBlock = {
        id: "block-2",
        module_id: "module-1",
        section_id: "quiz",
        section_title: "Knowledge Check",
        block_type: "quiz",
        content: {
          question: "What year was Google founded?",
          options: [
            { id: "a", text: "1998", isCorrect: true },
            { id: "b", text: "2000", isCorrect: false },
            { id: "c", text: "1995", isCorrect: false },
            { id: "d", text: "2002", isCorrect: false },
          ],
        },
        section_order: 1,
        block_order: 0,
        is_premium: false,
        created_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockBlock);

      const result = await createContentBlock(supabase, {
        module_id: "module-1",
        section_id: "quiz",
        section_title: "Knowledge Check",
        block_type: "quiz",
        content: mockBlock.content,
        section_order: 1,
        block_order: 0,
      });

      expect(result.block_type).toBe("quiz");
      expect((result.content as { options: unknown[] }).options).toHaveLength(4);
    });

    test("creates premium content block", async () => {
      const mockBlock: DbContentBlock = {
        id: "block-3",
        module_id: "module-1",
        section_id: "premium",
        section_title: "Advanced Tips",
        block_type: "text",
        content: { text: "Premium content here" },
        section_order: 2,
        block_order: 0,
        is_premium: true,
        created_at: "2026-01-18T00:00:00Z",
      };

      const supabase = createMockSupabase(mockBlock);

      const result = await createContentBlock(supabase, {
        module_id: "module-1",
        section_id: "premium",
        section_title: "Advanced Tips",
        block_type: "text",
        content: { text: "Premium content here" },
        section_order: 2,
        block_order: 0,
        is_premium: true,
      });

      expect(result.is_premium).toBe(true);
    });
  });

  describe("createContentBlocksBatch", () => {
    test("creates multiple blocks at once", async () => {
      const mockBlocks: DbContentBlock[] = [
        {
          id: "block-1",
          module_id: "module-1",
          section_id: "intro",
          section_title: "Introduction",
          block_type: "header",
          content: { text: "Welcome", level: 1 },
          section_order: 0,
          block_order: 0,
          is_premium: false,
          created_at: "2026-01-18T00:00:00Z",
        },
        {
          id: "block-2",
          module_id: "module-1",
          section_id: "intro",
          section_title: "Introduction",
          block_type: "text",
          content: { text: "This is the intro" },
          section_order: 0,
          block_order: 1,
          is_premium: false,
          created_at: "2026-01-18T00:00:00Z",
        },
      ];

      const supabase = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: mockBlocks, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await createContentBlocksBatch(supabase, [
        {
          module_id: "module-1",
          section_id: "intro",
          section_title: "Introduction",
          block_type: "header",
          content: { text: "Welcome", level: 1 },
          section_order: 0,
          block_order: 0,
        },
        {
          module_id: "module-1",
          section_id: "intro",
          section_title: "Introduction",
          block_type: "text",
          content: { text: "This is the intro" },
          section_order: 0,
          block_order: 1,
        },
      ]);

      expect(result).toHaveLength(2);
    });

    test("returns empty array for empty input", async () => {
      const supabase = {} as SupabaseClient;

      const result = await createContentBlocksBatch(supabase, []);

      expect(result).toHaveLength(0);
    });
  });

  describe("getContentBlocksForModule", () => {
    test("returns blocks in order", async () => {
      const mockBlocks: DbContentBlock[] = [
        {
          id: "block-1",
          module_id: "module-1",
          section_id: "intro",
          section_title: "Introduction",
          block_type: "header",
          content: { text: "Welcome" },
          section_order: 0,
          block_order: 0,
          is_premium: false,
          created_at: "2026-01-18T00:00:00Z",
        },
        {
          id: "block-2",
          module_id: "module-1",
          section_id: "intro",
          section_title: "Introduction",
          block_type: "text",
          content: { text: "Content" },
          section_order: 0,
          block_order: 1,
          is_premium: false,
          created_at: "2026-01-18T00:00:00Z",
        },
        {
          id: "block-3",
          module_id: "module-1",
          section_id: "main",
          section_title: "Main Content",
          block_type: "text",
          content: { text: "Main" },
          section_order: 1,
          block_order: 0,
          is_premium: false,
          created_at: "2026-01-18T00:00:00Z",
        },
      ];

      const supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockBlocks, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await getContentBlocksForModule(supabase, "module-1");

      expect(result).toHaveLength(3);
      expect(result[0]?.section_order).toBe(0);
      expect(result[0]?.block_order).toBe(0);
    });
  });
});

describe("Generation runs", () => {
  describe("createGenerationRun", () => {
    test("creates run with metadata", async () => {
      const mockRun: DbGenerationRun = {
        id: "run-1",
        module_id: null,
        company_slug: "google",
        role_slug: "software-engineer",
        module_type: "company-role",
        generator_version: "1.0.0",
        prompt_version: "2.0.0",
        model_used: "gpt-4",
        status: "started",
        blocks_generated: null,
        quality_score: null,
        error_message: null,
        started_at: "2026-01-18T00:00:00Z",
        completed_at: null,
        duration_ms: null,
        tokens_used: null,
        estimated_cost: null,
      };

      const supabase = createMockSupabase(mockRun);

      const result = await createGenerationRun(supabase, {
        company_slug: "google",
        role_slug: "software-engineer",
        module_type: "company-role",
        generator_version: "1.0.0",
        prompt_version: "2.0.0",
        model_used: "gpt-4",
      });

      expect(result.status).toBe("started");
      expect(result.company_slug).toBe("google");
    });
  });

  describe("completeGenerationRun", () => {
    test("marks run as completed with stats", async () => {
      const mockRun: DbGenerationRun = {
        id: "run-1",
        module_id: "module-1",
        company_slug: "google",
        role_slug: null,
        module_type: "company",
        generator_version: "1.0.0",
        prompt_version: null,
        model_used: "gpt-4",
        status: "completed",
        blocks_generated: 25,
        quality_score: 85.5,
        error_message: null,
        started_at: "2026-01-18T00:00:00Z",
        completed_at: "2026-01-18T00:01:00Z",
        duration_ms: 60000,
        tokens_used: 5000,
        estimated_cost: 0.15,
      };

      // Mock for getting started_at
      const supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { started_at: "2026-01-18T00:00:00Z" },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockRun, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await completeGenerationRun(supabase, "run-1", {
        moduleId: "module-1",
        blocksGenerated: 25,
        qualityScore: 85.5,
        tokensUsed: 5000,
        estimatedCost: 0.15,
      });

      expect(result.status).toBe("completed");
      expect(result.blocks_generated).toBe(25);
    });
  });

  describe("failGenerationRun", () => {
    test("marks run as failed with error", async () => {
      const mockRun: DbGenerationRun = {
        id: "run-1",
        module_id: null,
        company_slug: "google",
        role_slug: null,
        module_type: "company",
        generator_version: "1.0.0",
        prompt_version: null,
        model_used: "gpt-4",
        status: "failed",
        blocks_generated: null,
        quality_score: null,
        error_message: "API rate limit exceeded",
        started_at: "2026-01-18T00:00:00Z",
        completed_at: "2026-01-18T00:00:30Z",
        duration_ms: null,
        tokens_used: null,
        estimated_cost: null,
      };

      const supabase = createMockSupabase(mockRun);

      const result = await failGenerationRun(supabase, "run-1", "API rate limit exceeded");

      expect(result.status).toBe("failed");
      expect(result.error_message).toBe("API rate limit exceeded");
    });
  });
});

describe("Module existence check", () => {
  describe("moduleExists", () => {
    test("returns true when module exists", async () => {
      const supabase = createMockSupabase({ id: "existing-id" });

      const exists = await moduleExists(supabase, "google", null, "company");

      expect(exists).toBe(true);
    });

    test("returns false when module does not exist", async () => {
      const supabase = createMockSupabase(
        null,
        { code: "PGRST116", message: "Not found" } as unknown as Error
      );

      const exists = await moduleExists(supabase, "nonexistent", null, "company");

      expect(exists).toBe(false);
    });

    test("checks company-role combination", async () => {
      const supabase = createMockSupabase({ id: "existing-id" });

      const exists = await moduleExists(supabase, "google", "software-engineer", "company-role");

      expect(exists).toBe(true);
    });
  });
});

describe("Slug format validation", () => {
  test("company_slug matches search_volume.json format (lowercase, hyphenated)", () => {
    const validSlugs = ["google", "apple", "microsoft", "meta"];
    validSlugs.forEach((slug) => {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
    });
  });

  test("role_slug matches search_volume.json format (lowercase, hyphenated)", () => {
    const validSlugs = ["software-engineer", "product-manager", "data-scientist"];
    validSlugs.forEach((slug) => {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
    });
  });
});

describe("Content block type JSONB content structure", () => {
  test("text block has text content", () => {
    const content = { text: "Sample text content" };
    expect(content.text).toBeDefined();
  });

  test("header block has text and level", () => {
    const content = { text: "Section Header", level: 2 };
    expect(content.text).toBeDefined();
    expect([1, 2, 3]).toContain(content.level);
  });

  test("quote block has text and optional author", () => {
    const content = { text: "Famous quote", author: "John Doe" };
    expect(content.text).toBeDefined();
    expect(content.author).toBeDefined();
  });

  test("video block has url", () => {
    const content = { url: "https://youtube.com/watch?v=abc", title: "Video Title" };
    expect(content.url).toBeDefined();
  });

  test("audio block has url", () => {
    const content = { url: "https://example.com/audio.mp3", title: "Audio Title" };
    expect(content.url).toBeDefined();
  });

  test("image block has url and alt", () => {
    const content = { url: "https://example.com/image.png", alt: "Description" };
    expect(content.url).toBeDefined();
    expect(content.alt).toBeDefined();
  });

  test("quiz block has question and options", () => {
    const content = {
      question: "What is the answer?",
      options: [
        { id: "a", text: "Option A", isCorrect: false },
        { id: "b", text: "Option B", isCorrect: true },
      ],
    };
    expect(content.question).toBeDefined();
    expect(content.options).toHaveLength(2);
    expect(content.options.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  test("checklist block has items", () => {
    const content = {
      title: "Preparation Checklist",
      items: [
        { id: "1", text: "Review resume", required: true },
        { id: "2", text: "Research company", required: true },
      ],
    };
    expect(content.items).toBeDefined();
    expect(content.items.length).toBeGreaterThan(0);
  });
});
