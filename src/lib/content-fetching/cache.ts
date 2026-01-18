/**
 * Content caching utilities
 * Provides in-memory caching with TTL for content fetching
 */

import type { CachedContent } from "./types";

/** Default cache TTL in milliseconds (5 minutes) */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/** Revalidation interval in seconds (matches ISR config) */
export const REVALIDATE_INTERVAL = 3600; // 1 hour

/** In-memory cache store */
const cache = new Map<string, CachedContent<unknown>>();

/**
 * Generate a cache key for content
 */
export function getCacheKey(
  type: "preview" | "full",
  companySlug: string,
  roleSlug: string,
  userId?: string
): string {
  const parts = [type, companySlug, roleSlug];
  if (userId) {
    parts.push(userId);
  }
  return parts.join(":");
}

/**
 * Get cached content if valid
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CachedContent<T> | undefined;

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cached content
 */
export function setCached<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_CACHE_TTL
): void {
  const now = Date.now();
  cache.set(key, {
    data,
    cachedAt: now,
    expiresAt: now + ttlMs,
    cacheKey: key,
  });
}

/**
 * Invalidate cache for a specific position
 */
export function invalidatePosition(companySlug: string, roleSlug: string): void {
  const prefix = `preview:${companySlug}:${roleSlug}`;
  const fullPrefix = `full:${companySlug}:${roleSlug}`;

  for (const key of cache.keys()) {
    if (key.startsWith(prefix) || key.startsWith(fullPrefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate all cache
 */
export function invalidateAll(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * Wrapper function to cache async operations
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_CACHE_TTL
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetcher();
  if (data !== null) {
    setCached(key, data, ttlMs);
  }

  return data;
}
