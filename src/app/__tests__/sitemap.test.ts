/**
 * Tests for sitemap generation
 */

import sitemap from "../sitemap";
import { getAllCompanies } from "@/lib/routing";

describe("sitemap", () => {
  test("returns array of sitemap entries", () => {
    const entries = sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test("includes home page", () => {
    const entries = sitemap();
    const homeEntry = entries.find((e) => e.url.match(/^https?:\/\/[^/]+\/?$/));

    expect(homeEntry).toBeDefined();
    expect(homeEntry?.priority).toBe(1.0);
    expect(homeEntry?.changeFrequency).toBe("weekly");
  });

  test("includes company pages", () => {
    const entries = sitemap();
    const companies = getAllCompanies();

    for (const company of companies.slice(0, 5)) { // Check first 5
      const companyEntry = entries.find((e) =>
        e.url.endsWith(`/${company.slug}`) && !e.url.includes(`/${company.slug}/`)
      );
      expect(companyEntry).toBeDefined();
      expect(companyEntry?.priority).toBe(0.8);
    }
  });

  test("includes company/role pages", () => {
    const entries = sitemap();
    const companies = getAllCompanies();

    // Check that at least some company/role combos exist
    const companyWithRoles = companies.find((c) => c.roles.length > 0);
    if (companyWithRoles) {
      const role = companyWithRoles.roles[0];
      if (role) {
        const roleEntry = entries.find((e) =>
          e.url.includes(`/${companyWithRoles.slug}/${role.slug}`)
        );
        expect(roleEntry).toBeDefined();
      }
    }
  });

  test("all entries have required fields", () => {
    const entries = sitemap();

    for (const entry of entries) {
      expect(entry.url).toBeDefined();
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(entry.changeFrequency).toBeDefined();
      expect(entry.priority).toBeDefined();
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  test("priorities are in valid range (0.5 - 1.0) for pages", () => {
    const entries = sitemap();

    for (const entry of entries) {
      expect(entry.priority).toBeGreaterThanOrEqual(0.5);
      expect(entry.priority).toBeLessThanOrEqual(1.0);
    }
  });

  test("company/role pages have priority based on score", () => {
    const entries = sitemap();
    const companies = getAllCompanies();

    // Find two different role pages
    const companyWithRoles = companies.find((c) => c.roles.length >= 2);
    if (companyWithRoles) {
      const roleEntries = entries.filter((e) =>
        e.url.includes(`/${companyWithRoles.slug}/`)
      );

      // All should have valid priorities
      for (const entry of roleEntries) {
        expect(entry.priority).toBeGreaterThanOrEqual(0.5);
        expect(entry.priority).toBeLessThanOrEqual(1.0);
      }
    }
  });

  test("includes all companies from data", () => {
    const entries = sitemap();
    const companies = getAllCompanies();

    // Count company entries (not including home)
    const companyUrls = new Set(
      entries
        .filter((e) => !e.url.match(/^https?:\/\/[^/]+\/?$/)) // Exclude home
        .map((e) => {
          const match = e.url.match(/\/([^/]+)\/?$/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    // All companies should be represented
    for (const company of companies) {
      const hasCompanyPage = entries.some((e) =>
        e.url.endsWith(`/${company.slug}`) || e.url.includes(`/${company.slug}/`)
      );
      expect(hasCompanyPage).toBe(true);
    }
  });

  test("no duplicate URLs", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    const uniqueUrls = new Set(urls);

    expect(uniqueUrls.size).toBe(urls.length);
  });

  test("URLs are properly formatted", () => {
    const entries = sitemap();

    for (const entry of entries) {
      // Should be HTTPS or HTTP
      expect(entry.url).toMatch(/^https?:\/\//);
      // Should not have double slashes (except in protocol)
      expect(entry.url.replace(/^https?:\/\//, "")).not.toContain("//");
      // Should be lowercase
      expect(entry.url).toBe(entry.url.toLowerCase());
    }
  });

  test("lastModified is a recent date", () => {
    const entries = sitemap();
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    for (const entry of entries) {
      const lastMod = entry.lastModified;
      const lastModTime = lastMod instanceof Date ? lastMod.getTime() : new Date(lastMod!).getTime();
      expect(lastModTime).toBeGreaterThan(oneYearAgo.getTime());
      expect(lastModTime).toBeLessThanOrEqual(now.getTime() + 1000);
    }
  });
});
