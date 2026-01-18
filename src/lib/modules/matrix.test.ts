import {
  getModulesForPosition,
  splitByAccess,
  createEmptyRegistry,
  type ModuleRegistry,
} from "./matrix";
import type { Module, Company, Role } from "@/types";

// Test data factories
function createModule(overrides: Partial<Module> = {}): Module {
  return {
    id: "test-module",
    slug: "test",
    type: "universal",
    title: "Test Module",
    sections: [],
    isPremium: false,
    order: 1,
    ...overrides,
  };
}

function createCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "test-company",
    slug: "test-company",
    name: "Test Company",
    industry: "tech",
    ...overrides,
  };
}

function createRole(overrides: Partial<Role> = {}): Role {
  return {
    id: "test-role",
    slug: "test-role",
    name: "Test Role",
    category: "engineering",
    ...overrides,
  };
}

describe("getModulesForPosition", () => {
  const anyCompany = createCompany();
  const anyRole = createRole();

  test("returns universal modules for any position", () => {
    const registry = createEmptyRegistry();
    registry.universal = [
      createModule({ id: "universal-1", type: "universal" }),
    ];

    const modules = getModulesForPosition(anyCompany, anyRole, registry);
    expect(modules.some((m) => m.type === "universal")).toBe(true);
  });

  test("returns modules in correct order (universal -> industry -> role -> company -> company-role)", () => {
    const techCompany = createCompany({ slug: "google", industry: "tech" });
    const sweRole = createRole({ slug: "swe", category: "engineering" });

    const registry: ModuleRegistry = {
      universal: [createModule({ id: "u1", type: "universal", order: 1 })],
      industry: [
        createModule({
          id: "i1",
          type: "industry",
          industry: "tech",
          order: 1,
        }),
      ],
      role: [
        createModule({
          id: "r1",
          type: "role",
          roleCategory: "engineering",
          order: 1,
        }),
      ],
      company: [
        createModule({
          id: "c1",
          type: "company",
          companySlug: "google",
          order: 1,
        }),
      ],
      "company-role": [
        createModule({
          id: "cr1",
          type: "company-role",
          companySlug: "google",
          roleSlug: "swe",
          order: 1,
        }),
      ],
    };

    const modules = getModulesForPosition(techCompany, sweRole, registry);
    const types = modules.map((m) => m.type);

    // Find indices of each type
    const typeOrder = [
      "universal",
      "industry",
      "role",
      "company",
      "company-role",
    ] as const;
    const indices = typeOrder
      .map((t) => types.indexOf(t))
      .filter((i) => i !== -1);

    // Indices should be in ascending order
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]!);
    }
  });

  test("handles empty registry gracefully", () => {
    const modules = getModulesForPosition(
      anyCompany,
      anyRole,
      createEmptyRegistry()
    );
    expect(modules).toEqual([]);
  });

  test("handles missing module types gracefully", () => {
    const unknownCompany = createCompany({
      slug: "unknown",
      industry: "other",
    });
    const registry = createEmptyRegistry();
    registry.universal = [
      createModule({ id: "u1", type: "universal", order: 1 }),
    ];

    const modules = getModulesForPosition(unknownCompany, anyRole, registry);
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.every((m) => m.type === "universal")).toBe(true);
  });

  test("sorts modules within same type by order field", () => {
    const registry = createEmptyRegistry();
    registry.universal = [
      createModule({ id: "u3", type: "universal", order: 3 }),
      createModule({ id: "u1", type: "universal", order: 1 }),
      createModule({ id: "u2", type: "universal", order: 2 }),
    ];

    const modules = getModulesForPosition(anyCompany, anyRole, registry);
    const orders = modules.map((m) => m.order);

    expect(orders).toEqual([1, 2, 3]);
  });

  test("filters industry modules by company industry", () => {
    const techCompany = createCompany({ industry: "tech" });
    const registry = createEmptyRegistry();
    registry.industry = [
      createModule({ id: "tech", type: "industry", industry: "tech", order: 1 }),
      createModule({
        id: "finance",
        type: "industry",
        industry: "finance",
        order: 1,
      }),
    ];

    const modules = getModulesForPosition(techCompany, anyRole, registry);
    expect(modules.length).toBe(1);
    expect(modules[0]!.id).toBe("tech");
  });

  test("filters role modules by role category", () => {
    const engineeringRole = createRole({ category: "engineering" });
    const registry = createEmptyRegistry();
    registry.role = [
      createModule({
        id: "eng",
        type: "role",
        roleCategory: "engineering",
        order: 1,
      }),
      createModule({
        id: "product",
        type: "role",
        roleCategory: "product",
        order: 1,
      }),
    ];

    const modules = getModulesForPosition(anyCompany, engineeringRole, registry);
    expect(modules.length).toBe(1);
    expect(modules[0]!.id).toBe("eng");
  });

  test("filters company modules by company slug", () => {
    const google = createCompany({ slug: "google" });
    const registry = createEmptyRegistry();
    registry.company = [
      createModule({
        id: "google-mod",
        type: "company",
        companySlug: "google",
        order: 1,
      }),
      createModule({
        id: "meta-mod",
        type: "company",
        companySlug: "meta",
        order: 1,
      }),
    ];

    const modules = getModulesForPosition(google, anyRole, registry);
    expect(modules.length).toBe(1);
    expect(modules[0]!.id).toBe("google-mod");
  });

  test("filters company-role modules by both company and role slug", () => {
    const google = createCompany({ slug: "google" });
    const swe = createRole({ slug: "swe" });
    const registry = createEmptyRegistry();
    registry["company-role"] = [
      createModule({
        id: "google-swe",
        type: "company-role",
        companySlug: "google",
        roleSlug: "swe",
        order: 1,
      }),
      createModule({
        id: "google-pm",
        type: "company-role",
        companySlug: "google",
        roleSlug: "pm",
        order: 1,
      }),
      createModule({
        id: "meta-swe",
        type: "company-role",
        companySlug: "meta",
        roleSlug: "swe",
        order: 1,
      }),
    ];

    const modules = getModulesForPosition(google, swe, registry);
    expect(modules.length).toBe(1);
    expect(modules[0]!.id).toBe("google-swe");
  });
});

