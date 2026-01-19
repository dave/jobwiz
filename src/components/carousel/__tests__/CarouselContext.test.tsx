import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { CarouselProvider, useCarousel } from "../CarouselContext";
import type { CarouselItem, CarouselOptions, ContentBlock } from "@/types";

// Mock localStorage
const mockLocalStorage = (() => {
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
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

// Test data factories
function createContentBlock(
  overrides: Partial<ContentBlock> = {}
): ContentBlock {
  return {
    type: "text",
    id: "block-1",
    content: "Test content",
    ...overrides,
  } as ContentBlock;
}

function createCarouselItem(
  overrides: Partial<CarouselItem> = {}
): CarouselItem {
  return {
    id: "item-1",
    type: "content",
    content: createContentBlock(),
    moduleSlug: "test-module",
    isPremium: false,
    order: 0,
    ...overrides,
  };
}

function createOptions(overrides: Partial<CarouselOptions> = {}): CarouselOptions {
  return {
    companySlug: "test-company",
    roleSlug: "test-role",
    items: [
      createCarouselItem({ id: "item-1", order: 0 }),
      createCarouselItem({ id: "item-2", order: 1 }),
      createCarouselItem({ id: "item-3", order: 2 }),
    ],
    ...overrides,
  };
}

// Wrapper component for testing hooks
function createWrapper(options: CarouselOptions, enableSupabaseSync = true) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <CarouselProvider options={options} enableSupabaseSync={enableSupabaseSync}>
        {children}
      </CarouselProvider>
    );
  };
}

