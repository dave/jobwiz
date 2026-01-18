/**
 * Sticky Bucketing Tests
 * Issue: #41 - User bucketing system
 */

import {
  getStorageKey,
  getStoredVariant,
  storeVariant,
  clearStoredVariant,
  clearAllStoredVariants,
  defaultVariantAssigner,
  createVariantAssigner,
  getOrAssignVariant,
  getVariantIfAssigned,
  forceAssignVariant,
} from "../sticky-bucketing";
import { VARIANT_STORAGE_PREFIX } from "../types";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

describe("getStorageKey", () => {
  test("returns prefixed key", () => {
    const key = getStorageKey("test_experiment");
    expect(key).toBe(`${VARIANT_STORAGE_PREFIX}test_experiment`);
  });

  test("handles special characters in experiment name", () => {
    const key = getStorageKey("my-experiment_v2");
    expect(key).toBe(`${VARIANT_STORAGE_PREFIX}my-experiment_v2`);
  });
});

describe("storeVariant and getStoredVariant", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("stores and retrieves variant", () => {
    storeVariant("test_exp", "variant_a", 25);
    const stored = getStoredVariant("test_exp");

    expect(stored).not.toBeNull();
    expect(stored?.variant).toBe("variant_a");
    expect(stored?.bucket).toBe(25);
    expect(stored?.assignedAt).toBeDefined();
  });

  test("returns null for non-existent experiment", () => {
    const stored = getStoredVariant("non_existent");
    expect(stored).toBeNull();
  });

  test("assignedAt is valid ISO timestamp", () => {
    storeVariant("test_exp", "variant_b", 50);
    const stored = getStoredVariant("test_exp");

    const date = new Date(stored!.assignedAt);
    expect(date.getTime()).not.toBeNaN();
  });

  test("overwrites existing variant", () => {
    storeVariant("test_exp", "variant_a", 25);
    storeVariant("test_exp", "variant_b", 75);

    const stored = getStoredVariant("test_exp");
    expect(stored?.variant).toBe("variant_b");
    expect(stored?.bucket).toBe(75);
  });
});

describe("clearStoredVariant", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("removes stored variant", () => {
    storeVariant("test_exp", "variant_a", 25);
    expect(getStoredVariant("test_exp")).not.toBeNull();

    clearStoredVariant("test_exp");
    expect(getStoredVariant("test_exp")).toBeNull();
  });

  test("does not throw for non-existent experiment", () => {
    expect(() => clearStoredVariant("non_existent")).not.toThrow();
  });
});

describe("clearAllStoredVariants", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("removes all AB test variants", () => {
    storeVariant("exp_1", "variant_a", 10);
    storeVariant("exp_2", "variant_b", 20);
    storeVariant("exp_3", "variant_c", 30);

    // Add a non-AB test item
    localStorageMock.setItem("other_key", "other_value");

    clearAllStoredVariants();

    expect(getStoredVariant("exp_1")).toBeNull();
    expect(getStoredVariant("exp_2")).toBeNull();
    expect(getStoredVariant("exp_3")).toBeNull();

    // Other items should remain
    expect(localStorageMock.getItem("other_key")).toBe("other_value");
  });
});

describe("defaultVariantAssigner", () => {
  test("assigns direct_paywall for buckets 0-24", () => {
    expect(defaultVariantAssigner(0)).toBe("direct_paywall");
    expect(defaultVariantAssigner(12)).toBe("direct_paywall");
    expect(defaultVariantAssigner(24)).toBe("direct_paywall");
  });

  test("assigns freemium for buckets 25-49", () => {
    expect(defaultVariantAssigner(25)).toBe("freemium");
    expect(defaultVariantAssigner(37)).toBe("freemium");
    expect(defaultVariantAssigner(49)).toBe("freemium");
  });

  test("assigns teaser for buckets 50-74", () => {
    expect(defaultVariantAssigner(50)).toBe("teaser");
    expect(defaultVariantAssigner(62)).toBe("teaser");
    expect(defaultVariantAssigner(74)).toBe("teaser");
  });

  test("assigns question_limit for buckets 75-99", () => {
    expect(defaultVariantAssigner(75)).toBe("question_limit");
    expect(defaultVariantAssigner(87)).toBe("question_limit");
    expect(defaultVariantAssigner(99)).toBe("question_limit");
  });
});

