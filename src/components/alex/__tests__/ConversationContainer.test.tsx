import { render, screen, fireEvent } from "@testing-library/react";
import {
  ConversationContainer,
  getDisplayModeForType,
} from "../ConversationContainer";
import { CarouselProvider } from "@/components/carousel";
import type { CarouselItem, ContentBlock, ContentBlockType } from "@/types";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      exit,
      variants,
      ...props
    }: React.ComponentPropsWithRef<"div"> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      variants?: unknown;
    }) => <div {...props}>{children}</div>,
    button: ({
      children,
      initial,
      animate,
      exit,
      variants,
      ...props
    }: React.ComponentPropsWithRef<"button"> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      variants?: unknown;
    }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
}));

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// Helper to create test items
function createTestItem(
  type: ContentBlockType,
  id: string = `test-${type}`,
  isPremium = false
): CarouselItem {
  const content: ContentBlock = createContentBlock(type, id);
  return {
    id,
    type: type === "quiz" ? "quiz" : type === "checklist" ? "checklist" : "content",
    content,
    moduleSlug: "test-module",
    isPremium,
    sectionTitle: "Test Section",
    order: 0,
  };
}

// Helper to create paywall item
function createPaywallItem(order = 0): CarouselItem {
  return {
    id: "paywall",
    type: "paywall",
    content: { id: "paywall", type: "text", content: "Unlock premium content" },
    moduleSlug: "paywall",
    isPremium: false,
    sectionTitle: "Premium Content",
    order,
  };
}

function createContentBlock(type: ContentBlockType, id: string): ContentBlock {
  switch (type) {
    case "text":
      return { id, type: "text", content: "Test text content" };
    case "header":
      return { id, type: "header", content: "Test Header", level: 1 };
    case "quote":
      return { id, type: "quote", content: "Test quote", author: "Test Author" };
    case "tip":
      return { id, type: "tip", content: "Test tip content" };
    case "warning":
      return { id, type: "warning", content: "Test warning content" };
    case "video":
      return { id, type: "video", url: "https://youtube.com/watch?v=test123", title: "Test Video" };
    case "audio":
      return { id, type: "audio", url: "https://example.com/audio.mp3", title: "Test Audio" };
    case "image":
      return { id, type: "image", url: "https://example.com/image.jpg", alt: "Test Image" };
    case "infographic":
      return { id, type: "infographic", url: "https://example.com/infographic.png", alt: "Test Infographic" };
    case "quiz":
      return {
        id,
        type: "quiz",
        question: "Test question?",
        options: [
          { id: "opt1", text: "Option 1", isCorrect: true },
          { id: "opt2", text: "Option 2", isCorrect: false },
        ],
      };
    case "checklist":
      return {
        id,
        type: "checklist",
        title: "Test Checklist",
        items: [
          { id: "item1", text: "Item 1", required: true },
          { id: "item2", text: "Item 2", required: false },
        ],
      };
    case "animation":
      return { id, type: "animation", animationUrl: "https://example.com/anim.json" };
    default:
      return { id, type: "text", content: "Default content" };
  }
}

// Wrapper component with CarouselProvider
function TestWrapper({
  items,
  initialIndex = 0,
  onExit,
  children = <div>Test Content</div>,
}: {
  items: CarouselItem[];
  initialIndex?: number;
  onExit?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <CarouselProvider
      options={{
        companySlug: "test-company",
        roleSlug: "test-role",
        items,
        initialIndex,
      }}
      enableSupabaseSync={false}
    >
      <ConversationContainer
        onExit={onExit}
        data-testid="conversation-container"
      >
        {children}
      </ConversationContainer>
    </CarouselProvider>
  );
}

