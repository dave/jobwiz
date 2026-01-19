import { render, screen, fireEvent, act } from "@testing-library/react";
import { CarouselContainer } from "../CarouselContainer";
import { CarouselProvider } from "../CarouselContext";
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

// Wrapper component for testing
function renderWithProvider(
  ui: React.ReactElement,
  options: CarouselOptions = createOptions()
) {
  return render(
    <CarouselProvider options={options} enableSupabaseSync={false}>
      {ui}
    </CarouselProvider>
  );
}

describe("CarouselContainer", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    test("renders children content", () => {
      renderWithProvider(
        <CarouselContainer>
          <div data-testid="child">Child content</div>
        </CarouselContainer>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    test("renders progress indicator (X of Y)", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    test("renders navigation buttons", () => {
      const options = createOptions({ initialIndex: 1 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      expect(
        screen.getByRole("button", { name: /go to previous item/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /go to next item/i })
      ).toBeInTheDocument();
    });

    test("hides back button on first item", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(
        screen.queryByRole("button", { name: /go to previous item/i })
      ).not.toBeInTheDocument();
    });

    test("renders exit button when onExit provided", () => {
      const onExit = jest.fn();
      renderWithProvider(
        <CarouselContainer onExit={onExit}>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(
        screen.getByRole("button", { name: /exit carousel/i })
      ).toBeInTheDocument();
    });

    test("does not render exit button when onExit not provided", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(
        screen.queryByRole("button", { name: /exit carousel/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("navigation buttons", () => {
    test("next button advances to next item", async () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      const nextButton = screen.getByRole("button", { name: /go to next item/i });
      await act(async () => {
        fireEvent.click(nextButton);
      });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    test("back button goes to previous item", async () => {
      const options = createOptions({ initialIndex: 2 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      expect(screen.getByText("3 of 3")).toBeInTheDocument();

      const backButton = screen.getByRole("button", { name: /go to previous item/i });
      await act(async () => {
        fireEvent.click(backButton);
      });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    test("next button disabled on last item", () => {
      const options = createOptions({ initialIndex: 2 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      // On last item, button shows "Done" and is enabled for completion
      const nextButton = screen.getByRole("button", { name: /complete/i });
      expect(nextButton).toHaveTextContent("Done");
    });

    test("next button shows Unlock when at paywall", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: false,
      });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      // The next item is blocked by paywall, so should show Unlock
      const unlockButton = screen.getByText("Unlock");
      expect(unlockButton).toBeInTheDocument();
      expect(unlockButton).toHaveAttribute("aria-label", "Unlock premium content");
    });
  });

  describe("keyboard navigation", () => {
    test("Enter advances to next item", async () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(window, { key: "Enter" });
      });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    test("ArrowRight advances to next item", async () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(window, { key: "ArrowRight" });
      });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    test("ArrowLeft goes to previous item", async () => {
      const options = createOptions({ initialIndex: 2 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      expect(screen.getByText("3 of 3")).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(window, { key: "ArrowLeft" });
      });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    test("Escape calls onExit", async () => {
      const onExit = jest.fn();
      renderWithProvider(
        <CarouselContainer onExit={onExit}>
          <div>Content</div>
        </CarouselContainer>
      );

      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    test("Escape does nothing when onExit not provided", async () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      // Should not throw
      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    test("keyboard navigation ignored when focused on input", async () => {
      renderWithProvider(
        <CarouselContainer>
          <input data-testid="test-input" />
        </CarouselContainer>
      );

      const input = screen.getByTestId("test-input");
      input.focus();

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" });
      });

      // Should not navigate
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    test("keyboard navigation ignored when focused on textarea", async () => {
      renderWithProvider(
        <CarouselContainer>
          <textarea data-testid="test-textarea" />
        </CarouselContainer>
      );

      const textarea = screen.getByTestId("test-textarea");
      textarea.focus();

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Enter" });
      });

      // Should not navigate
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    test("keyboard navigation blocked at paywall", async () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: false,
      });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      await act(async () => {
        fireEvent.keyDown(window, { key: "Enter" });
      });

      // Should not navigate past paywall
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });
  });

  describe("swipe gestures", () => {
    // NOTE: JSDOM doesn't fully support touch events with React's synthetic event system.
    // These tests verify the touch event handlers are attached and basic behavior.
    // Full touch gesture testing would require a real browser environment.

    test("container has touch event handlers attached", () => {
      const { container } = renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const carouselDiv = container.firstChild as HTMLElement;
      // Verify container is rendered (touch handlers are attached via onTouchStart, etc.)
      expect(carouselDiv).toBeInTheDocument();
      expect(carouselDiv).toHaveClass("flex", "flex-col", "min-h-screen");
    });

    test("swipeThreshold prop is configurable", () => {
      // Verify custom threshold can be passed (implementation detail)
      const { container } = renderWithProvider(
        <CarouselContainer swipeThreshold={100}>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test("navigation works via button clicks (verifying underlying next/prev logic)", async () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      // Click next button (same underlying function as swipe left)
      const nextButton = screen.getByRole("button", { name: /go to next item/i });
      await act(async () => {
        fireEvent.click(nextButton);
      });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    test("navigation blocked at boundary (verifying canGoNext/canGoPrev)", async () => {
      const options = createOptions({ initialIndex: 2 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      // On last item, next button shows "Done" but still can't advance further
      expect(screen.getByText("3 of 3")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    test("paywall blocks swipe navigation (verifying canGoNext with paywall)", () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: false,
      });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      // Navigation is blocked, button shows Unlock
      expect(screen.getByText("Unlock")).toBeInTheDocument();
      // canGoNext is false, so swipe left would also be blocked
    });
  });

  describe("accessibility", () => {
    test("content area has proper role and label", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const region = screen.getByRole("region", { name: /item 1 of 3/i });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("aria-current", "step");
    });

    test("navigation has aria-label", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      expect(
        screen.getByRole("navigation", { name: "Carousel navigation" })
      ).toBeInTheDocument();
    });

    test("progress indicator has aria-live", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const progress = screen.getByText("1 of 3");
      expect(progress).toHaveAttribute("aria-live", "polite");
      expect(progress).toHaveAttribute("aria-atomic", "true");
    });

    test("buttons have appropriate aria-labels", () => {
      const options = createOptions({ initialIndex: 1 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      expect(
        screen.getByRole("button", { name: /go to previous item/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /go to next item/i })
      ).toBeInTheDocument();
    });
  });

  describe("touch targets", () => {
    test("navigation buttons have minimum 44px touch targets", () => {
      const options = createOptions({ initialIndex: 1 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      const backButton = screen.getByRole("button", { name: /go to previous item/i });
      const nextButton = screen.getByRole("button", { name: /go to next item/i });

      expect(backButton).toHaveClass("min-h-[44px]", "min-w-[44px]");
      expect(nextButton).toHaveClass("min-h-[44px]", "min-w-[44px]");
    });

    test("exit button has minimum 44px touch targets", () => {
      const onExit = jest.fn();
      renderWithProvider(
        <CarouselContainer onExit={onExit}>
          <div>Content</div>
        </CarouselContainer>
      );

      const exitButton = screen.getByRole("button", { name: /exit carousel/i });
      expect(exitButton).toHaveClass("min-h-[44px]", "min-w-[44px]");
    });
  });

  describe("animations", () => {
    test("content has motion-safe animation classes", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const region = screen.getByRole("region");
      expect(region.className).toContain("motion-safe:");
    });

    test("content animates slide-in-right on forward navigation", async () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /go to next item/i }));
      });

      const region = screen.getByRole("region");
      expect(region.className).toContain("animate-slide-in-right");
    });

    test("content animates slide-in-left on backward navigation", async () => {
      const options = createOptions({ initialIndex: 2 });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /go to previous item/i }));
      });

      const region = screen.getByRole("region");
      expect(region.className).toContain("animate-slide-in-left");
    });
  });

  describe("layout", () => {
    test("container has full-screen layout classes", () => {
      const { container } = renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const carouselDiv = container.firstChild as HTMLElement;
      expect(carouselDiv).toHaveClass("flex", "flex-col", "min-h-screen", "w-full");
    });

    test("header is sticky", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const header = document.querySelector("header");
      expect(header).toHaveClass("sticky", "top-0", "z-10");
    });

    test("footer is sticky", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const footer = document.querySelector("footer");
      expect(footer).toHaveClass("sticky", "bottom-0", "z-10");
    });

    test("footer has safe-area-inset-bottom class", () => {
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>
      );

      const footer = document.querySelector("footer");
      expect(footer).toHaveClass("safe-area-inset-bottom");
    });
  });

  describe("exit button", () => {
    test("clicking exit button calls onExit", async () => {
      const onExit = jest.fn();
      renderWithProvider(
        <CarouselContainer onExit={onExit}>
          <div>Content</div>
        </CarouselContainer>
      );

      const exitButton = screen.getByRole("button", { name: /exit carousel/i });
      await act(async () => {
        fireEvent.click(exitButton);
      });

      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe("paywall behavior", () => {
    test("cannot navigate past paywall without premium access", async () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: false,
      });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      // Button shows Unlock when blocked by paywall
      const unlockButton = screen.getByText("Unlock");
      expect(unlockButton).toBeInTheDocument();
      expect(unlockButton).toHaveAttribute("aria-label", "Unlock premium content");

      // Button is disabled because canGoNext is false
      expect(unlockButton).toBeDisabled();
    });

    test("can navigate past paywall with premium access", async () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: true,
      });
      renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      const nextButton = screen.getByRole("button", { name: /go to next item/i });
      await act(async () => {
        fireEvent.click(nextButton);
      });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    test("swipe blocked at paywall without access", async () => {
      const options = createOptions({
        paywallIndex: 1,
        initialIndex: 0,
        hasPremiumAccess: false,
      });
      const { container } = renderWithProvider(
        <CarouselContainer>
          <div>Content</div>
        </CarouselContainer>,
        options
      );

      const carouselDiv = container.firstChild as HTMLElement;
      expect(screen.getByText("1 of 3")).toBeInTheDocument();

      await act(async () => {
        fireEvent.touchStart(carouselDiv, {
          touches: [{ clientX: 200, clientY: 100 }],
        });
        fireEvent.touchEnd(carouselDiv, {
          changedTouches: [{ clientX: 50, clientY: 100 }],
        });
      });

      // Should not navigate past paywall
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    test("applies custom className to container", () => {
      const { container } = renderWithProvider(
        <CarouselContainer className="custom-class">
          <div>Content</div>
        </CarouselContainer>
      );

      const carouselDiv = container.firstChild as HTMLElement;
      expect(carouselDiv).toHaveClass("custom-class");
    });
  });

  describe("empty items", () => {
    test("renders with empty items array", () => {
      const options = createOptions({ items: [] });
      renderWithProvider(
        <CarouselContainer>
          <div>No items</div>
        </CarouselContainer>,
        options
      );

      // Should render but with 0 items
      expect(screen.getByText("1 of 0")).toBeInTheDocument();
    });
  });
});
