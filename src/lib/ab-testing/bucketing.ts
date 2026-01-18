/**
 * User Bucketing Module
 * Issue: #41 - User bucketing system
 *
 * Provides deterministic bucketing for AB tests using MD5 hash
 */

import type {
  UserId,
  ExperimentName,
  BucketNumber,
  BucketResult,
} from "./types";

/**
 * Simple MD5 hash implementation for consistent bucketing
 * Uses a pure JS implementation to work in both browser and server
 *
 * Note: We only need the hash to be consistent and well-distributed,
 * not cryptographically secure. MD5 is perfect for bucketing.
 */
function md5(input: string): string {
  // Convert string to UTF-8 bytes
  const utf8 = unescape(encodeURIComponent(input));
  const bytes: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    bytes.push(utf8.charCodeAt(i));
  }

  // MD5 constants
  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
    9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
    16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21,
  ];

  // Padding
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  for (let i = 0; i < bytes.length; i++) {
    padded[i] = bytes[i]!;
  }
  padded[bytes.length] = 0x80;

  // Length in bits (little-endian)
  const bitLength = bytes.length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLength, true);
  view.setUint32(paddedLength - 4, 0, true);

  // Initial hash values
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  // Process blocks
  for (let i = 0; i < paddedLength; i += 64) {
    const M: number[] = [];
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(i + j * 4, true);
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let j = 0; j < 64; j++) {
      let F: number;
      let g: number;

      if (j < 16) {
        F = (B & C) | (~B & D);
        g = j;
      } else if (j < 32) {
        F = (D & B) | (~D & C);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        F = B ^ C ^ D;
        g = (3 * j + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * j) % 16;
      }

      F = (F + A + K[j]! + M[g]!) >>> 0;
      A = D;
      D = C;
      C = B;
      const rotated = ((F << S[j]!) | (F >>> (32 - S[j]!))) >>> 0;
      B = (B + rotated) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // Convert to hex string
  const toHex = (n: number): string => {
    const bytes = [
      n & 0xff,
      (n >> 8) & 0xff,
      (n >> 16) & 0xff,
      (n >> 24) & 0xff,
    ];
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

/**
 * Calculate bucket number from user ID and experiment name
 *
 * Uses MD5 hash of concatenated userId + experimentName to get
 * a deterministic bucket number between 0-99.
 *
 * @param userId - The user's ID (anonymous UUID or auth user ID)
 * @param experimentName - The name of the experiment
 * @returns Bucket number 0-99
 *
 * @example
 * ```typescript
 * const bucket = getBucket("user-123", "paywall_test");
 * // Always returns the same bucket for the same inputs
 * ```
 */
export function getBucket(
  userId: UserId,
  experimentName: ExperimentName
): BucketNumber {
  // Validate inputs
  if (!userId || typeof userId !== "string") {
    throw new Error("userId must be a non-empty string");
  }
  if (!experimentName || typeof experimentName !== "string") {
    throw new Error("experimentName must be a non-empty string");
  }

  // Concatenate userId and experimentName for hashing
  const input = `${userId}${experimentName}`;

  // Get MD5 hash
  const hash = md5(input);

  // Take first 8 characters (32 bits) and convert to number
  const hashValue = parseInt(hash.substring(0, 8), 16);

  // Get bucket 0-99
  const bucket = hashValue % 100;

  return bucket;
}

/**
 * Calculate bucket with full result information
 *
 * @param userId - The user's ID
 * @param experimentName - The experiment name
 * @returns Full bucket result including userId, experimentName, and bucket
 */
export function getBucketResult(
  userId: UserId,
  experimentName: ExperimentName
): BucketResult {
  const bucket = getBucket(userId, experimentName);

  return {
    userId,
    experimentName,
    bucket,
  };
}

/**
 * Verify bucket distribution is roughly uniform
 * Useful for testing and validation
 *
 * @param samples - Number of samples to generate
 * @param experimentName - Experiment name to test
 * @returns Map of bucket number to count
 */
export function testBucketDistribution(
  samples: number,
  experimentName: ExperimentName
): Map<BucketNumber, number> {
  const distribution = new Map<BucketNumber, number>();

  for (let i = 0; i < samples; i++) {
    const userId = `test-user-${i}`;
    const bucket = getBucket(userId, experimentName);
    distribution.set(bucket, (distribution.get(bucket) ?? 0) + 1);
  }

  return distribution;
}

/**
 * Check if bucket distribution is acceptably uniform
 *
 * @param distribution - Map of bucket to count
 * @param tolerance - Acceptable deviation from expected (default 0.5 = 50%)
 * @returns true if distribution is within tolerance
 */
export function isDistributionUniform(
  distribution: Map<BucketNumber, number>,
  tolerance = 0.5
): boolean {
  const totalSamples = Array.from(distribution.values()).reduce(
    (a, b) => a + b,
    0
  );
  const expectedPerBucket = totalSamples / 100;
  const minAcceptable = expectedPerBucket * (1 - tolerance);
  const maxAcceptable = expectedPerBucket * (1 + tolerance);

  for (let bucket = 0; bucket < 100; bucket++) {
    const count = distribution.get(bucket) ?? 0;
    if (count < minAcceptable || count > maxAcceptable) {
      return false;
    }
  }

  return true;
}

// Export the MD5 function for testing purposes
export { md5 as _md5ForTesting };
