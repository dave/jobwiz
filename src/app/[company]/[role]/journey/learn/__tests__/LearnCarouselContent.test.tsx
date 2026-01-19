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
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      exit,
      variants,
      transition,
      ...props
    }: React.ComponentPropsWithRef<"div"> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      variants?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
    button: ({
      children,
      initial,
      animate,
      exit,
      variants,
      transition,
      whileHover,
      whileTap,
      ...props
    }: React.ComponentPropsWithRef<"button"> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      variants?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
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

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = jest.fn();

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
    it("renders the conversation container when items are provided", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      // Should show the conversation container
      expect(screen.getByTestId("conversation-container")).toBeInTheDocument();
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
    it("supports keyboard navigation - Escape to exit", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockPush).toHaveBeenCalledWith("/google/software-engineer/journey");
    });
  });

  describe("Content Rendering", () => {
    it("renders text content items via ConversationalContent", () => {
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

      // Text content shows in conversation mode (may appear multiple times in messages + content)
      expect(screen.getAllByText("This is test text content").length).toBeGreaterThan(0);
    });

    it("renders header content items in big-question mode", () => {
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

    it("renders tip content items via ConversationalContent", () => {
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

      expect(screen.getAllByText("Pro Tip").length).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/Remember to STAR your answers/).length
      ).toBeGreaterThan(0);
    });

    it("renders quiz items via ConversationalQuiz", () => {
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

      // Quiz question and options appear (may be rendered in multiple places)
      expect(screen.getAllByText("What does STAR stand for?").length).toBeGreaterThan(0);
      expect(
        screen.getAllByText("Situation, Task, Action, Result").length
      ).toBeGreaterThan(0);
    });
  });

  describe("Paywall", () => {
    it("renders paywall component when at paywall item", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "paywall",
            type: "paywall",
            order: 0,
            content: createContentBlock({
              type: "text",
              content: "Unlock premium content",
            }),
          }),
        ],
        paywallIndex: 0,
        totalItems: 1,
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      // Paywall shows company-specific unlock message
      expect(screen.getByText(/Unlock Google Software Engineer Prep/i)).toBeInTheDocument();
    });
  });

  describe("Display Modes", () => {
    it("uses big-question mode for video content", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "video-item",
            content: {
              type: "video",
              id: "v1",
              url: "https://www.youtube.com/watch?v=test123",
              title: "Test Video",
            } as ContentBlock,
          }),
        ],
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      // Should be in big-question mode
      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("uses conversational mode for text content", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "text-item",
            content: createContentBlock({
              type: "text",
              content: "Test text content",
            }),
          }),
        ],
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      // Should be in conversational mode
      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });

    it("uses conversational mode for quiz content", () => {
      const result = createFlattenResult({
        items: [
          createCarouselItem({
            id: "quiz-item",
            type: "quiz",
            content: {
              type: "quiz",
              id: "q1",
              question: "Test question?",
              options: [
                { id: "a", text: "Option A", isCorrect: true },
                { id: "b", text: "Option B", isCorrect: false },
              ],
            } as ContentBlock,
          }),
        ],
      });

      render(
        <LearnCarouselContent {...defaultProps} flattenedResult={result} />
      );

      // Should be in conversational mode
      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });
  });

  describe("Props", () => {
    it("uses provided company and role slugs for exit navigation", () => {
      render(
        <LearnCarouselContent
          {...defaultProps}
          companySlug="amazon"
          roleSlug="product-manager"
        />
      );

      // Escape key triggers exit
      fireEvent.keyDown(window, { key: "Escape" });

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

  describe("Timeline", () => {
    it("renders section timeline component", () => {
      render(<LearnCarouselContent {...defaultProps} />);

      expect(screen.getByTestId("conversation-timeline")).toBeInTheDocument();
    });
  });
});