describe("CarouselProvider", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    test("initializes at index 0", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.currentIndex).toBe(0);
    });

    test("initializes with initialIndex option", () => {
      const options = createOptions({ initialIndex: 2 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.currentIndex).toBe(2);
    });

    test("initializes with empty completedItems", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.completedItems.size).toBe(0);
    });

    test("initializes with initialCompletedItems option", () => {
      const options = createOptions({
        initialCompletedItems: ["item-1", "item-2"],
      });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.completedItems.size).toBe(2);
      expect(result.current.state.completedItems.has("item-1")).toBe(true);
      expect(result.current.state.completedItems.has("item-2")).toBe(true);
    });

    test("provides currentItem", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.currentItem).toEqual(options.items[0]);
    });

    test("provides totalItems", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.totalItems).toBe(3);
    });

    test("provides companySlug and roleSlug", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.companySlug).toBe("test-company");
      expect(result.current.roleSlug).toBe("test-role");
    });
  });

  describe("next navigation", () => {
    test("next increments currentIndex", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.currentIndex).toBe(0);

      act(() => {
        result.current.next();
      });

      expect(result.current.state.currentIndex).toBe(1);
    });

    test("next does not exceed last item", () => {
      const options = createOptions({ initialIndex: 2 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.currentIndex).toBe(2);
      expect(result.current.isLastItem).toBe(true);

      act(() => {
        result.current.next();
      });

      expect(result.current.state.currentIndex).toBe(2); // Unchanged
    });

    test("next sets lastDirection to next", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.next();
      });

      expect(result.current.state.lastDirection).toBe("next");
    });
  });

  describe("prev navigation", () => {
    test("prev decrements currentIndex", () => {
      const options = createOptions({ initialIndex: 2 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.currentIndex).toBe(2);

      act(() => {
        result.current.prev();
      });

      expect(result.current.state.currentIndex).toBe(1);
    });

    test("prev does not go below 0", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.currentIndex).toBe(0);
      expect(result.current.isFirstItem).toBe(true);

      act(() => {
        result.current.prev();
      });

      expect(result.current.state.currentIndex).toBe(0); // Unchanged
    });

    test("prev sets lastDirection to prev", () => {
      const options = createOptions({ initialIndex: 2 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.prev();
      });

      expect(result.current.state.lastDirection).toBe("prev");
    });
  });

  describe("goTo navigation", () => {
    test("goTo navigates to specific index", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.goTo(2);
      });

      expect(result.current.state.currentIndex).toBe(2);
    });

    test("goTo ignores invalid negative index", () => {
      const options = createOptions({ initialIndex: 1 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.goTo(-1);
      });

      expect(result.current.state.currentIndex).toBe(1); // Unchanged
    });

    test("goTo ignores index beyond items length", () => {
      const options = createOptions({ initialIndex: 1 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.goTo(10);
      });

      expect(result.current.state.currentIndex).toBe(1); // Unchanged
    });

    test("goTo sets correct lastDirection when going forward", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.goTo(2);
      });

      expect(result.current.state.lastDirection).toBe("next");
    });

    test("goTo sets correct lastDirection when going backward", () => {
      const options = createOptions({ initialIndex: 2 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.goTo(0);
      });

      expect(result.current.state.lastDirection).toBe("prev");
    });
  });

  describe("markComplete", () => {
    test("markComplete adds item to completedItems", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.completedItems.has("item-1")).toBe(false);

      act(() => {
        result.current.markComplete("item-1");
      });

      expect(result.current.state.completedItems.has("item-1")).toBe(true);
    });

    test("markComplete updates completedCount", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.completedCount).toBe(0);

      act(() => {
        result.current.markComplete("item-1");
        result.current.markComplete("item-2");
      });

      expect(result.current.completedCount).toBe(2);
    });

    test("markComplete is idempotent", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.markComplete("item-1");
        result.current.markComplete("item-1");
        result.current.markComplete("item-1");
      });

      expect(result.current.state.completedItems.size).toBe(1);
    });
  });

  describe("pause and resume", () => {
    test("pause sets isPaused to true", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.isPaused).toBe(false);

      act(() => {
        result.current.pause();
      });

      expect(result.current.state.isPaused).toBe(true);
    });

    test("resume sets isPaused to false", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.state.isPaused).toBe(true);

      act(() => {
        result.current.resume();
      });

      expect(result.current.state.isPaused).toBe(false);
    });
  });

  describe("progress", () => {
    test("progress returns correct percentage", () => {
      const options = createOptions(); // 3 items
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.progress).toBe(0);

      act(() => {
        result.current.markComplete("item-1");
      });

      expect(result.current.progress).toBe(33); // 1/3 ≈ 33%

      act(() => {
        result.current.markComplete("item-2");
      });

      expect(result.current.progress).toBe(67); // 2/3 ≈ 67%

      act(() => {
        result.current.markComplete("item-3");
      });

      expect(result.current.progress).toBe(100); // 3/3 = 100%
    });

    test("progress handles empty items", () => {
      const options = createOptions({ items: [] });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.progress).toBe(0);
    });
  });

  describe("canGoNext and canGoPrev", () => {
    test("canGoNext true when not at last item", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.canGoNext).toBe(true);
    });

    test("canGoNext false when at last item", () => {
      const options = createOptions({ initialIndex: 2 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.isLastItem).toBe(true);
      expect(result.current.canGoNext).toBe(false);
    });

    test("canGoPrev false when at first item", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.isFirstItem).toBe(true);
      expect(result.current.canGoPrev).toBe(false);
    });

    test("canGoPrev true when not at first item", () => {
      const options = createOptions({ initialIndex: 1 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.canGoPrev).toBe(true);
    });
  });

  describe("paywall behavior", () => {
    test("isAtPaywall false when no paywall", () => {
      const options = createOptions({ paywallIndex: null });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.isAtPaywall).toBe(false);
    });

    test("isAtPaywall false when before paywall", () => {
      const options = createOptions({ paywallIndex: 2, initialIndex: 0 });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.isAtPaywall).toBe(false);
    });

    test("isAtPaywall true when at paywall without access", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 1,
        hasPremiumAccess: false,
      });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.isAtPaywall).toBe(true);
    });

    test("isAtPaywall false when at paywall with premium access", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 1,
        hasPremiumAccess: true,
      });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.isAtPaywall).toBe(false);
    });

    test("canGoNext false when next would hit paywall without access", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: false,
      });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.canGoNext).toBe(false);
    });

    test("canGoNext true when has premium access past paywall", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: true,
      });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.canGoNext).toBe(true);
    });

    test("goTo blocked by paywall without access", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: false,
      });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.goTo(2); // Try to go past paywall
      });

      expect(result.current.state.currentIndex).toBe(0); // Unchanged
    });

    test("goTo allowed past paywall with access", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: true,
      });
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.goTo(2);
      });

      expect(result.current.state.currentIndex).toBe(2);
    });
  });

  describe("localStorage persistence", () => {
    test("persists to localStorage on index change", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.next();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedKey = "carousel-test-company-test-role";
      const stored = JSON.parse(mockLocalStorage.store[storedKey]!);
      expect(stored.currentIndex).toBe(1);
    });

    test("persists completedItems to localStorage", () => {
      const options = createOptions();
      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.markComplete("item-1");
      });

      const storedKey = "carousel-test-company-test-role";
      const stored = JSON.parse(mockLocalStorage.store[storedKey]!);
      expect(stored.completedItems).toContain("item-1");
    });

    test("loads persisted state on mount", () => {
      const options = createOptions();
      const storedProgress = {
        companySlug: "test-company",
        roleSlug: "test-role",
        currentIndex: 2,
        completedItems: ["item-1", "item-2"],
        lastUpdated: Date.now(),
      };
      mockLocalStorage.store["carousel-test-company-test-role"] =
        JSON.stringify(storedProgress);

      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.state.currentIndex).toBe(2);
      expect(result.current.state.completedItems.has("item-1")).toBe(true);
      expect(result.current.state.completedItems.has("item-2")).toBe(true);
    });

    test("handles invalid localStorage data gracefully", () => {
      const options = createOptions();
      mockLocalStorage.store["carousel-test-company-test-role"] = "invalid-json";

      const { result } = renderHook(() => useCarousel(), {
        wrapper: createWrapper(options),
      });

      // Should fall back to defaults
      expect(result.current.state.currentIndex).toBe(0);
      expect(result.current.state.completedItems.size).toBe(0);
    });
  });

  describe("useCarousel outside provider", () => {
    test("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCarousel());
      }).toThrow("useCarousel must be used within a CarouselProvider");

      consoleSpy.mockRestore();
    });
  });
});

