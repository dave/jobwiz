/**
 * SEO metadata generation utilities
 */

import type { Metadata } from "next";
import type { CompanyData, CompanyRole } from "@/lib/routing/types";

const SITE_NAME = "Ace That Interview";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ace-that-interview.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
const TWITTER_HANDLE = "@acethatinterview";

/**
 * Truncate description to meet SEO best practices (< 160 chars)
 */
export function truncateDescription(text: string, maxLength: number = 155): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength - 3);
  // Try to cut at last complete word
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength - 30) {
    return truncated.substring(0, lastSpace) + "...";
  }
  return truncated + "...";
}

/**
 * Generate metadata for a company/role landing page
 */
export function generateCompanyRoleMetadata(
  company: CompanyData,
  role: CompanyRole,
  canonicalPath: string
): Metadata {
  const title = `${company.name} ${role.name} Interview Prep | ${SITE_NAME}`;
  const description = truncateDescription(
    `Master your ${company.name} ${role.name} interview with our comprehensive prep guide. Practice questions, insider tips, and proven strategies to land your dream job.`
  );
  const url = `${SITE_URL}${canonicalPath}`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${company.name} ${role.name} Interview Prep`,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          alt: `${company.name} ${role.name} Interview Preparation`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_HANDLE,
      title: `${company.name} ${role.name} Interview Prep`,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/**
 * Generate metadata for a company page (role listing)
 */
export function generateCompanyMetadata(
  company: CompanyData,
  canonicalPath: string
): Metadata {
  const title = `${company.name} Interview Prep | ${SITE_NAME}`;
  const description = truncateDescription(
    `Prepare for your ${company.name} interview with role-specific guides, practice questions, and insider tips. Choose your role and start preparing today.`
  );
  const url = `${SITE_URL}${canonicalPath}`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${company.name} Interview Prep`,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          alt: `${company.name} Interview Preparation`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_HANDLE,
      title: `${company.name} Interview Prep`,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/**
 * Generate 404 metadata
 */
export function generate404Metadata(): Metadata {
  return {
    title: `Page Not Found | ${SITE_NAME}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Get site URL constant
 */
export function getSiteUrl(): string {
  return SITE_URL;
}

/**
 * Get site name constant
 */
export function getSiteName(): string {
  return SITE_NAME;
}
