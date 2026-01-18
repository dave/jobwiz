/**
 * Tests for content caching utilities
 */

import {
  getCacheKey,
  getCached,
  setCached,
  invalidatePosition,
  invalidateAll,
  getCacheStats,
  withCache,
} from "../cache";

describe("Cache utilities", () => {
  // Clear cache before each test
  beforeEach(() => {
    invalidateAll();
  });

  describe("getCacheKey", () => {
    it("generates key for preview content", () => {
      const key = getCacheKey("preview", "google", "software-engineer");
      expect(key).toBe("preview:google:software-engineer");
    });

    it("generates key for full content with userId", () => {
      const key = getCacheKey("full", "google", "software-engineer", "user-123");
      expect(key).toBe("full:google:software-engineer:user-123");
    });

    it("generates different keys for different positions", () => {
      const key1 = getCacheKey("preview", "google", "software-engineer");
      const key2 = getCacheKey("preview", "amazon", "software-engineer");
      const key3 = getCacheKey("preview", "google", "product-manager");

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it("generates different keys for preview vs full", () => {
      const preview = getCacheKey("preview", "google", "software-engineer");
      const full = getCacheKey("full", "google", "software-engineer", "user-123");

      expect(preview).not.toBe(full);
    });
  });

  describe("setCached / getCached", () => {
    it("stores and retrieves values", () => {
      const key = "test-key";
      const data = { foo: "bar", count: 42 };

      setCached(key, data);
      const retrieved = getCached(key);

      expect(retrieved).toEqual(data);
    });

    it("returns null for non-existent keys", () => {
      const result = getCached("non-existent-key");
      expect(result).toBeNull();
    });

    it("respects TTL", async () => {
      const key = "ttl-test";
      const data = { value: 123 };

      // Set with very short TTL
      setCached(key, data, 1); // 1ms TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getCached(key);
      expect(result).toBeNull();
    });

    it("returns value before TTL expires", () => {
      const key = "valid-ttl";
      const data = { value: "test" };

      setCached(key, data, 60000); // 1 minute TTL

      const result = getCached(key);
      expect(result).toEqual(data);
    });

    it("handles complex objects", () => {
      const key = "complex-object";
      const data = {
        company: { name: "Google", slug: "google" },
        modules: [
          { id: "1", title: "Module 1" },
          { id: "2", title: "Module 2" },
        ],
        hasPremiumAccess: false,
      };

      setCached(key, data);
      const retrieved = getCached(key);

      expect(retrieved).toEqual(data);
    });

    it("handles null values", () => {
      const key = "null-value";
      setCached(key, null);

      // null values are stored but getCached returns null for both
      // missing and null values
      const result = getCached(key);
      expect(result).toBeNull();
    });
  });

  describe("invalidatePosition", () => {
    it("invalidates all cache entries for a position", () => {
      // Set up cache entries
      setCached("preview:google:software-engineer", { type: "preview" });
      setCached("full:google:software-engineer:user-1", { type: "full" });
      setCached("full:google:software-engineer:user-2", { type: "full" });
      setCached("preview:amazon:software-engineer", { type: "preview" });

      // Invalidate Google SWE entries
      invalidatePosition("google", "software-engineer");

      // Google entries should be gone
      expect(getCached("preview:google:software-engineer")).toBeNull();
      expect(getCached("full:google:software-engineer:user-1")).toBeNull();
      expect(getCached("full:google:software-engineer:user-2")).toBeNull();

      // Amazon entry should remain
      expect(getCached("preview:amazon:software-engineer")).not.toBeNull();
    });

    it("does nothing for non-existent position", () => {
      setCached("preview:google:software-engineer", { data: "test" });

      // This should not throw
      invalidatePosition("non-existent", "role");

      // Existing entry should remain
      expect(getCached("preview:google:software-engineer")).not.toBeNull();
    });
  });

  describe("invalidateAll", () => {
    it("clears all cache entries", () => {
      // Set up multiple cache entries
      setCached("key1", { value: 1 });
      setCached("key2", { value: 2 });
      setCached("key3", { value: 3 });

      const beforeStats = getCacheStats();
      expect(beforeStats.size).toBe(3);

      invalidateAll();

      const afterStats = getCacheStats();
      expect(afterStats.size).toBe(0);
      expect(getCached("key1")).toBeNull();
      expect(getCached("key2")).toBeNull();
      expect(getCached("key3")).toBeNull();
    });
  });

  describe("getCacheStats", () => {
    it("returns correct size", () => {
      setCached("a", 1);
      setCached("b", 2);
      setCached("c", 3);

      const stats = getCacheStats();
      expect(stats.size).toBe(3);
    });

    it("returns all keys", () => {
      setCached("key-alpha", "a");
      setCached("key-beta", "b");

      const stats = getCacheStats();
      expect(stats.keys).toContain("key-alpha");
      expect(stats.keys).toContain("key-beta");
    });

    it("returns empty stats for empty cache", () => {
      const stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe("withCache", () => {
    it("caches fetcher result", async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: "fetched" });

      // First call - should call fetcher
      const result1 = await withCache("cache-key", fetcher);
      expect(result1).toEqual({ data: "fetched" });
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await withCache("cache-key", fetcher);
      expect(result2).toEqual({ data: "fetched" });
      expect(fetcher).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it("returns cached value without calling fetcher", async () => {
      // Pre-populate cache
      setCached("pre-cached", { existing: true });

      const fetcher = jest.fn().mockResolvedValue({ new: true });
      const result = await withCache("pre-cached", fetcher);

      expect(result).toEqual({ existing: true });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("calls fetcher after TTL expires", async () => {
      const fetcher = jest.fn()
        .mockResolvedValueOnce({ call: 1 })
        .mockResolvedValueOnce({ call: 2 });

      // First call with short TTL
      const result1 = await withCache("ttl-key", fetcher, 1);
      expect(result1).toEqual({ call: 1 });
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call should fetch again
      const result2 = await withCache("ttl-key", fetcher, 1);
      expect(result2).toEqual({ call: 2 });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("does not cache null results", async () => {
      const fetcher = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ data: "second" });

      // First call returns null
      const result1 = await withCache("null-result", fetcher);
      expect(result1).toBeNull();
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call should fetch again (null wasn't cached)
      const result2 = await withCache("null-result", fetcher);
      expect(result2).toEqual({ data: "second" });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("handles fetcher errors", async () => {
      const error = new Error("Fetch failed");
      const fetcher = jest.fn().mockRejectedValue(error);

      await expect(withCache("error-key", fetcher)).rejects.toThrow("Fetch failed");
    });
  });
});

describe("Cache key patterns", () => {
  beforeEach(() => {
    invalidateAll();
  });

  it("preview keys follow pattern", () => {
    const key = getCacheKey("preview", "company-slug", "role-slug");
    expect(key).toMatch(/^preview:[\w-]+:[\w-]+$/);
  });

  it("full keys with user follow pattern", () => {
    const key = getCacheKey("full", "company-slug", "role-slug", "user-id");
    expect(key).toMatch(/^full:[\w-]+:[\w-]+:[\w-]+$/);
  });
});

describe("Cache edge cases", () => {
  beforeEach(() => {
    invalidateAll();
  });

  it("handles special characters in values", () => {
    const data = {
      text: "Special chars: <>&\"'",
      unicode: "Unicode: 你好 🎉",
      nested: { deep: { value: "test" } },
    };

    setCached("special", data);
    expect(getCached("special")).toEqual(data);
  });

  it("handles large objects", () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      data: "x".repeat(100),
    }));

    setCached("large", largeArray);
    expect(getCached<typeof largeArray>("large")?.length).toBe(1000);
  });

  it("handles concurrent sets", async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      Promise.resolve().then(() => setCached(`concurrent-${i}`, i))
    );

    await Promise.all(promises);

    const stats = getCacheStats();
    expect(stats.size).toBe(10);
  });
});