describe("splitByAccess", () => {
  test("separates free and premium modules", () => {
    const modules = [
      createModule({ id: "1", isPremium: false }),
      createModule({ id: "2", isPremium: true }),
      createModule({ id: "3", isPremium: false }),
    ];

    const { free, premium } = splitByAccess(modules);
    expect(free.length).toBe(2);
    expect(premium.length).toBe(1);
  });

  test("handles all-free modules", () => {
    const modules = [
      createModule({ id: "1", isPremium: false }),
      createModule({ id: "2", isPremium: false }),
    ];

    const { free, premium } = splitByAccess(modules);
    expect(free.length).toBe(2);
    expect(premium.length).toBe(0);
  });

  test("handles all-premium modules", () => {
    const modules = [
      createModule({ id: "1", isPremium: true }),
      createModule({ id: "2", isPremium: true }),
    ];

    const { free, premium } = splitByAccess(modules);
    expect(free.length).toBe(0);
    expect(premium.length).toBe(2);
  });

  test("handles empty array", () => {
    const { free, premium } = splitByAccess([]);
    expect(free.length).toBe(0);
    expect(premium.length).toBe(0);
  });

  test("maintains original order within each group", () => {
    const modules = [
      createModule({ id: "free-1", isPremium: false }),
      createModule({ id: "premium-1", isPremium: true }),
      createModule({ id: "free-2", isPremium: false }),
      createModule({ id: "premium-2", isPremium: true }),
    ];

    const { free, premium } = splitByAccess(modules);
    expect(free.map((m) => m.id)).toEqual(["free-1", "free-2"]);
    expect(premium.map((m) => m.id)).toEqual(["premium-1", "premium-2"]);
  });
});
