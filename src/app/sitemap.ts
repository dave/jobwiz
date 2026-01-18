/**
 * Auto-generated sitemap for all company/role pages
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

import type { MetadataRoute } from "next";
import {
  getAllCompanies,
  getTopCompanyRoleCombos,
} from "@/lib/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ace-that-interview.com";

/**
 * Calculate priority based on search volume score
 * Higher volume = higher priority (0.5 - 1.0 range)
 */
function calculatePriority(score: number, maxScore: number): number {
  if (maxScore === 0) return 0.5;
  // Normalize score to 0.5 - 1.0 range
  const normalized = 0.5 + (score / maxScore) * 0.5;
  // Round to 1 decimal place
  return Math.round(normalized * 10) / 10;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const companies = getAllCompanies();
  const combos = getTopCompanyRoleCombos(1000); // Get all combos

  // Find max score for priority calculation
  const maxScore = combos.length > 0
    ? Math.max(...combos.map((c) => c.score))
    : 0;

  // Create a map of company/role -> score for quick lookup
  const scoreMap = new Map<string, number>();
  for (const combo of combos) {
    scoreMap.set(`${combo.companySlug}/${combo.roleSlug}`, combo.score);
  }

  const entries: MetadataRoute.Sitemap = [];

  // Home page
  entries.push({
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  });

  // Company pages
  for (const company of companies) {
    entries.push({
      url: `${SITE_URL}/${company.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });

    // Company/role pages
    for (const role of company.roles) {
      const key = `${company.slug}/${role.slug}`;
      const score = scoreMap.get(key) ?? 0;
      const priority = calculatePriority(score, maxScore);

      entries.push({
        url: `${SITE_URL}/${company.slug}/${role.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority,
      });
    }
  }

  return entries;
}
