/**
 * Tests for routing data functions
 */

import {
  getAllCompanies,
  getCompanyBySlug,
  getRoleBySlug,
  getTopCompanyRoleCombos,
  getAllCompanySlugs,
  validateCompanyRoute,
  validateCompanyRoleRoute,
  normalizeSlug,
} from "../data";

describe("getAllCompanies", () => {
  test("returns array of companies", () => {
    const companies = getAllCompanies();
    expect(Array.isArray(companies)).toBe(true);
    expect(companies.length).toBeGreaterThan(0);
  });

  test("each company has required fields", () => {
    const companies = getAllCompanies();
    for (const company of companies) {
      expect(company).toHaveProperty("name");
      expect(company).toHaveProperty("slug");
      expect(company).toHaveProperty("category");
      expect(company).toHaveProperty("roles");
      expect(Array.isArray(company.roles)).toBe(true);
    }
  });
});

describe("getCompanyBySlug", () => {
  test("returns company for valid slug", () => {
    const company = getCompanyBySlug("google");
    expect(company).toBeDefined();
    expect(company?.name).toBe("Google");
  });

  test("returns company for uppercase slug (case-insensitive)", () => {
    const company = getCompanyBySlug("GOOGLE");
    expect(company).toBeDefined();
    expect(company?.name).toBe("Google");
  });

  test("returns company for mixed case slug", () => {
    const company = getCompanyBySlug("GoOgLe");
    expect(company).toBeDefined();
    expect(company?.name).toBe("Google");
  });

  test("returns undefined for invalid slug", () => {
    const company = getCompanyBySlug("invalid-company");
    expect(company).toBeUndefined();
  });

  test("returns undefined for empty slug", () => {
    const company = getCompanyBySlug("");
    expect(company).toBeUndefined();
  });
});

describe("getRoleBySlug", () => {
  test("returns role for valid company and role slug", () => {
    const company = getCompanyBySlug("google");
    expect(company).toBeDefined();
    const role = getRoleBySlug(company!, "software-engineer");
    expect(role).toBeDefined();
    expect(role?.name).toBe("Software Engineer");
  });

  test("returns role for uppercase role slug (case-insensitive)", () => {
    const company = getCompanyBySlug("google");
    expect(company).toBeDefined();
    const role = getRoleBySlug(company!, "SOFTWARE-ENGINEER");
    expect(role).toBeDefined();
    expect(role?.name).toBe("Software Engineer");
  });

  test("returns role for mixed case role slug", () => {
    const company = getCompanyBySlug("google");
    expect(company).toBeDefined();
    const role = getRoleBySlug(company!, "Software-Engineer");
    expect(role).toBeDefined();
    expect(role?.name).toBe("Software Engineer");
  });

  test("returns undefined for invalid role slug", () => {
    const company = getCompanyBySlug("google");
    expect(company).toBeDefined();
    const role = getRoleBySlug(company!, "invalid-role");
    expect(role).toBeUndefined();
  });
});

describe("getTopCompanyRoleCombos", () => {
  test("returns array of company/role combinations", () => {
    const combos = getTopCompanyRoleCombos(10);
    expect(Array.isArray(combos)).toBe(true);
    expect(combos.length).toBeLessThanOrEqual(10);
  });

  test("each combo has required fields", () => {
    const combos = getTopCompanyRoleCombos(10);
    for (const combo of combos) {
      expect(combo).toHaveProperty("companySlug");
      expect(combo).toHaveProperty("roleSlug");
      expect(combo).toHaveProperty("score");
      expect(typeof combo.companySlug).toBe("string");
      expect(typeof combo.roleSlug).toBe("string");
      expect(typeof combo.score).toBe("number");
    }
  });

  test("combos are sorted by score descending", () => {
    const combos = getTopCompanyRoleCombos(10);
    for (let i = 1; i < combos.length; i++) {
      expect(combos[i - 1]!.score).toBeGreaterThanOrEqual(combos[i]!.score);
    }
  });

  test("limits results to specified count", () => {
    const combos5 = getTopCompanyRoleCombos(5);
    expect(combos5.length).toBeLessThanOrEqual(5);

    const combos100 = getTopCompanyRoleCombos(100);
    expect(combos100.length).toBeLessThanOrEqual(100);
  });

  test("default limit is 100", () => {
    const combos = getTopCompanyRoleCombos();
    expect(combos.length).toBeLessThanOrEqual(100);
  });
});

describe("getAllCompanySlugs", () => {
  test("returns array of strings", () => {
    const slugs = getAllCompanySlugs();
    expect(Array.isArray(slugs)).toBe(true);
    for (const slug of slugs) {
      expect(typeof slug).toBe("string");
    }
  });

  test("slugs are lowercase", () => {
    const slugs = getAllCompanySlugs();
    for (const slug of slugs) {
      expect(slug).toBe(slug.toLowerCase());
    }
  });

  test("includes known companies", () => {
    const slugs = getAllCompanySlugs();
    expect(slugs).toContain("google");
    expect(slugs).toContain("apple");
    expect(slugs).toContain("microsoft");
  });
});

