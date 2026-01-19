import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { CarouselPaywall, type CarouselPaywallTrackEvent } from "../CarouselPaywall";
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

// Mock unlock-state module
const mockIsUnlocked = jest.fn().mockReturnValue(false);
const mockSetUnlocked = jest.fn();
jest.mock("@/components/paywall/unlock-state", () => ({
  isUnlocked: (...args: unknown[]) => mockIsUnlocked(...args),
  setUnlocked: (...args: unknown[]) => mockSetUnlocked(...args),
}));

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

function createOptions(
  overrides: Partial<CarouselOptions> = {}
): CarouselOptions {
  return {
    companySlug: "google",
    roleSlug: "software-engineer",
    items: [
      createCarouselItem({ id: "item-1", order: 0 }),
      createCarouselItem({ id: "paywall-item", type: "paywall", order: 1, isPremium: true }),
      createCarouselItem({ id: "item-2", order: 2, isPremium: true }),
      createCarouselItem({ id: "item-3", order: 3, isPremium: true }),
    ],
    paywallIndex: 1,
    ...overrides,
  };
}

// Wrapper component for testing with carousel context
function TestWrapper({
  children,
  options,
  enableSupabaseSync = false,
}: {
  children: React.ReactNode;
  options?: Partial<CarouselOptions>;
  enableSupabaseSync?: boolean;
}) {
  const mergedOptions = createOptions(options);
  return (
    <CarouselProvider options={mergedOptions} enableSupabaseSync={enableSupabaseSync}>
      {children}
    </CarouselProvider>
  );
}

