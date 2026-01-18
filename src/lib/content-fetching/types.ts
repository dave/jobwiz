/**
 * Content fetching types for landing pages
 * Used by getPreviewContent and getFullContent functions
 */

import type { Module, ModuleSection, ContentBlock } from "@/types/module";
import type { CompanyData, CompanyRole } from "@/lib/routing/types";

/** Content with premium blocks filtered or included based on access */
export interface PositionContent {
  company: CompanyData;
  role: CompanyRole;
  modules: Module[];
  /** Whether this content includes premium blocks */
  hasPremiumAccess: boolean;
  /** Number of premium modules in the position */
  premiumModuleCount: number;
  /** Number of free modules in the position */
  freeModuleCount: number;
}

/** Preview content with premium blocks removed or blurred */
export interface PreviewContent extends PositionContent {
  hasPremiumAccess: false;
  /** Sections that were truncated due to paywall */
  truncatedSections: TruncatedSection[];
}

/** Information about a truncated premium section */
export interface TruncatedSection {
  moduleId: string;
  moduleTitle: string;
  sectionId: string;
  sectionTitle: string;
  /** Number of blocks hidden */
  hiddenBlockCount: number;
}

/** Full content with all premium blocks included */
export interface FullContent extends PositionContent {
  hasPremiumAccess: true;
}

/** Result of an access check */
export interface AccessCheckResult {
  hasAccess: boolean;
  userId?: string;
  purchaseId?: string;
  expiresAt?: string;
}

/** Options for content fetching */
export interface ContentFetchOptions {
  /** Include draft/unpublished modules (for admin preview) */
  includeDrafts?: boolean;
  /** Limit number of modules returned */
  limit?: number;
  /** Filter by module types */
  moduleTypes?: Module["type"][];
}

/** Cached content with metadata */
export interface CachedContent<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  cacheKey: string;
}

/** Module with blocks already populated */
export interface ModuleWithBlocks extends Omit<Module, "sections"> {
  sections: ModuleSectionWithBlocks[];
}

/** Section with blocks from database */
export interface ModuleSectionWithBlocks extends ModuleSection {
  /** Whether this section has premium-only blocks */
  hasPremiumBlocks: boolean;
}

/** Database content block transformed to application type */
export interface TransformedBlock {
  block: ContentBlock;
  isPremium: boolean;
  sectionId: string;
  sectionTitle: string;
}
