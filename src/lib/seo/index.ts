/**
 * SEO utilities for meta tags and structured data
 */

// Types
export type {
  SEOConfig,
  OpenGraphData,
  TwitterCardData,
  CourseSchema,
  OrganizationSchema,
  FAQSchema,
  BreadcrumbSchema,
  SitemapEntry,
} from "./types";

// Metadata generation
export {
  truncateDescription,
  generateCompanyRoleMetadata,
  generateCompanyMetadata,
  generate404Metadata,
  getSiteUrl,
  getSiteName,
} from "./metadata";

// Structured data (JSON-LD)
export {
  generateCourseSchema,
  generateOrganizationSchema,
  generateFAQSchema,
  generateDefaultFAQSchema,
  generateBreadcrumbSchema,
  generateCompanyRoleBreadcrumbs,
  generateCompanyBreadcrumbs,
  serializeJsonLd,
} from "./structured-data";
