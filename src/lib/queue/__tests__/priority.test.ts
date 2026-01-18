/**
 * Tests for priority calculation logic
 * Issue #32 - Generation priority queue system
 */

import {
  loadSearchVolumeData,
  getPriorityScore,
  getPriorityEntriesForCompany,
  buildQueueItemsForCompany,
  buildQueueItemsFromSearchVolume,
  getAllCompanySlugs,
  getAllRoleSlugs,
  isValidCompanySlug,
  isValidRoleSlug,
  createQueueItemWithPriority,
} from "../priority";
import type { SearchVolumeData } from "../types";

// Mock data for testing
const mockSearchVolumeData: SearchVolumeData = {
  generated_at: "2026-01-17T17:10:00Z",
  geography: "US",
  status: "complete",
  companies: [
    {
      name: "Google",
      slug: "google",
      category: "Big Tech",
      interview_volume: 85,
      roles: [
        { name: "Software Engineer", slug: "software-engineer", volume: 72 },
        { name: "Product Manager", slug: "product-manager", volume: 65 },
      ],
    },
    {
      name: "Apple",
      slug: "apple",
      category: "Big Tech",
      interview_volume: 78,
      roles: [
        { name: "Software Engineer", slug: "software-engineer", volume: 68 },
        { name: "Product Manager", slug: "product-manager", volume: 55 },
      ],
    },
    {
      name: "Microsoft",
      slug: "microsoft",
      category: "Big Tech",
      interview_volume: 70,
      roles: [
        { name: "Software Engineer", slug: "software-engineer", volume: 62 },
        { name: "Product Manager", slug: "product-manager", volume: 48 },
      ],
    },
  ],
  priority_list: [
    { company: "google", role: null, score: 85 },
    { company: "apple", role: null, score: 78 },
    { company: "google", role: "software-engineer", score: 72 },
    { company: "microsoft", role: null, score: 70 },
    { company: "apple", role: "software-engineer", score: 68 },
    { company: "google", role: "product-manager", score: 65 },
    { company: "microsoft", role: "software-engineer", score: 62 },
    { company: "apple", role: "product-manager", score: 55 },
    { company: "microsoft", role: "product-manager", score: 48 },
  ],
};

