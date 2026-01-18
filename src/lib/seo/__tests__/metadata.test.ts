/**
 * Tests for SEO metadata generation
 */

import {
  truncateDescription,
  generateCompanyRoleMetadata,
  generateCompanyMetadata,
  generate404Metadata,
  getSiteUrl,
  getSiteName,
} from "../metadata";
import type { CompanyData, CompanyRole } from "@/lib/routing/types";

describe("truncateDescription", () => {
  test("returns short text unchanged", () => {
    const text = "Short description";
    expect(truncateDescription(text)).toBe(text);
  });

  test("truncates long text to max length", () => {
    const text = "A".repeat(200);
    const result = truncateDescription(text);
    expect(result.length).toBeLessThanOrEqual(158); // 155 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  test("truncates at word boundary when possible", () => {
    const text = "This is a very long description that needs to be truncated somewhere sensible to avoid cutting off words in the middle of the text which would look bad for SEO";
    const result = truncateDescription(text);
    expect(result.length).toBeLessThanOrEqual(158);
    expect(result.endsWith("...")).toBe(true);
    // Should end with "..." preceded by either a space or complete word
    expect(result.length).toBeLessThan(text.length);
  });

  test("respects custom max length", () => {
    const text = "This is a test description";
    const result = truncateDescription(text, 20);
    expect(result.length).toBeLessThanOrEqual(23); // 20 + "..."
  });

  test("handles exactly max length text", () => {
    const text = "A".repeat(155);
    expect(truncateDescription(text)).toBe(text);
  });
});

describe("generateCompanyRoleMetadata", () => {
  const mockCompany: CompanyData = {
    name: "Google",
    slug: "google",
    category: "Technology",
    interview_volume: 1000,
    roles: [],
  };

  const mockRole: CompanyRole = {
    name: "Software Engineer",
    slug: "software-engineer",
    volume: 500,
  };

  test("generates correct title with company and role", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.title).toBe("Google Software Engineer Interview Prep | Ace That Interview");
  });

  test("generates description under 160 chars", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeLessThanOrEqual(160);
  });

  test("sets canonical URL", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.alternates?.canonical).toContain("/google/software-engineer");
  });

  test("sets robots to index and follow", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  test("includes OpenGraph tags", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toContain("Google");
    expect(metadata.openGraph?.title).toContain("Software Engineer");
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe("website");
    expect(metadata.openGraph?.siteName).toBe("Ace That Interview");
  });

  test("includes og:image", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.openGraph?.images).toBeDefined();
    expect(Array.isArray(metadata.openGraph?.images)).toBe(true);
    const images = metadata.openGraph?.images as Array<{ url: string }>;
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]?.url).toContain("og-default.png");
  });

  test("includes og:url", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.openGraph?.url).toContain("/google/software-engineer");
  });

  test("includes Twitter card tags", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.twitter).toBeDefined();
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toContain("Google");
    expect(metadata.twitter?.site).toBe("@acethatinterview");
  });

  test("includes twitter image", () => {
    const metadata = generateCompanyRoleMetadata(mockCompany, mockRole, "/google/software-engineer");
    expect(metadata.twitter?.images).toBeDefined();
  });
});

describe("generateCompanyMetadata", () => {
  const mockCompany: CompanyData = {
    name: "Amazon",
    slug: "amazon",
    category: "Technology",
    interview_volume: 800,
    roles: [],
  };

  test("generates correct title with company name", () => {
    const metadata = generateCompanyMetadata(mockCompany, "/amazon");
    expect(metadata.title).toBe("Amazon Interview Prep | Ace That Interview");
  });

  test("generates description under 160 chars", () => {
    const metadata = generateCompanyMetadata(mockCompany, "/amazon");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeLessThanOrEqual(160);
  });

  test("sets canonical URL", () => {
    const metadata = generateCompanyMetadata(mockCompany, "/amazon");
    expect(metadata.alternates?.canonical).toContain("/amazon");
  });

  test("includes OpenGraph tags", () => {
    const metadata = generateCompanyMetadata(mockCompany, "/amazon");
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toContain("Amazon");
  });

  test("includes Twitter card tags", () => {
    const metadata = generateCompanyMetadata(mockCompany, "/amazon");
    expect(metadata.twitter).toBeDefined();
    expect((metadata.twitter as Record<string, unknown>)?.card).toBe("summary_large_image");
  });
});

describe("generate404Metadata", () => {
  test("generates Page Not Found title", () => {
    const metadata = generate404Metadata();
    expect(metadata.title).toContain("Page Not Found");
  });

  test("sets robots to noindex, nofollow", () => {
    const metadata = generate404Metadata();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("utility functions", () => {
  test("getSiteUrl returns a URL", () => {
    const url = getSiteUrl();
    expect(url).toMatch(/^https?:\/\//);
  });

  test("getSiteName returns Ace That Interview", () => {
    expect(getSiteName()).toBe("Ace That Interview");
  });
});