describe("createVariantAssigner", () => {
  test("creates assigner with custom splits", () => {
    const assigner = createVariantAssigner({
      a: 50,
      b: 50,
    });

    // Buckets 0-49 should be 'a', 50-99 should be 'b'
    expect(assigner(0)).toBe("a");
    expect(assigner(49)).toBe("a");
    expect(assigner(50)).toBe("b");
    expect(assigner(99)).toBe("b");
  });

  test("handles unequal splits", () => {
    const assigner = createVariantAssigner({
      control: 80,
      treatment: 20,
    });

    expect(assigner(0)).toBe("control");
    expect(assigner(79)).toBe("control");
    expect(assigner(80)).toBe("treatment");
    expect(assigner(99)).toBe("treatment");
  });

  test("throws if splits do not sum to 100", () => {
    expect(() =>
      createVariantAssigner({
        a: 50,
        b: 40,
      })
    ).toThrow("Traffic splits must sum to 100");

    expect(() =>
      createVariantAssigner({
        a: 60,
        b: 50,
      })
    ).toThrow("Traffic splits must sum to 100");
  });

  test("sorts variants alphabetically for consistent ordering", () => {
    const assigner = createVariantAssigner({
      zebra: 50,
      alpha: 50,
    });

    // alpha should come first (0-49), then zebra (50-99)
    expect(assigner(25)).toBe("alpha");
    expect(assigner(75)).toBe("zebra");
  });
});

describe("getOrAssignVariant", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("assigns variant for new user", () => {
    const result = getOrAssignVariant("user-123", "test_experiment");

    expect(result.userId).toBe("user-123");
    expect(result.experimentName).toBe("test_experiment");
    expect(result.variant).toBeDefined();
    expect(result.bucket).toBeGreaterThanOrEqual(0);
    expect(result.bucket).toBeLessThan(100);
    expect(result.isNew).toBe(true);
  });

  test("returns same variant for same user", () => {
    const result1 = getOrAssignVariant("user-456", "exp_1");
    const result2 = getOrAssignVariant("user-456", "exp_1");

    expect(result1.variant).toBe(result2.variant);
    expect(result1.bucket).toBe(result2.bucket);
    expect(result1.isNew).toBe(true);
    expect(result2.isNew).toBe(false);
  });

  test("uses stored variant if available", () => {
    // Pre-store a variant
    storeVariant("pre_stored", "forced_variant", 42);

    const result = getOrAssignVariant("any-user", "pre_stored");

    expect(result.variant).toBe("forced_variant");
    expect(result.bucket).toBe(42);
    expect(result.isNew).toBe(false);
  });

  test("uses custom assigner", () => {
    const customAssigner = (bucket: number) =>
      bucket < 50 ? "custom_a" : "custom_b";

    const result = getOrAssignVariant(
      "user-789",
      "custom_exp",
      customAssigner
    );

    expect(["custom_a", "custom_b"]).toContain(result.variant);
  });

  test("stores assignment for future consistency", () => {
    getOrAssignVariant("store-test-user", "store_test_exp");

    const stored = getStoredVariant("store_test_exp");
    expect(stored).not.toBeNull();
  });
});

describe("getVariantIfAssigned", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("returns variant if assigned", () => {
    storeVariant("assigned_exp", "the_variant", 33);

    const variant = getVariantIfAssigned("assigned_exp");
    expect(variant).toBe("the_variant");
  });

  test("returns null if not assigned", () => {
    const variant = getVariantIfAssigned("not_assigned");
    expect(variant).toBeNull();
  });
});

describe("forceAssignVariant", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("forces specific variant", () => {
    forceAssignVariant("forced_exp", "forced_value");

    const stored = getStoredVariant("forced_exp");
    expect(stored?.variant).toBe("forced_value");
  });

  test("overwrites existing assignment", () => {
    storeVariant("overwrite_exp", "original", 50);
    forceAssignVariant("overwrite_exp", "overwritten");

    const stored = getStoredVariant("overwrite_exp");
    expect(stored?.variant).toBe("overwritten");
  });

  test("sets bucket to -1 for forced assignments", () => {
    forceAssignVariant("bucket_test", "any");

    const stored = getStoredVariant("bucket_test");
    expect(stored?.bucket).toBe(-1);
  });
});

describe("sticky bucketing persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test("variant persists across sessions", () => {
    // First "session"
    const result1 = getOrAssignVariant("persistent-user", "persist_test");
    const variant = result1.variant;

    // Simulate new session by clearing in-memory state but keeping localStorage
    // (localStorage mock retains data)

    // Second "session"
    const result2 = getOrAssignVariant("persistent-user", "persist_test");

    expect(result2.variant).toBe(variant);
    expect(result2.isNew).toBe(false);
  });

  test("variant survives traffic split changes", () => {
    // Initial assignment with default splits
    const result1 = getOrAssignVariant("split-user", "split_test");

    // Even with different assigner (simulating split change), stored variant is used
    const differentAssigner = () => "completely_different";
    const result2 = getOrAssignVariant(
      "split-user",
      "split_test",
      differentAssigner
    );

    expect(result2.variant).toBe(result1.variant);
  });
});