describe("validateCompanyRoute", () => {
  test("valid lowercase company returns isValid=true", () => {
    const result = validateCompanyRoute("google");
    expect(result.isValid).toBe(true);
    expect(result.company).toBeDefined();
    expect(result.company?.name).toBe("Google");
    expect(result.canonicalPath).toBe("/google");
    expect(result.needsRedirect).toBe(false);
  });

  test("uppercase company slug needs redirect", () => {
    const result = validateCompanyRoute("GOOGLE");
    expect(result.isValid).toBe(true);
    expect(result.company).toBeDefined();
    expect(result.needsRedirect).toBe(true);
    expect(result.canonicalPath).toBe("/google");
  });

  test("mixed case company slug needs redirect", () => {
    const result = validateCompanyRoute("GoOgLe");
    expect(result.isValid).toBe(true);
    expect(result.needsRedirect).toBe(true);
    expect(result.canonicalPath).toBe("/google");
  });

  test("invalid company returns isValid=false", () => {
    const result = validateCompanyRoute("invalid-company");
    expect(result.isValid).toBe(false);
    expect(result.company).toBeNull();
    expect(result.canonicalPath).toBeNull();
    expect(result.needsRedirect).toBe(false);
  });

  test("empty company returns isValid=false", () => {
    const result = validateCompanyRoute("");
    expect(result.isValid).toBe(false);
  });
});

describe("validateCompanyRoleRoute", () => {
  test("valid lowercase company and role returns isValid=true", () => {
    const result = validateCompanyRoleRoute("google", "software-engineer");
    expect(result.isValid).toBe(true);
    expect(result.company).toBeDefined();
    expect(result.role).toBeDefined();
    expect(result.company?.name).toBe("Google");
    expect(result.role?.name).toBe("Software Engineer");
    expect(result.canonicalPath).toBe("/google/software-engineer");
    expect(result.needsRedirect).toBe(false);
  });

  test("uppercase company slug needs redirect", () => {
    const result = validateCompanyRoleRoute("GOOGLE", "software-engineer");
    expect(result.isValid).toBe(true);
    expect(result.needsRedirect).toBe(true);
    expect(result.canonicalPath).toBe("/google/software-engineer");
  });

  test("uppercase role slug needs redirect", () => {
    const result = validateCompanyRoleRoute("google", "SOFTWARE-ENGINEER");
    expect(result.isValid).toBe(true);
    expect(result.needsRedirect).toBe(true);
    expect(result.canonicalPath).toBe("/google/software-engineer");
  });

  test("mixed case both slugs need redirect", () => {
    const result = validateCompanyRoleRoute("GoOgLe", "Software-Engineer");
    expect(result.isValid).toBe(true);
    expect(result.needsRedirect).toBe(true);
    expect(result.canonicalPath).toBe("/google/software-engineer");
  });

  test("invalid company returns isValid=false", () => {
    const result = validateCompanyRoleRoute("invalid-company", "software-engineer");
    expect(result.isValid).toBe(false);
    expect(result.company).toBeNull();
    expect(result.role).toBeNull();
    expect(result.canonicalPath).toBeNull();
  });

  test("valid company but invalid role returns isValid=false", () => {
    const result = validateCompanyRoleRoute("google", "invalid-role");
    expect(result.isValid).toBe(false);
    expect(result.company).toBeDefined(); // Company is valid
    expect(result.role).toBeNull(); // Role is not
    expect(result.canonicalPath).toBeNull();
  });

  test("empty company returns isValid=false", () => {
    const result = validateCompanyRoleRoute("", "software-engineer");
    expect(result.isValid).toBe(false);
  });

  test("empty role returns isValid=false", () => {
    const result = validateCompanyRoleRoute("google", "");
    expect(result.isValid).toBe(false);
  });
});

describe("normalizeSlug", () => {
  test("converts to lowercase", () => {
    expect(normalizeSlug("GOOGLE")).toBe("google");
    expect(normalizeSlug("GoOgLe")).toBe("google");
  });

  test("trims whitespace", () => {
    expect(normalizeSlug("  google  ")).toBe("google");
  });

  test("preserves hyphens", () => {
    expect(normalizeSlug("SOFTWARE-ENGINEER")).toBe("software-engineer");
  });

  test("handles empty string", () => {
    expect(normalizeSlug("")).toBe("");
  });
});

describe("integration: company/role validation chain", () => {
  test("all companies have at least one role", () => {
    const companies = getAllCompanies();
    for (const company of companies) {
      expect(company.roles.length).toBeGreaterThan(0);
    }
  });

  test("all company/role combos in top list are valid", () => {
    const combos = getTopCompanyRoleCombos(100);
    for (const combo of combos) {
      const result = validateCompanyRoleRoute(combo.companySlug, combo.roleSlug);
      expect(result.isValid).toBe(true);
      expect(result.needsRedirect).toBe(false); // Already normalized
    }
  });

  test("company slugs from getAllCompanySlugs are valid", () => {
    const slugs = getAllCompanySlugs();
    for (const slug of slugs) {
      const result = validateCompanyRoute(slug);
      expect(result.isValid).toBe(true);
      expect(result.needsRedirect).toBe(false);
    }
  });
});
