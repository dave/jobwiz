/**
 * Robots.txt configuration for search engine crawlers
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.ace-that-interview.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/checkout/",
          "/dashboard/",
          "/admin/",
          "/login",
          "/signup",
          "/*?*", // Disallow URLs with query parameters
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
