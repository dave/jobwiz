/**
 * Tests for carousel module loader
 */

import {
  loadCarouselModules,
  hasCompanyRoleModule,
  getModuleOrderIndex,
} from "../load-modules";

describe("loadCarouselModules", () => {
  describe("for google/software-engineer", () => {
    it("returns modules in correct order: universal → company → role → company-role", () => {
      const result = loadCarouselModules("google", "software-engineer");

      expect(result.allModules.length).toBeGreaterThan(0);

      // Check module types are in order
      const types = result.allModules.map((m) => m.type);
      const typeOrder = ["universal", "company", "role", "company-role"];

      let lastIndex = -1;
      for (const type of types) {
        const currentIndex = typeOrder.indexOf(type);
        expect(currentIndex).toBeGreaterThanOrEqual(lastIndex);
        lastIndex = currentIndex;
      }
    });

    it("returns universal modules as freeModules", () => {
      const result = loadCarouselModules("google", "software-engineer");

      expect(result.freeModules.length).toBeGreaterThan(0);
      for (const mod of result.freeModules) {
        expect(mod.type).toBe("universal");
      }
    });

    it("returns company, role, and company-role modules as premiumModules", () => {
      const result = loadCarouselModules("google", "software-engineer");

      expect(result.premiumModules.length).toBeGreaterThan(0);
      for (const mod of result.premiumModules) {
        expect(["company", "role", "company-role"]).toContain(mod.type);
      }
    });

    it("includes google company module", () => {
      const result = loadCarouselModules("google", "software-engineer");

      const companyModule = result.allModules.find(
        (m) => m.type === "company" && m.companySlug === "google"
      );
      expect(companyModule).toBeDefined();
      expect(companyModule?.slug).toBe("company-google");
    });

    it("includes software-engineer role module", () => {
      const result = loadCarouselModules("google", "software-engineer");

      const roleModule = result.allModules.find(
        (m) => m.type === "role" && m.roleSlug === "software-engineer"
      );
      expect(roleModule).toBeDefined();
      expect(roleModule?.slug).toBe("role-software-engineer");
    });

    it("includes google-software-engineer company-role module", () => {
      const result = loadCarouselModules("google", "software-engineer");

      const companyRoleModule = result.allModules.find(
        (m) =>
          m.type === "company-role" &&
          m.companySlug === "google" &&
          m.roleSlug === "software-engineer"
      );
      expect(companyRoleModule).toBeDefined();
      expect(companyRoleModule?.slug).toBe(
        "company-role-google-software-engineer"
      );
    });

    it("does not include industry modules", () => {
      const result = loadCarouselModules("google", "software-engineer");

      const industryModules = result.allModules.filter(
        (m) => m.type === "industry"
      );
      expect(industryModules.length).toBe(0);
    });

    it("splits modules correctly at paywall", () => {
      const result = loadCarouselModules("google", "software-engineer");

      // Free modules should only be universal
      const freeTypes = new Set(result.freeModules.map((m) => m.type));
      expect(freeTypes.size).toBe(1);
      expect(freeTypes.has("universal")).toBe(true);

      // Premium modules should not include universal
      const premiumTypes = new Set(result.premiumModules.map((m) => m.type));
      expect(premiumTypes.has("universal")).toBe(false);
    });

    it("allModules equals freeModules + premiumModules", () => {
      const result = loadCarouselModules("google", "software-engineer");

      const combined = [...result.freeModules, ...result.premiumModules];
      expect(combined.length).toBe(result.allModules.length);

      // Same slugs in same order
      expect(combined.map((m) => m.slug)).toEqual(
        result.allModules.map((m) => m.slug)
      );
    });
  });

  describe("for amazon/product-manager", () => {
    it("returns correct modules for different company/role", () => {
      const result = loadCarouselModules("amazon", "product-manager");

      expect(result.allModules.length).toBeGreaterThan(0);

      const companyModule = result.allModules.find(
        (m) => m.type === "company" && m.companySlug === "amazon"
      );
      expect(companyModule).toBeDefined();

      const roleModule = result.allModules.find(
        (m) => m.type === "role" && m.roleSlug === "product-manager"
      );
      expect(roleModule).toBeDefined();
    });
  });

  describe("for non-existent company/role", () => {
    it("returns universal modules even when company does not exist", () => {
      const result = loadCarouselModules(
        "nonexistent-company",
        "software-engineer"
      );

      expect(result.freeModules.length).toBeGreaterThan(0);
      expect(result.freeModules.every((m) => m.type === "universal")).toBe(
        true
      );
    });

    it("returns empty premium modules when company-role does not exist", () => {
      const result = loadCarouselModules(
        "nonexistent-company",
        "nonexistent-role"
      );

      // Should have no company, role, or company-role modules
      expect(
        result.premiumModules.filter((m) => m.type === "company").length
      ).toBe(0);
      expect(
        result.premiumModules.filter((m) => m.type === "role").length
      ).toBe(0);
      expect(
        result.premiumModules.filter((m) => m.type === "company-role").length
      ).toBe(0);
    });
  });

  describe("module structure", () => {
    it("modules have required fields", () => {
      const result = loadCarouselModules("google", "software-engineer");

      for (const mod of result.allModules) {
        expect(mod.id).toBeDefined();
        expect(mod.slug).toBeDefined();
        expect(mod.type).toBeDefined();
        expect(mod.title).toBeDefined();
        expect(mod.sections).toBeDefined();
        expect(Array.isArray(mod.sections)).toBe(true);
        expect(typeof mod.isPremium).toBe("boolean");
        expect(typeof mod.order).toBe("number");
      }
    });

    it("universal modules are not premium", () => {
      const result = loadCarouselModules("google", "software-engineer");

      for (const mod of result.freeModules) {
        expect(mod.isPremium).toBe(false);
      }
    });

    it("premium modules have isPremium true", () => {
      const result = loadCarouselModules("google", "software-engineer");

      for (const mod of result.premiumModules) {
        expect(mod.isPremium).toBe(true);
      }
    });
  });
});

describe("hasCompanyRoleModule", () => {
  it("returns true for existing company-role", () => {
    expect(hasCompanyRoleModule("google", "software-engineer")).toBe(true);
  });

  it("returns false for non-existent company-role", () => {
    expect(
      hasCompanyRoleModule("nonexistent-company", "nonexistent-role")
    ).toBe(false);
  });

  it("returns false for partial match", () => {
    // Google exists, but not with this role
    expect(hasCompanyRoleModule("google", "nonexistent-role")).toBe(false);
  });
});

describe("getModuleOrderIndex", () => {
  it("returns correct order for universal", () => {
    expect(getModuleOrderIndex("universal")).toBe(0);
  });

  it("returns correct order for company", () => {
    expect(getModuleOrderIndex("company")).toBe(1);
  });

  it("returns correct order for role", () => {
    expect(getModuleOrderIndex("role")).toBe(2);
  });

  it("returns correct order for company-role", () => {
    expect(getModuleOrderIndex("company-role")).toBe(3);
  });

  it("returns high index for industry (skipped type)", () => {
    expect(getModuleOrderIndex("industry")).toBe(4);
  });
});