describe("ConversationContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe("getDisplayModeForType", () => {
    it("returns big-question for header type", () => {
      expect(getDisplayModeForType("header")).toBe("big-question");
    });

    it("returns big-question for video type", () => {
      expect(getDisplayModeForType("video")).toBe("big-question");
    });

    it("returns big-question for audio type", () => {
      expect(getDisplayModeForType("audio")).toBe("big-question");
    });

    it("returns big-question for image type", () => {
      expect(getDisplayModeForType("image")).toBe("big-question");
    });

    it("returns big-question for infographic type", () => {
      expect(getDisplayModeForType("infographic")).toBe("big-question");
    });

    it("returns conversational for text type", () => {
      expect(getDisplayModeForType("text")).toBe("conversational");
    });

    it("returns conversational for quote type", () => {
      expect(getDisplayModeForType("quote")).toBe("conversational");
    });

    it("returns conversational for tip type", () => {
      expect(getDisplayModeForType("tip")).toBe("conversational");
    });

    it("returns conversational for warning type", () => {
      expect(getDisplayModeForType("warning")).toBe("conversational");
    });

    it("returns conversational for quiz type", () => {
      expect(getDisplayModeForType("quiz")).toBe("conversational");
    });

    it("returns conversational for checklist type", () => {
      expect(getDisplayModeForType("checklist")).toBe("conversational");
    });

    it("returns conversational for animation type", () => {
      // Animation is not in BIG_QUESTION_TYPES, so defaults to conversational
      expect(getDisplayModeForType("animation")).toBe("conversational");
    });
  });

  describe("Rendering", () => {
    it("renders container with correct test ID", () => {
      const items = [createTestItem("text")];
      render(<TestWrapper items={items} />);

      expect(screen.getByTestId("conversation-container")).toBeInTheDocument();
    });

    it("renders children content", () => {
      const items = [createTestItem("text")];
      render(
        <TestWrapper items={items}>
          <div data-testid="custom-content">Custom Content</div>
        </TestWrapper>
      );

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });

    it("renders timeline component", () => {
      const items = [createTestItem("text")];
      render(<TestWrapper items={items} />);

      expect(screen.getByTestId("conversation-timeline")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const items = [createTestItem("text")];
      render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items,
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer
            className="custom-class"
            data-testid="conversation-container"
          >
            Content
          </ConversationContainer>
        </CarouselProvider>
      );

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("Display Mode Determination", () => {
    it("sets big-question mode for video content", () => {
      const items = [createTestItem("video")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("sets big-question mode for header content", () => {
      const items = [createTestItem("header")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("sets big-question mode for audio content", () => {
      const items = [createTestItem("audio")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("sets big-question mode for image content", () => {
      const items = [createTestItem("image")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("sets big-question mode for infographic content", () => {
      const items = [createTestItem("infographic")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("sets conversational mode for text content", () => {
      const items = [createTestItem("text")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });

    it("sets conversational mode for quiz content", () => {
      const items = [createTestItem("quiz")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });

    it("sets conversational mode for checklist content", () => {
      const items = [createTestItem("checklist")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });

    it("sets conversational mode for tip content", () => {
      const items = [createTestItem("tip")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });

    it("sets conversational mode for warning content", () => {
      const items = [createTestItem("warning")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });

    it("sets conversational mode for quote content", () => {
      const items = [createTestItem("quote")];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });
  });

  describe("Mode Switching", () => {
    it("renders BigQuestionMode when in big-question mode", () => {
      const items = [createTestItem("video")];
      render(<TestWrapper items={items} />);

      expect(screen.getByTestId("big-question-mode")).toBeInTheDocument();
    });

    it("renders ConversationalMode when in conversational mode", () => {
      const items = [createTestItem("text")];
      render(<TestWrapper items={items} />);

      expect(screen.getByTestId("conversational-mode")).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("calls onExit when Escape key is pressed", () => {
      const onExit = jest.fn();
      const items = [createTestItem("text")];
      render(<TestWrapper items={items} onExit={onExit} />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it("does not call onExit when Escape is pressed in input field", () => {
      const onExit = jest.fn();
      const items = [createTestItem("text")];
      render(
        <TestWrapper items={items} onExit={onExit}>
          <input data-testid="test-input" type="text" />
        </TestWrapper>
      );

      const input = screen.getByTestId("test-input");
      input.focus();
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onExit).not.toHaveBeenCalled();
    });

    it("does not call onExit when Escape is pressed in textarea", () => {
      const onExit = jest.fn();
      const items = [createTestItem("text")];
      render(
        <TestWrapper items={items} onExit={onExit}>
          <textarea data-testid="test-textarea" />
        </TestWrapper>
      );

      const textarea = screen.getByTestId("test-textarea");
      textarea.focus();
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(onExit).not.toHaveBeenCalled();
    });
  });

  describe("Touch Gestures", () => {
    it("does not trigger continue when clicking on button", () => {
      const items = [
        createTestItem("video", "video-1"),
        createTestItem("video", "video-2"),
      ];
      render(
        <TestWrapper items={items}>
          <button data-testid="test-button">Click me</button>
        </TestWrapper>
      );

      const button = screen.getByTestId("test-button");
      fireEvent.click(button);

      // Should still be on first item (video-1)
      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("does not trigger continue when clicking on link", () => {
      const items = [
        createTestItem("video", "video-1"),
        createTestItem("video", "video-2"),
      ];
      render(
        <TestWrapper items={items}>
          <a href="#" data-testid="test-link">Link</a>
        </TestWrapper>
      );

      const link = screen.getByTestId("test-link");
      fireEvent.click(link);

      // Container still exists
      expect(screen.getByTestId("conversation-container")).toBeInTheDocument();
    });

    it("does not trigger continue in conversational mode", () => {
      const items = [
        createTestItem("text", "text-1"),
        createTestItem("text", "text-2"),
      ];
      render(<TestWrapper items={items} />);

      const container = screen.getByTestId("conversation-container");
      fireEvent.click(container);

      // Should still be in conversational mode
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });
  });

  describe("Timeline Integration", () => {
    it("renders SectionTimeline with sections derived from items", () => {
      const items = [
        createTestItem("text", "text-1"),
        createTestItem("quiz", "quiz-1"),
      ];
      render(<TestWrapper items={items} />);

      expect(screen.getByTestId("conversation-timeline")).toBeInTheDocument();
    });

    it("timeline shows progress through sections", () => {
      const items = [
        { ...createTestItem("text", "text-1"), sectionTitle: "Introduction" },
        { ...createTestItem("text", "text-2"), sectionTitle: "Introduction" },
        { ...createTestItem("quiz", "quiz-1"), sectionTitle: "Quiz Section" },
      ];
      render(<TestWrapper items={items} />);

      // Timeline toggle exists (mobile)
      expect(screen.getByTestId("timeline-toggle")).toBeInTheDocument();
    });
  });

  describe("Exit Functionality", () => {
    it("calls onExit when exit button is pressed in BigQuestionMode", () => {
      const onExit = jest.fn();
      const items = [createTestItem("video")];
      render(<TestWrapper items={items} onExit={onExit} />);

      // Press Escape to trigger exit
      fireEvent.keyDown(window, { key: "Escape" });

      expect(onExit).toHaveBeenCalled();
    });

    it("handles missing onExit gracefully", () => {
      const items = [createTestItem("video")];
      render(<TestWrapper items={items} />);

      // Should not throw when pressing Escape without onExit handler
      expect(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      }).not.toThrow();
    });
  });

  describe("Paywall Integration", () => {
    it("sets big-question mode for paywall item", () => {
      const items: CarouselItem[] = [
        createTestItem("text", "text-1"),
        createPaywallItem(1),
      ];
      render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items,
            paywallIndex: 1,
            initialIndex: 1, // Start at paywall
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer data-testid="conversation-container">
            Content
          </ConversationContainer>
        </CarouselProvider>
      );

      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("renders BigQuestionMode when at paywall", () => {
      const items: CarouselItem[] = [
        createTestItem("text", "text-1"),
        createPaywallItem(1),
      ];
      render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items,
            paywallIndex: 1,
            initialIndex: 1, // Start at paywall
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer data-testid="conversation-container">
            Content
          </ConversationContainer>
        </CarouselProvider>
      );

      expect(screen.getByTestId("big-question-mode")).toBeInTheDocument();
    });

    it("does not trigger tap-to-continue at paywall", () => {
      const items: CarouselItem[] = [
        createTestItem("text", "text-1"),
        createPaywallItem(1),
        createTestItem("text", "text-2"),
      ];
      render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items,
            paywallIndex: 1,
            initialIndex: 1, // Start at paywall
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer data-testid="conversation-container">
            <div data-testid="content-area">Content Area</div>
          </ConversationContainer>
        </CarouselProvider>
      );

      // Tap on the container (not on a button)
      const container = screen.getByTestId("conversation-container");
      fireEvent.click(container);

      // Should still be at paywall (big-question mode)
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("uses correct display mode based on item type at initialization", () => {
      // Test with paywall as first item
      const itemsWithPaywallFirst: CarouselItem[] = [
        createPaywallItem(0),
        createTestItem("text", "text-1"),
      ];
      const { unmount } = render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items: itemsWithPaywallFirst,
            paywallIndex: 0,
            initialIndex: 0, // Start at paywall
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer data-testid="conversation-container">
            Content
          </ConversationContainer>
        </CarouselProvider>
      );

      // At paywall - big-question mode
      let container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");

      // Clean up and test with text as first item
      unmount();

      const itemsWithTextFirst: CarouselItem[] = [
        createTestItem("text", "text-1"),
        createPaywallItem(1),
      ];
      render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items: itemsWithTextFirst,
            paywallIndex: 1,
            initialIndex: 0, // Start at text
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer data-testid="conversation-container">
            Content
          </ConversationContainer>
        </CarouselProvider>
      );

      // At text - conversational mode
      container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "conversational");
    });

    it("paywall blocks forward navigation via tap", () => {
      const items: CarouselItem[] = [
        createPaywallItem(0),
        createTestItem("text", "text-1"),
      ];
      render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items,
            paywallIndex: 0,
            initialIndex: 0,
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer data-testid="conversation-container">
            Content
          </ConversationContainer>
        </CarouselProvider>
      );

      const container = screen.getByTestId("conversation-container");

      // Tap multiple times - should not advance past paywall
      fireEvent.click(container);
      fireEvent.click(container);
      fireEvent.click(container);

      // Still in big-question mode at paywall
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty items array", () => {
      render(
        <CarouselProvider
          options={{
            companySlug: "test",
            roleSlug: "test",
            items: [],
          }}
          enableSupabaseSync={false}
        >
          <ConversationContainer data-testid="conversation-container">
            Content
          </ConversationContainer>
        </CarouselProvider>
      );

      // Should default to big-question mode
      const container = screen.getByTestId("conversation-container");
      expect(container).toHaveAttribute("data-display-mode", "big-question");
    });

    it("handles item with missing content type", () => {
      const items: CarouselItem[] = [
        {
          id: "malformed",
          type: "content",
          content: { id: "malformed", type: "text", content: "" } as ContentBlock,
          moduleSlug: "test",
          isPremium: false,
          order: 0,
        },
      ];
      render(<TestWrapper items={items} />);

      // Should not crash
      expect(screen.getByTestId("conversation-container")).toBeInTheDocument();
    });

    it("handles rapid mode changes gracefully", () => {
      const items = [
        createTestItem("video", "video-1"),
        createTestItem("text", "text-1"),
        createTestItem("video", "video-2"),
      ];
      const { rerender } = render(<TestWrapper items={items} initialIndex={0} />);

      // Rapid index changes (simulated by re-rendering with different items)
      rerender(<TestWrapper items={items} initialIndex={1} />);
      rerender(<TestWrapper items={items} initialIndex={2} />);
      rerender(<TestWrapper items={items} initialIndex={0} />);

      // Should still be functional
      expect(screen.getByTestId("conversation-container")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible timeline with navigation", () => {
      const items = [
        { ...createTestItem("text", "text-1"), sectionTitle: "Section 1" },
        { ...createTestItem("text", "text-2"), sectionTitle: "Section 2" },
      ];
      render(<TestWrapper items={items} />);

      // Desktop sidebar has aria-label
      const sidebar = screen.getByLabelText("Journey progress");
      expect(sidebar).toBeInTheDocument();
    });

    it("mobile toggle has aria attributes", () => {
      const items = [createTestItem("text")];
      render(<TestWrapper items={items} />);

      const toggle = screen.getByTestId("timeline-toggle");
      expect(toggle).toHaveAttribute("aria-label", "Open progress menu");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });
  });
});