describe("Priority calculation", () => {
  describe("loadSearchVolumeData", () => {
    test("loads data from file", () => {
      const data = loadSearchVolumeData();
      expect(data).toBeDefined();
      expect(data.companies).toBeInstanceOf(Array);
      expect(data.priority_list).toBeInstanceOf(Array);
    });
  });

  describe("getPriorityScore", () => {
    test("returns score for company-only entry", () => {
      const score = getPriorityScore("google", null, mockSearchVolumeData);
      expect(score).toBe(85);
    });

    test("returns score for company+role entry", () => {
      const score = getPriorityScore(
        "google",
        "software-engineer",
        mockSearchVolumeData
      );
      expect(score).toBe(72);
    });

    test("returns 0 for non-existent company", () => {
      const score = getPriorityScore("unknown", null, mockSearchVolumeData);
      expect(score).toBe(0);
    });

    test("returns 0 for non-existent role", () => {
      const score = getPriorityScore(
        "google",
        "unknown-role",
        mockSearchVolumeData
      );
      expect(score).toBe(0);
    });

    test("distinguishes between company-only and company+role", () => {
      const companyScore = getPriorityScore("apple", null, mockSearchVolumeData);
      const roleScore = getPriorityScore(
        "apple",
        "software-engineer",
        mockSearchVolumeData
      );
      expect(companyScore).toBe(78);
      expect(roleScore).toBe(68);
    });
  });

  describe("getPriorityEntriesForCompany", () => {
    test("returns all entries for a company", () => {
      const entries = getPriorityEntriesForCompany("google", mockSearchVolumeData);
      expect(entries).toHaveLength(3);
      expect(entries.map((e) => e.role)).toContain(null);
      expect(entries.map((e) => e.role)).toContain("software-engineer");
      expect(entries.map((e) => e.role)).toContain("product-manager");
    });

    test("returns empty array for non-existent company", () => {
      const entries = getPriorityEntriesForCompany("unknown", mockSearchVolumeData);
      expect(entries).toHaveLength(0);
    });
  });

  describe("buildQueueItemsForCompany", () => {
    test("builds items for all roles", () => {
      const items = buildQueueItemsForCompany("google", undefined, mockSearchVolumeData);
      expect(items).toHaveLength(3);

      // Company-only item
      const companyItem = items.find((i) => i.role_slug === null);
      expect(companyItem).toBeDefined();
      expect(companyItem?.priority_score).toBe(85);

      // Role items
      const swe = items.find((i) => i.role_slug === "software-engineer");
      expect(swe).toBeDefined();
      expect(swe?.priority_score).toBe(72);
    });

    test("builds items for specific roles only", () => {
      const items = buildQueueItemsForCompany(
        "google",
        ["software-engineer"],
        mockSearchVolumeData
      );
      expect(items).toHaveLength(2); // company-only + 1 role

      const roles = items.filter((i) => i.role_slug !== null);
      expect(roles).toHaveLength(1);
      expect(roles[0]?.role_slug).toBe("software-engineer");
    });

    test("returns item with 0 priority for unknown company", () => {
      const items = buildQueueItemsForCompany("unknown", undefined, mockSearchVolumeData);
      expect(items).toHaveLength(1);
      expect(items[0]?.company_slug).toBe("unknown");
      expect(items[0]?.priority_score).toBe(0);
    });
  });

  describe("buildQueueItemsFromSearchVolume", () => {
    test("builds items from all priority entries", () => {
      const items = buildQueueItemsFromSearchVolume(0, mockSearchVolumeData);
      expect(items).toHaveLength(9);
    });

    test("filters by minimum priority", () => {
      const items = buildQueueItemsFromSearchVolume(70, mockSearchVolumeData);
      expect(items).toHaveLength(4);
      expect(items.every((i) => (i.priority_score ?? 0) >= 70)).toBe(true);
    });

    test("returns empty array when min priority is too high", () => {
      const items = buildQueueItemsFromSearchVolume(100, mockSearchVolumeData);
      expect(items).toHaveLength(0);
    });
  });

  describe("getAllCompanySlugs", () => {
    test("returns all company slugs", () => {
      const slugs = getAllCompanySlugs(mockSearchVolumeData);
      expect(slugs).toContain("google");
      expect(slugs).toContain("apple");
      expect(slugs).toContain("microsoft");
      expect(slugs).toHaveLength(3);
    });
  });

  describe("getAllRoleSlugs", () => {
    test("returns unique role slugs", () => {
      const slugs = getAllRoleSlugs(mockSearchVolumeData);
      expect(slugs).toContain("software-engineer");
      expect(slugs).toContain("product-manager");
      expect(slugs).toHaveLength(2);
    });
  });

  describe("isValidCompanySlug", () => {
    test("returns true for valid company", () => {
      expect(isValidCompanySlug("google", mockSearchVolumeData)).toBe(true);
    });

    test("returns false for invalid company", () => {
      expect(isValidCompanySlug("unknown", mockSearchVolumeData)).toBe(false);
    });
  });

  describe("isValidRoleSlug", () => {
    test("returns true for valid role", () => {
      expect(
        isValidRoleSlug("google", "software-engineer", mockSearchVolumeData)
      ).toBe(true);
    });

    test("returns false for invalid role", () => {
      expect(isValidRoleSlug("google", "unknown-role", mockSearchVolumeData)).toBe(
        false
      );
    });

    test("returns false for valid role on wrong company", () => {
      // This tests that roles are company-specific
      expect(isValidRoleSlug("unknown", "software-engineer", mockSearchVolumeData)).toBe(
        false
      );
    });
  });

  describe("createQueueItemWithPriority", () => {
    test("creates item with specified priority", () => {
      const item = createQueueItemWithPriority("google", "software-engineer", 99);
      expect(item.company_slug).toBe("google");
      expect(item.role_slug).toBe("software-engineer");
      expect(item.priority_score).toBe(99);
    });

    test("creates item with null role", () => {
      const item = createQueueItemWithPriority("google", null, 50);
      expect(item.role_slug).toBeNull();
    });
  });
});

describe("Slug format validation", () => {
  test("company_slug matches search_volume.json format", () => {
    const data = loadSearchVolumeData();
    for (const company of data.companies) {
      // Slugs should be lowercase, hyphenated
      expect(company.slug).toMatch(/^[a-z0-9-]+$/);
      expect(company.slug).toBe(company.slug.toLowerCase());
    }
  });

  test("role_slug matches search_volume.json format", () => {
    const data = loadSearchVolumeData();
    for (const company of data.companies) {
      for (const role of company.roles) {
        // Slugs should be lowercase, hyphenated
        expect(role.slug).toMatch(/^[a-z0-9-]+$/);
        expect(role.slug).toBe(role.slug.toLowerCase());
      }
    }
  });
});