describe("CarouselProvider rendering", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test("renders children", () => {
    const options = createOptions();
    render(
      <CarouselProvider options={options}>
        <div data-testid="child">Child content</div>
      </CarouselProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  test("provides context to nested components", () => {
    const options = createOptions();

    function NestedComponent() {
      const { state, totalItems, companySlug } = useCarousel();
      return (
        <div data-testid="nested">
          Item {state.currentIndex + 1} of {totalItems} ({companySlug})
        </div>
      );
    }

    render(
      <CarouselProvider options={options}>
        <NestedComponent />
      </CarouselProvider>
    );

    expect(screen.getByTestId("nested")).toHaveTextContent(
      "Item 1 of 3 (test-company)"
    );
  });
});

describe("Supabase sync integration", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test("enableSupabaseSync defaults to true", () => {
    const options = createOptions();
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    // Just verify the hook works with default settings
    expect(result.current.state.currentIndex).toBe(0);
  });

  test("works with enableSupabaseSync=false", () => {
    const options = createOptions();

    function WrapperWithSyncDisabled({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <CarouselProvider options={options} enableSupabaseSync={false}>
          {children}
        </CarouselProvider>
      );
    }

    const { result } = renderHook(() => useCarousel(), {
      wrapper: WrapperWithSyncDisabled,
    });

    expect(result.current.state.currentIndex).toBe(0);

    act(() => {
      result.current.next();
    });

    expect(result.current.state.currentIndex).toBe(1);
  });

  test("state changes are persisted to localStorage even with Supabase sync enabled", () => {
    const options = createOptions();
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    act(() => {
      result.current.markComplete("item-1");
    });

    // Check localStorage was called
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });
});

describe("isFirstItem and isLastItem", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test("isFirstItem true at index 0", () => {
    const options = createOptions();
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    expect(result.current.isFirstItem).toBe(true);
  });

  test("isFirstItem false when not at index 0", () => {
    const options = createOptions({ initialIndex: 1 });
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    expect(result.current.isFirstItem).toBe(false);
  });

  test("isLastItem true at last index", () => {
    const options = createOptions({ initialIndex: 2 });
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    expect(result.current.isLastItem).toBe(true);
  });

  test("isLastItem false when not at last index", () => {
    const options = createOptions();
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    expect(result.current.isLastItem).toBe(false);
  });
});

describe("empty items handling", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test("currentItem is null with empty items", () => {
    const options = createOptions({ items: [] });
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    expect(result.current.currentItem).toBeNull();
  });

  test("totalItems is 0 with empty items", () => {
    const options = createOptions({ items: [] });
    const { result } = renderHook(() => useCarousel(), {
      wrapper: createWrapper(options),
    });

    expect(result.current.totalItems).toBe(0);
  });
});
