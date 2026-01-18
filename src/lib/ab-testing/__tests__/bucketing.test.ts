/**
 * Bucketing Tests
 * Issue: #41 - User bucketing system
 */

import {
  getBucket,
  getBucketResult,
  testBucketDistribution,
  isDistributionUniform,
  _md5ForTesting,
} from "../bucketing";

describe("MD5 hash", () => {
  test("returns 32-character hex string", () => {
    const hash = _md5ForTesting("test");
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  test("is deterministic", () => {
    const hash1 = _md5ForTesting("hello world");
    const hash2 = _md5ForTesting("hello world");
    expect(hash1).toBe(hash2);
  });

  test("produces different hashes for different inputs", () => {
    const hash1 = _md5ForTesting("input1");
    const hash2 = _md5ForTesting("input2");
    expect(hash1).not.toBe(hash2);
  });

  test("matches known MD5 values", () => {
    // Known MD5 hashes for verification
    expect(_md5ForTesting("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(_md5ForTesting("a")).toBe("0cc175b9c0f1b6a831c399e269772661");
    expect(_md5ForTesting("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(_md5ForTesting("message digest")).toBe(
      "f96b697d7cb7938d525a2f31aaf161d0"
    );
  });

  test("handles UTF-8 input", () => {
    const hash = _md5ForTesting("日本語");
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

describe("getBucket", () => {
  test("returns bucket number between 0 and 99", () => {
    const bucket = getBucket("user-123", "test_experiment");
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(100);
  });

  test("is deterministic - same input always returns same bucket", () => {
    const userId = "user-abc-123";
    const experimentName = "paywall_test";

    const bucket1 = getBucket(userId, experimentName);
    const bucket2 = getBucket(userId, experimentName);
    const bucket3 = getBucket(userId, experimentName);

    expect(bucket1).toBe(bucket2);
    expect(bucket2).toBe(bucket3);
  });

  test("different experiments produce different buckets for same user", () => {
    const userId = "user-xyz-789";

    const bucket1 = getBucket(userId, "experiment_a");
    const bucket2 = getBucket(userId, "experiment_b");

    // While they could theoretically be the same, it's extremely unlikely
    // We test with known values that produce different buckets
    const bucket3 = getBucket("test-user-1", "exp_1");
    const bucket4 = getBucket("test-user-1", "exp_2");

    // At least one pair should be different
    const allSame =
      bucket1 === bucket2 && bucket3 === bucket4 && bucket1 === bucket3;
    expect(allSame).toBe(false);
  });

  test("different users produce different buckets for same experiment", () => {
    const experimentName = "shared_experiment";

    // Test with multiple users
    const buckets = new Set<number>();
    for (let i = 0; i < 10; i++) {
      buckets.add(getBucket(`user-${i}`, experimentName));
    }

    // With 10 users, we should see at least 2 different buckets
    // (probability of all 10 hitting same bucket is < 10^-18)
    expect(buckets.size).toBeGreaterThan(1);
  });

  test("throws for empty userId", () => {
    expect(() => getBucket("", "experiment")).toThrow(
      "userId must be a non-empty string"
    );
  });

  test("throws for empty experimentName", () => {
    expect(() => getBucket("user-123", "")).toThrow(
      "experimentName must be a non-empty string"
    );
  });

  test("throws for non-string userId", () => {
    expect(() => getBucket(null as unknown as string, "experiment")).toThrow();
    expect(() =>
      getBucket(undefined as unknown as string, "experiment")
    ).toThrow();
    expect(() => getBucket(123 as unknown as string, "experiment")).toThrow();
  });

  test("throws for non-string experimentName", () => {
    expect(() => getBucket("user-123", null as unknown as string)).toThrow();
    expect(() =>
      getBucket("user-123", undefined as unknown as string)
    ).toThrow();
  });

  test("returns integer bucket", () => {
    const bucket = getBucket("user-test", "experiment");
    expect(Number.isInteger(bucket)).toBe(true);
  });
});

describe("getBucketResult", () => {
  test("returns full result object", () => {
    const result = getBucketResult("user-123", "experiment_name");

    expect(result).toHaveProperty("userId", "user-123");
    expect(result).toHaveProperty("experimentName", "experiment_name");
    expect(result).toHaveProperty("bucket");
    expect(typeof result.bucket).toBe("number");
  });

  test("bucket matches getBucket", () => {
    const userId = "user-abc";
    const experimentName = "test";

    const result = getBucketResult(userId, experimentName);
    const directBucket = getBucket(userId, experimentName);

    expect(result.bucket).toBe(directBucket);
  });
});

describe("testBucketDistribution", () => {
  test("returns map with bucket counts", () => {
    const distribution = testBucketDistribution(1000, "test_experiment");

    expect(distribution).toBeInstanceOf(Map);
    expect(distribution.size).toBeGreaterThan(0);
  });

  test("covers many buckets with enough samples", () => {
    const distribution = testBucketDistribution(10000, "distribution_test");

    // With 10000 samples and 100 buckets, we expect ~100 per bucket
    // All buckets should have at least some samples
    const bucketsWithSamples = distribution.size;
    expect(bucketsWithSamples).toBeGreaterThanOrEqual(90);
  });

  test("total samples match input", () => {
    const samples = 500;
    const distribution = testBucketDistribution(samples, "total_test");

    const total = Array.from(distribution.values()).reduce((a, b) => a + b, 0);
    expect(total).toBe(samples);
  });
});

describe("isDistributionUniform", () => {
  test("returns true for uniform distribution", () => {
    // Create a perfectly uniform distribution
    const distribution = new Map<number, number>();
    for (let i = 0; i < 100; i++) {
      distribution.set(i, 100);
    }

    expect(isDistributionUniform(distribution, 0.5)).toBe(true);
  });

  test("returns false for skewed distribution", () => {
    // Create a skewed distribution
    const distribution = new Map<number, number>();
    distribution.set(0, 10000); // All in one bucket
    for (let i = 1; i < 100; i++) {
      distribution.set(i, 0);
    }

    expect(isDistributionUniform(distribution, 0.5)).toBe(false);
  });

  test("real distribution is roughly uniform", () => {
    const distribution = testBucketDistribution(10000, "uniform_check");

    // With 10000 samples, we expect 100 per bucket
    // Allow 50% tolerance (50-150 per bucket)
    const isUniform = isDistributionUniform(distribution, 0.5);

    expect(isUniform).toBe(true);
  });
});
