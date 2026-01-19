/**
 * Tests for ConversationalContent component
 *
 * Tests cover:
 * - Text renders as bubble
 * - Quote has special styling
 * - Tip has icon + green accent
 * - Warning has icon + amber accent
 * - Typing animation works
 * - Reduced-motion respected
 * - Auto-advance behavior
 * - Keyboard navigation
 * - Context integration
 * - Accessibility
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConversationalContent } from "../ConversationalContent";
import type { TextBlock, QuoteBlock, TipBlock, WarningBlock } from "@/types";

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
    }: React.ComponentProps<"div"> & {
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
      ...props
    }: React.ComponentProps<"button"> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      variants?: unknown;
      transition?: unknown;
    }) => <button {...props}>{children}</button>,
  },
  useReducedMotion: jest.fn().mockReturnValue(false), // Default to animations enabled
  AnimatePresence: ({
    children,
    mode,
  }: {
    children: React.ReactNode;
    mode?: string;
  }) => <>{children}</>,
}));

// Mock the ConversationContext
const mockAddMessage = jest.fn().mockReturnValue("msg-id");

jest.mock("../../ConversationContext", () => ({
  useConversation: () => ({
    addMessage: mockAddMessage,
    recordAnswer: jest.fn(),
    getAnswer: jest.fn(),
    hasAnswer: jest.fn().mockReturnValue(false),
  }),
}));

// Mock Avatar component
jest.mock("../../Avatar", () => ({
  Avatar: ({ size }: { size: string }) => (
    <div data-testid={`avatar-${size}`}>Avatar</div>
  ),
}));

// Mock ChatBubble component
jest.mock("../../ChatBubble", () => ({
  ChatBubble: ({
    variant,
    children,
    className,
  }: {
    variant: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid={`bubble-${variant}`} className={className}>
      {children}
    </div>
  ),
}));

// Mock TypingIndicator component
jest.mock("../../TypingIndicator", () => ({
  TypingIndicator: () => <div data-testid="typing-indicator">...</div>,
}));

// Sample content blocks
const createTextBlock = (
  content: string = "This is sample text content."
): TextBlock => ({
  id: "text-1",
  type: "text",
  content,
});

const createQuoteBlock = (overrides?: Partial<QuoteBlock>): QuoteBlock => ({
  id: "quote-1",
  type: "quote",
  content: "The only way to do great work is to love what you do.",
  author: "Steve Jobs",
  ...overrides,
});

const createTipBlock = (
  content: string = "Always research the company before your interview."
): TipBlock => ({
  id: "tip-1",
  type: "tip",
  content,
});

const createWarningBlock = (
  content: string = "Never speak negatively about previous employers."
): WarningBlock => ({
  id: "warning-1",
  type: "warning",
  content,
});

// Get the mocked useReducedMotion
const mockUseReducedMotion = jest.requireMock("framer-motion")
  .useReducedMotion as jest.Mock;

describe("ConversationalContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );
      expect(screen.getByTestId("content-item-1")).toBeInTheDocument();
    });

    it("shows avatar", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );
      expect(screen.getByTestId("avatar-small")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          className="custom-class"
        />
      );
      expect(screen.getByTestId("content-item-1")).toHaveClass("custom-class");
    });

    it("has article role", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );
      expect(screen.getByRole("article")).toBeInTheDocument();
    });
  });

  describe("Text content", () => {
    it("renders text in Alex bubble", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      expect(
        screen.getByText("This is sample text content.")
      ).toBeInTheDocument();
      expect(screen.getByTestId("bubble-alex")).toBeInTheDocument();
    });

    it("has correct data-content-type attribute", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      expect(screen.getByText("This is sample text content.").closest('[data-content-type="text"]')).toBeInTheDocument();
    });
  });

  describe("Quote content", () => {
    it("renders quote with styling", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createQuoteBlock()} />
      );

      expect(
        screen.getByText("The only way to do great work is to love what you do.")
      ).toBeInTheDocument();
    });

    it("shows author attribution", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createQuoteBlock()} />
      );

      expect(screen.getByText(/Steve Jobs/)).toBeInTheDocument();
    });

    it("renders without author when not provided", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent
          itemId="item-1"
          content={createQuoteBlock({ author: undefined })}
        />
      );

      expect(
        screen.getByText("The only way to do great work is to love what you do.")
      ).toBeInTheDocument();
      expect(screen.queryByText(/—/)).not.toBeInTheDocument();
    });

    it("has quote marks", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createQuoteBlock()} />
      );

      // Quote marks should be present (aria-hidden) - using curly quotes
      // \u201C = " (left double quotation mark)
      // \u201D = " (right double quotation mark)
      const openQuote = screen.getByText("\u201C");
      const closeQuote = screen.getByText("\u201D");
      expect(openQuote).toBeInTheDocument();
      expect(closeQuote).toBeInTheDocument();
    });

    it("uses blockquote element", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createQuoteBlock()} />
      );

      const blockquote = screen.getByText("The only way to do great work is to love what you do.").closest("blockquote");
      expect(blockquote).toBeInTheDocument();
    });
  });

  describe("Tip content", () => {
    it("renders tip with icon", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTipBlock()} />
      );

      expect(
        screen.getByText("Always research the company before your interview.")
      ).toBeInTheDocument();
      expect(screen.getByText("💡")).toBeInTheDocument();
    });

    it("shows Pro Tip label", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTipBlock()} />
      );

      expect(screen.getByText("Pro Tip")).toBeInTheDocument();
    });

    it("has correct data-content-type", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTipBlock()} />
      );

      const tipContent = screen.getByText("Always research the company before your interview.").closest('[data-content-type="tip"]');
      expect(tipContent).toBeInTheDocument();
    });
  });

  describe("Warning content", () => {
    it("renders warning with icon", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createWarningBlock()} />
      );

      expect(
        screen.getByText("Never speak negatively about previous employers.")
      ).toBeInTheDocument();
      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("shows Watch Out label", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createWarningBlock()} />
      );

      expect(screen.getByText("Watch Out")).toBeInTheDocument();
    });

    it("has correct data-content-type", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createWarningBlock()} />
      );

      const warningContent = screen.getByText("Never speak negatively about previous employers.").closest('[data-content-type="warning"]');
      expect(warningContent).toBeInTheDocument();
    });
  });

  describe("Typing animation", () => {
    it("shows typing indicator for long content", () => {
      const longContent = "A".repeat(100); // 100 chars > 50 threshold
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(longContent)}
        />
      );

      expect(screen.getByTestId("content-typing-item-1")).toBeInTheDocument();
      expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
    });

    it("skips typing for short content", () => {
      mockUseReducedMotion.mockReturnValue(false);
      const shortContent = "Short text"; // < 50 chars
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(shortContent)}
          typingThreshold={50}
        />
      );

      // Should show content immediately
      expect(screen.queryByTestId("typing-indicator")).not.toBeInTheDocument();
      expect(screen.getByText("Short text")).toBeInTheDocument();
    });

    it("respects custom typingThreshold", () => {
      const content = "Medium length content here"; // 27 chars
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(content)}
          typingThreshold={20} // Lower threshold
        />
      );

      // Should show typing since 27 > 20
      expect(screen.getByTestId("content-typing-item-1")).toBeInTheDocument();
    });

    it("shows content after typing animation", () => {
      const longContent = "A".repeat(100);
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(longContent)}
        />
      );

      // Initially shows typing
      expect(screen.getByTestId("content-typing-item-1")).toBeInTheDocument();

      // After animation completes (max 2000ms)
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      // Should show content bubble
      expect(screen.getByTestId("content-bubble-item-1")).toBeInTheDocument();
    });

    it("typing duration is capped at maximum", () => {
      const veryLongContent = "A".repeat(10000); // Would be 300s uncapped
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(veryLongContent)}
        />
      );

      // After max duration (2000ms)
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Should show content
      expect(screen.getByTestId("content-bubble-item-1")).toBeInTheDocument();
    });
  });

  describe("Reduced motion", () => {
    it("skips typing animation when reduced motion preferred", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const longContent = "A".repeat(100);
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(longContent)}
        />
      );

      // Should show content immediately
      expect(
        screen.queryByTestId("content-typing-item-1")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("content-bubble-item-1")).toBeInTheDocument();
    });

    it("content appears immediately with reduced motion", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      // Content should be visible immediately
      expect(
        screen.getByText("This is sample text content.")
      ).toBeInTheDocument();
    });
  });

  describe("Auto-advance", () => {
    it("calls onComplete after delay when autoAdvance is true", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
          autoAdvance={true}
          autoAdvanceDelay={2000}
        />
      );

      expect(onComplete).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("respects custom autoAdvanceDelay", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
          autoAdvance={true}
          autoAdvanceDelay={5000}
        />
      );

      // After 2000ms (default), should not call
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(onComplete).not.toHaveBeenCalled();

      // After 5000ms, should call
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("does not auto-advance when autoAdvance is false", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
          autoAdvance={false}
        />
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it("waits for typing animation before auto-advance timer", () => {
      mockUseReducedMotion.mockReturnValue(false);
      const onComplete = jest.fn();
      const longContent = "A".repeat(100); // Will trigger typing

      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(longContent)}
          onComplete={onComplete}
          autoAdvance={true}
          autoAdvanceDelay={1000}
        />
      );

      // After 1000ms (auto-advance delay), should not call yet (still typing)
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onComplete).not.toHaveBeenCalled();

      // After typing + auto-advance (2000 + 1000 = 3000ms)
      act(() => {
        jest.advanceTimersByTime(2100);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Continue button", () => {
    it("shows continue button after content appears", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      expect(screen.getByTestId("content-continue-item-1")).toBeInTheDocument();
    });

    it("calls onComplete on continue click", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByTestId("content-continue-item-1"));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("cancels auto-advance when continue is clicked", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
          autoAdvance={true}
          autoAdvanceDelay={5000}
        />
      );

      // Click continue before auto-advance
      fireEvent.click(screen.getByTestId("content-continue-item-1"));
      expect(onComplete).toHaveBeenCalledTimes(1);

      // Should not call again after auto-advance time
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("has accessible label", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      expect(
        screen.getByRole("button", { name: "Continue to next" })
      ).toBeInTheDocument();
    });
  });

  describe("Keyboard navigation", () => {
    it("handles Enter key to continue", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
        />
      );

      fireEvent.keyDown(screen.getByTestId("content-item-1"), { key: "Enter" });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("handles Space key to continue", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
        />
      );

      fireEvent.keyDown(screen.getByTestId("content-item-1"), { key: " " });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("ignores other keys", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
        />
      );

      fireEvent.keyDown(screen.getByTestId("content-item-1"), { key: "Escape" });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it("container is focusable when content is shown", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      const container = screen.getByTestId("content-item-1");
      expect(container).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Context integration", () => {
    it("adds message to conversation context", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      expect(mockAddMessage).toHaveBeenCalledWith(
        "alex",
        "This is sample text content.",
        "item-1"
      );
    });

    it("adds message only once", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const { rerender } = render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      rerender(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      expect(mockAddMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("has aria-labelledby linking to content", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      const container = screen.getByTestId("content-item-1");
      expect(container).toHaveAttribute(
        "aria-labelledby",
        "content-label-item-1"
      );
    });

    it("content label has matching id", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock()} />
      );

      const contentLabel = screen.getByText("This is sample text content.").closest("#content-label-item-1");
      expect(contentLabel).toBeInTheDocument();
    });

    it("icons are hidden from screen readers", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTipBlock()} />
      );

      const icon = screen.getByText("💡");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("quote marks are hidden from screen readers", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createQuoteBlock()} />
      );

      // Using curly quotes
      // \u201C = " (left double quotation mark)
      // \u201D = " (right double quotation mark)
      const openQuote = screen.getByText("\u201C");
      const closeQuote = screen.getByText("\u201D");
      expect(openQuote).toHaveAttribute("aria-hidden", "true");
      expect(closeQuote).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Edge cases", () => {
    it("handles empty content", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(
        <ConversationalContent itemId="item-1" content={createTextBlock("")} />
      );

      expect(screen.getByTestId("content-item-1")).toBeInTheDocument();
    });

    it("handles very long content", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const veryLongContent = "A".repeat(10000);
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(veryLongContent)}
        />
      );

      expect(screen.getByTestId("content-item-1")).toBeInTheDocument();
    });

    it("handles special characters in content", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const specialContent = "Test <script>alert('xss')</script> & \"quotes\"";
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(specialContent)}
        />
      );

      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it("handles multiline content", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const multilineContent = "Line 1\nLine 2\nLine 3";
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock(multilineContent)}
        />
      );

      // Use a matcher function for multiline content
      expect(
        screen.getByText((content) => content.includes("Line 1"))
      ).toBeInTheDocument();
      expect(
        screen.getByText((content) => content.includes("Line 3"))
      ).toBeInTheDocument();
    });

    it("does not auto-advance when autoAdvanceDelay is 0", () => {
      mockUseReducedMotion.mockReturnValue(true);
      const onComplete = jest.fn();
      render(
        <ConversationalContent
          itemId="item-1"
          content={createTextBlock()}
          onComplete={onComplete}
          autoAdvance={true}
          autoAdvanceDelay={0}
        />
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not auto-advance when delay is 0
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
