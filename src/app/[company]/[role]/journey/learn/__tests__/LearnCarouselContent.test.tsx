import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LearnCarouselContent } from "../LearnCarouselContent";
import type { CarouselItem } from "@/types/carousel";
import type { ContentBlock } from "@/types/module";
import type { FlattenResult } from "@/lib/carousel";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

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

function createFlattenResult(
  overrides: Partial<FlattenResult> = {}
): FlattenResult {
  return {
    items: [
      createCarouselItem({ id: "item-1", order: 0 }),
      createCarouselItem({ id: "item-2", order: 1 }),
      createCarouselItem({ id: "item-3", order: 2 }),
    ],
    paywallIndex: null,
    totalItems: 3,
    ...overrides,
  };
}

describe("LearnCarouselContent", () => {
  const defaultProps = {
    companySlug: "google",
    roleSlug: "software-engineer",
    companyName: "Google",
    roleName: "Software Engineer",
    flattenedResult: createFlattenResult(),
    hasPremiumAccess: false,
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the carousel container when items are provided", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      // Should show the carousel with progress indicator
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    it("renders 'Content Coming Soon' when no items provided", () => {
      render(
        <LearnCarouselContent
          {...defaultProps}
          flattenedResult={{ items: [], paywallIndex: null, totalItems: 0 }}
        />
      );

      expect(screen.getByText("Content Coming Soon")).toBeInTheDocument();
      expect(
        screen.getByText(/We're preparing your Google Software Engineer/)
      ).toBeInTheDocument();
    });

    it("renders 'Content Coming Soon' when flattenedResult is null", () => {
      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={null} />
      );

      expect(screen.getByText("Content Coming Soon")).toBeInTheDocument();
    });

    it("renders back link in empty state", () => {
      render(
        <LearnCarouselContent
          {...defaultProps}
          flattenedResult={{ items: [], paywallIndex: null, totalItems: 0 }}
        />
      );

      const backLink = screen.getByRole("link", {
        name: /Back to Journey Overview/i,
      });
      expect(backLink).toHaveAttribute(
        "href",
        "/google/software-engineer/journey"
      );
    });
  });

  describe("Navigation", () => {
    it("displays exit button", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      const exitButton = screen.getByRole("button", {
        name: /Exit carousel/i,
      });
      expect(exitButton).toBeInTheDocument();
    });

    it("navigates to journey overview on exit", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      const exitButton = screen.getByRole("button", {
        name: /Exit carousel/i,
      });
      fireEvent.click(exitButton);

      expect(mockPush).toHaveBeenCalledWith("/google/software-engineer/journey");
    });

    it("displays Next button", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      const nextButton = screen.getByRole("button", { name: /Go to next item/i });
      expect(nextButton).toBeInTheDocument();
    });

    it("advances on Next button click", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      const nextButton = screen.getByRole("button", { name: /Go to next item/i });
      fireEvent.click(nextButton);

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    it("shows Back button after advancing", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      // Initially no Back button on first item
      expect(
        screen.queryByRole("button", { name: /Go to previous item/i })
      ).not.toBeInTheDocument();

      // Advance to second item
      const nextButton = screen.getByRole("button", { name: /Go to next item/i });
      fireEvent.click(nextButton);

      // Now Back button should appear
      expect(
        screen.getByRole("button", { name: /Go to previous item/i })
      ).toBeInTheDocument();
    });

    it("supports keyboard navigation - ArrowRight to advance", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    it("supports keyboard navigation - Escape to exit", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockPush).toHaveBeenCalledWith("/google/software-engineer/journey");
    });
  });

  describe("Content Rendering", () => {
    it("renders text content items", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "text-item",
            content: createContentBlock({
              type: "text",
              content: "This is test text content",
            }),
          }),
        ],
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      expect(screen.getByText("This is test text content")).toBeInTheDocument();
    });

    it("renders header content items", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "header-item",
            content: {
              type: "header",
              id: "h1",
              content: "Welcome to Interview Prep",
              level: 1,
            } as ContentBlock,
          }),
        ],
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      expect(
        screen.getByRole("heading", { name: "Welcome to Interview Prep" })
      ).toBeInTheDocument();
    });

    it("renders tip content items", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "tip-item",
            content: {
              type: "tip",
              id: "tip-1",
              content: "Remember to STAR your answers",
            } as ContentBlock,
          }),
        ],
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      expect(screen.getByText("Pro Tip")).toBeInTheDocument();
      expect(
        screen.getByText(/Remember to STAR your answers/)
      ).toBeInTheDocument();
    });

    it("renders quiz items", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "quiz-item",
            type: "quiz",
            content: {
              type: "quiz",
              id: "q1",
              question: "What does STAR stand for?",
              options: [
                { id: "a", text: "Situation, Task, Action, Result", isCorrect: true },
                { id: "b", text: "Stop, Think, Act, Review", isCorrect: false },
              ],
              explanation: "STAR is the standard behavioral interview format",
            } as ContentBlock,
          }),
        ],
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      expect(screen.getByText("What does STAR stand for?")).toBeInTheDocument();
      expect(
        screen.getByText("Situation, Task, Action, Result")
      ).toBeInTheDocument();
    });
  });

  describe("Paywall", () => {
    it("renders paywall item at correct position", () => {
      // Add more free items before paywall so we can navigate to it
      const result = createFlattenResult({
        items: [
          createCarouselItem({ id: "free-1", order: 0 }),
          createCarouselItem({ id: "free-2", order: 1 }),
          createCarouselItem({
            id: "paywall",
            type: "paywall",
            order: 2,
            content: createContentBlock({
              type: "text",
              content: "Unlock premium content",
            }),
          }),
          createCarouselItem({ id: "premium-1", order: 3, isPremium: true }),
        ],
        paywallIndex: 2,
        totalItems: 4,
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      // Navigate to item before paywall
      const nextButton = screen.getByRole("button", { name: /Go to next item/i });
      fireEvent.click(nextButton);

      expect(screen.getByText("2 of 4")).toBeInTheDocument();
      // At item 2, next item is paywall so should show Unlock
      expect(screen.getByText("Unlock")).toBeInTheDocument();
    });

    it("blocks navigation past paywall without premium access", () => {
      // Add more free items before paywall
      const result = createFlattenResult({
        items: [
          createCarouselItem({ id: "free-1", order: 0 }),
          createCarouselItem({ id: "free-2", order: 1 }),
          createCarouselItem({
            id: "paywall",
            type: "paywall",
            order: 2,
            content: createContentBlock({
              type: "text",
              content: "Unlock premium content",
            }),
          }),
          createCarouselItem({ id: "premium-1", order: 3, isPremium: true }),
        ],
        paywallIndex: 2,
        totalItems: 4,
      });

      render(
        <LearnCarouselContent
          {...defaultProps}
          flattenedResult={result}
          hasPremiumAccess={false}
        />
      );

      // Navigate to item before paywall
      const nextButton = screen.getByRole("button", { name: /Go to next item/i });
      fireEvent.click(nextButton);

      // Should show Unlock button instead of Next (because next item is paywall)
      expect(screen.getByText("Unlock")).toBeInTheDocument();
    });

    it("allows navigation past paywall with premium access", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({ id: "free-1", order: 0 }),
          createCarouselItem({
            id: "paywall",
            type: "paywall",
            order: 1,
            content: createContentBlock({
              type: "text",
              content: "Unlock premium content",
            }),
          }),
          createCarouselItem({
            id: "premium-1",
            order: 2,
            isPremium: true,
            content: createContentBlock({
              type: "text",
              content: "Premium content here",
            }),
          }),
        ],
        paywallIndex: 1,
      });

      render(
        <LearnCarouselContent
          {...defaultProps}
          flattenedResult={result}
          hasPremiumAccess={true}
        />
      );

      // Navigate past paywall
      const nextButton = screen.getByRole("button", { name: /Go to next item/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      // Should show premium content
      expect(screen.getByText("3 of 3")).toBeInTheDocument();
      expect(screen.getByText("Premium content here")).toBeInTheDocument();
    });
  });

  describe("Completion", () => {
    it("shows Done button on last item", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({ id: "item-1", order: 0 }),
          createCarouselItem({ id: "item-2", order: 1 }),
        ],
        totalItems: 2,
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      // Navigate to last item
      const nextButton = screen.getByRole("button", { name: /Go to next item/i });
      fireEvent.click(nextButton);

      // Should show Done instead of Next
      expect(screen.getByRole("button", { name: /Complete/i })).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible progress indicator", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      const progressIndicator = screen.getByText("1 of 3");
      expect(progressIndicator).toHaveAttribute("aria-live", "polite");
    });

    it("has accessible navigation buttons", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /Exit carousel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Go to next item/i })
      ).toBeInTheDocument();
    });

    it("marks current content region", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      const contentRegion = screen.getByRole("region", {
        name: /Item 1 of 3/i,
      });
      expect(contentRegion).toHaveAttribute("aria-current", "step");
    });
  });

  describe("Props", () => {
    it("uses provided company and role slugs", () => {
      render(
        <LearnCarouselContent
          {...defaultProps}
          companySlug="amazon"
          roleSlug="product-manager"
        />
      );

      const exitButton = screen.getByRole("button", {
        name: /Exit carousel/i,
      });
      fireEvent.click(exitButton);

      expect(mockPush).toHaveBeenCalledWith("/amazon/product-manager/journey");
    });

    it("uses provided company and role names in empty state", () => {
      render(
        <LearnCarouselContent
          {...defaultProps}
          companyName="Amazon"
          roleName="Product Manager"
          flattenedResult={null}
        />
      );

      expect(
        screen.getByText(/We're preparing your Amazon Product Manager/)
      ).toBeInTheDocument();
    });
  });
});
