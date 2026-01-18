#!/usr/bin/env npx ts-node

/**
 * Bucket Distribution Test Script
 * Issue: #41 - User bucketing system
 *
 * Tests that the bucketing algorithm produces uniform distribution
 *
 * Usage: npm run test:bucket-distribution
 */

import {
  testBucketDistribution,
  isDistributionUniform,
} from "../../src/lib/ab-testing";

const SAMPLES = 10000;
const EXPERIMENT = "paywall_test";
const TOLERANCE = 0.5; // 50% tolerance (50-150 samples per bucket)

console.log("===========================================");
console.log("AB Test Bucketing - Distribution Test");
console.log("===========================================");
console.log("");
console.log(`Experiment: ${EXPERIMENT}`);
console.log(`Samples: ${SAMPLES.toLocaleString()}`);
console.log(`Expected per bucket: ${SAMPLES / 100}`);
console.log(`Tolerance: ±${TOLERANCE * 100}%`);
console.log("");

// Run the distribution test
console.log("Generating samples...");
const distribution = testBucketDistribution(SAMPLES, EXPERIMENT);

// Calculate statistics
const values = Array.from(distribution.values());
const min = Math.min(...values);
const max = Math.max(...values);
const avg = values.reduce((a, b) => a + b, 0) / values.length;
const stdDev = Math.sqrt(
  values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
);

console.log("");
console.log("Distribution Statistics:");
console.log("-----------------------------------------");
console.log(`Buckets covered: ${distribution.size}/100`);
console.log(`Min samples in bucket: ${min}`);
console.log(`Max samples in bucket: ${max}`);
console.log(`Average: ${avg.toFixed(2)}`);
console.log(`Std Dev: ${stdDev.toFixed(2)}`);
console.log("");

// Check uniformity
const isUniform = isDistributionUniform(distribution, TOLERANCE);

if (isUniform) {
  console.log("✅ PASS: Distribution is uniform");
} else {
  console.log("❌ FAIL: Distribution is NOT uniform");

  // Show outliers
  console.log("");
  console.log("Outlier buckets:");
  const expected = SAMPLES / 100;
  const minAcceptable = expected * (1 - TOLERANCE);
  const maxAcceptable = expected * (1 + TOLERANCE);

  for (let bucket = 0; bucket < 100; bucket++) {
    const count = distribution.get(bucket) ?? 0;
    if (count < minAcceptable || count > maxAcceptable) {
      console.log(`  Bucket ${bucket}: ${count} samples (expected ${expected})`);
    }
  }
}

console.log("");
console.log("===========================================");

// Show sample bucket assignments
console.log("");
console.log("Sample assignments (first 10 buckets):");
console.log("-----------------------------------------");
for (let bucket = 0; bucket < 10; bucket++) {
  const count = distribution.get(bucket) ?? 0;
  const bar = "█".repeat(Math.round(count / (SAMPLES / 100) * 20));
  console.log(`Bucket ${bucket.toString().padStart(2)}: ${bar} (${count})`);
}
console.log("...");
console.log("-----------------------------------------");

process.exit(isUniform ? 0 : 1);