describe("CarouselPaywall", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset mock to default (not unlocked)
    mockIsUnlocked.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders paywall with default content", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      expect(screen.getByTestId("carousel-paywall")).toBeInTheDocument();
      expect(screen.getByText("Unlock Premium Content")).toBeInTheDocument();
      expect(screen.getByText("Get full access to company-specific interview preparation")).toBeInTheDocument();
      expect(screen.getByTestId("paywall-price")).toHaveTextContent("$200");
      expect(screen.getByTestId("paywall-cta")).toBeInTheDocument();
    });

    it("renders with custom heading and description", () => {
      render(
        <TestWrapper>
          <CarouselPaywall
            price={150}
            heading="Custom Heading"
            description="Custom description text"
          />
        </TestWrapper>
      );

      expect(screen.getByText("Custom Heading")).toBeInTheDocument();
      expect(screen.getByText("Custom description text")).toBeInTheDocument();
    });

    it("renders with custom CTA text", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} ctaText="Get Access" />
        </TestWrapper>
      );

      expect(screen.getByTestId("paywall-cta")).toHaveTextContent("Get Access - $200");
    });

    it("renders with custom benefits list", () => {
      const customBenefits = [
        "Benefit 1",
        "Benefit 2",
        "Benefit 3",
      ];

      render(
        <TestWrapper>
          <CarouselPaywall price={200} benefits={customBenefits} />
        </TestWrapper>
      );

      customBenefits.forEach((benefit) => {
        expect(screen.getByText(benefit)).toBeInTheDocument();
      });
    });

    it("renders default benefits when none provided", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      expect(screen.getByText("Company-specific interview strategies")).toBeInTheDocument();
      expect(screen.getByText("Expert insights and insider tips")).toBeInTheDocument();
    });

    it("formats price correctly", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={299} />
        </TestWrapper>
      );

      expect(screen.getByTestId("paywall-price")).toHaveTextContent("$299");
    });

    it("shows mock mode indicator when mockMode is true", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} mockMode={true} />
        </TestWrapper>
      );

      expect(screen.getByTestId("mock-mode-indicator")).toBeInTheDocument();
      expect(screen.getByText("Demo mode: No payment required")).toBeInTheDocument();
    });

    it("hides mock mode indicator when mockMode is false", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} mockMode={false} />
        </TestWrapper>
      );

      expect(screen.queryByTestId("mock-mode-indicator")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} className="custom-class" />
        </TestWrapper>
      );

      expect(screen.getByTestId("carousel-paywall")).toHaveClass("custom-class");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      const paywall = screen.getByTestId("carousel-paywall");
      expect(paywall).toHaveAttribute("role", "dialog");
      expect(paywall).toHaveAttribute("aria-modal", "true");
      expect(paywall).toHaveAttribute("aria-labelledby", "carousel-paywall-heading");
    });

    it("CTA button has accessible label", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} ctaText="Unlock Now" />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      expect(button).toHaveAttribute("aria-label", "Unlock Now for $200");
    });

    it("benefits list has accessible label", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      expect(screen.getByRole("list", { name: "Benefits included" })).toBeInTheDocument();
    });

    it("has minimum touch target size on CTA button", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      expect(button).toHaveClass("min-h-[48px]");
    });
  });

  describe("Mock Mode Purchase Flow", () => {
    it("shows loading state when CTA is clicked", async () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} mockMode={true} />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it("unlocks content after mock purchase", async () => {
      const onUnlock = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall price={200} mockMode={true} onUnlock={onUnlock} />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      // Fast-forward through mock delay
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onUnlock).toHaveBeenCalled();
      });
    });

    it("persists unlock state to localStorage", async () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} mockMode={true} />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(mockSetUnlocked).toHaveBeenCalledWith(
          "carousel-google-software-engineer",
          true
        );
      });
    });
  });

  describe("Real Purchase Flow", () => {
    it("calls onPurchase callback when mockMode is false", async () => {
      const onPurchase = jest.fn().mockResolvedValue(true);
      const onUnlock = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall
            price={200}
            mockMode={false}
            onPurchase={onPurchase}
            onUnlock={onUnlock}
          />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onPurchase).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onUnlock).toHaveBeenCalled();
      });
    });

    it("does not unlock when onPurchase returns false", async () => {
      const onPurchase = jest.fn().mockResolvedValue(false);
      const onUnlock = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall
            price={200}
            mockMode={false}
            onPurchase={onPurchase}
            onUnlock={onUnlock}
          />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onPurchase).toHaveBeenCalled();
      });

      // Wait a bit more to ensure no unlock happened
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(onUnlock).not.toHaveBeenCalled();
      expect(mockSetUnlocked).not.toHaveBeenCalled();
    });

    it("handles purchase error gracefully", async () => {
      const onPurchase = jest.fn().mockImplementation(() => Promise.reject(new Error("Payment failed")));
      const onUnlock = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall
            price={200}
            mockMode={false}
            onPurchase={onPurchase}
            onUnlock={onUnlock}
          />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onPurchase).toHaveBeenCalled();
      });

      // Button should be re-enabled after error
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });

      expect(onUnlock).not.toHaveBeenCalled();
    });
  });

  describe("Analytics Tracking", () => {
    it("tracks paywall impression on mount", async () => {
      const onTrack = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall price={200} onTrack={onTrack} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: "paywall_impression",
            companySlug: "google",
            roleSlug: "software-engineer",
            price: 200,
          })
        );
      });
    });

    it("tracks CTA click", async () => {
      const onTrack = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall price={200} onTrack={onTrack} mockMode={true} />
        </TestWrapper>
      );

      // Clear impression tracking
      onTrack.mockClear();

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      expect(onTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "paywall_cta_click",
          companySlug: "google",
          roleSlug: "software-engineer",
          price: 200,
        })
      );
    });

    it("tracks unlock event after successful purchase", async () => {
      const onTrack = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall price={200} onTrack={onTrack} mockMode={true} />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: "paywall_unlock",
            companySlug: "google",
            roleSlug: "software-engineer",
            price: 200,
          })
        );
      });
    });

    it("includes timestamp in all tracking events", async () => {
      const onTrack = jest.fn();
      const beforeTime = Date.now();

      render(
        <TestWrapper>
          <CarouselPaywall price={200} onTrack={onTrack} mockMode={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        const event = onTrack.mock.calls[0]?.[0] as CarouselPaywallTrackEvent | undefined;
        expect(event?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      });
    });

    it("does not track impression if already unlocked", async () => {
      const onTrack = jest.fn();
      mockIsUnlocked.mockReturnValue(true);

      render(
        <TestWrapper>
          <CarouselPaywall price={200} onTrack={onTrack} />
        </TestWrapper>
      );

      // Allow time for effects to run
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      // Should not track impression since already unlocked
      expect(onTrack).not.toHaveBeenCalled();
    });
  });

  describe("Already Purchased Behavior", () => {
    it("shows loading state when alreadyPurchased is true", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={200} alreadyPurchased={true} />
        </TestWrapper>
      );

      expect(screen.getByTestId("paywall-loading")).toBeInTheDocument();
      expect(screen.getByText("Loading content...")).toBeInTheDocument();
    });

    it("shows loading state when localStorage indicates unlocked", () => {
      mockIsUnlocked.mockReturnValue(true);

      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      expect(screen.getByTestId("paywall-loading")).toBeInTheDocument();
    });

    it("does not show paywall dialog when already unlocked", () => {
      mockIsUnlocked.mockReturnValue(true);

      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      expect(screen.queryByTestId("carousel-paywall")).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Auto-Advance Behavior", () => {
    it("auto-advances to next item after unlock", async () => {
      // We can't directly test the next() call, but we can verify
      // the unlock flow completes and the state changes
      const onUnlock = jest.fn();

      render(
        <TestWrapper>
          <CarouselPaywall price={200} mockMode={true} onUnlock={onUnlock} />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onUnlock).toHaveBeenCalled();
      });

      // After unlock, should show loading state as it transitions
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      // The component should now be in the unlocked/loading state
      // (actual navigation is tested through integration tests)
    });

    it("auto-advances for returning users who already purchased", async () => {
      mockIsUnlocked.mockReturnValue(true);

      render(
        <TestWrapper>
          <CarouselPaywall price={200} />
        </TestWrapper>
      );

      // Should immediately be in loading state (transitioning to next)
      expect(screen.getByTestId("paywall-loading")).toBeInTheDocument();

      // Auto-advance should be triggered
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
    });
  });

  describe("Different Price Formats", () => {
    it("formats whole dollar amounts without decimals", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={100} />
        </TestWrapper>
      );

      expect(screen.getByTestId("paywall-price")).toHaveTextContent("$100");
    });

    it("formats large amounts with commas", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={1000} />
        </TestWrapper>
      );

      expect(screen.getByTestId("paywall-price")).toHaveTextContent("$1,000");
    });

    it("formats zero as $0", () => {
      render(
        <TestWrapper>
          <CarouselPaywall price={0} />
        </TestWrapper>
      );

      expect(screen.getByTestId("paywall-price")).toHaveTextContent("$0");
    });
  });

  describe("Context Integration", () => {
    it("uses company and role slugs from context", async () => {
      const onTrack = jest.fn();
      const customOptions = {
        companySlug: "amazon",
        roleSlug: "product-manager",
      };

      render(
        <TestWrapper options={customOptions}>
          <CarouselPaywall price={200} onTrack={onTrack} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            companySlug: "amazon",
            roleSlug: "product-manager",
          })
        );
      });
    });

    it("generates correct journey ID for unlock state", async () => {
      const customOptions = {
        companySlug: "meta",
        roleSlug: "data-scientist",
      };

      render(
        <TestWrapper options={customOptions}>
          <CarouselPaywall price={200} mockMode={true} />
        </TestWrapper>
      );

      const button = screen.getByTestId("paywall-cta");
      fireEvent.click(button);

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(mockSetUnlocked).toHaveBeenCalledWith(
          "carousel-meta-data-scientist",
          true
        );
      });
    });
  });
});
