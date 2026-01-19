/**
 * Tests for ConversationalChecklist component
 *
 * Tests cover:
 * - Intro shows as Alex bubble
 * - Items appear sequentially
 * - Checkbox interaction works
 * - Check animation on complete
 * - Shows required vs optional
 * - Continue enabled when required done
 * - State persists to context
 * - Already-answered state restoration
 * - Accessibility
 * - Keyboard navigation
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConversationalChecklist } from "../ConversationalChecklist";
import type { ChecklistBlock } from "@/types";

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
  useReducedMotion: () => true, // Speed up tests
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock the ConversationContext
const mockAddMessage = jest.fn().mockReturnValue("msg-id");
const mockRecordAnswer = jest.fn();
const mockGetAnswer = jest.fn().mockReturnValue(undefined);
const mockHasAnswer = jest.fn().mockReturnValue(false);

jest.mock("../../ConversationContext", () => ({
  useConversation: () => ({
    addMessage: mockAddMessage,
    recordAnswer: mockRecordAnswer,
    getAnswer: mockGetAnswer,
    hasAnswer: mockHasAnswer,
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

// Sample checklist data
const createChecklist = (overrides?: Partial<ChecklistBlock>): ChecklistBlock => ({
  id: "checklist-1",
  type: "checklist",
  title: "Interview Preparation Checklist",
  items: [
    { id: "item-1", text: "Research the company", required: true },
    { id: "item-2", text: "Review job description", required: true },
    { id: "item-3", text: "Prepare questions to ask", required: true },
    { id: "item-4", text: "Practice common questions", required: false },
  ],
  ...overrides,
});

describe("ConversationalChecklist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetAnswer.mockReturnValue(undefined);
    mockHasAnswer.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);
      expect(screen.getByTestId("checklist-item-1")).toBeInTheDocument();
    });

    it("shows intro as Alex bubble", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // Title should be visible
      expect(screen.getByText("Interview Preparation Checklist")).toBeInTheDocument();

      // Should have Alex avatar
      expect(screen.getByTestId("avatar-small")).toBeInTheDocument();

      // Should have Alex bubble
      expect(screen.getByTestId("bubble-alex")).toBeInTheDocument();
    });

    it("uses default intro when no title", () => {
      const checklist = createChecklist({ title: undefined });
      render(<ConversationalChecklist itemId="item-1" checklist={checklist} />);

      expect(screen.getByText("Here's a checklist to complete:")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <ConversationalChecklist
          itemId="item-1"
          checklist={createChecklist()}
          className="custom-class"
        />
      );

      expect(screen.getByTestId("checklist-item-1")).toHaveClass("custom-class");
    });
  });

  describe("Items appearance", () => {
    it("renders all items when reduced motion is preferred", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // All items should be visible immediately due to reduced motion mock
      expect(screen.getByTestId("checklist-item-item-1")).toBeInTheDocument();
      expect(screen.getByTestId("checklist-item-item-2")).toBeInTheDocument();
      expect(screen.getByTestId("checklist-item-item-3")).toBeInTheDocument();
      expect(screen.getByTestId("checklist-item-item-4")).toBeInTheDocument();
    });

    it("shows item text", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      expect(screen.getByText("Research the company")).toBeInTheDocument();
      expect(screen.getByText("Review job description")).toBeInTheDocument();
      expect(screen.getByText("Prepare questions to ask")).toBeInTheDocument();
      expect(screen.getByText("Practice common questions")).toBeInTheDocument();
    });

    it("shows optional label for non-required items", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      expect(screen.getByTestId("checklist-optional-item-4")).toBeInTheDocument();
      expect(screen.getByText("(optional)")).toBeInTheDocument();
    });

    it("does not show optional label for required items", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      expect(screen.queryByTestId("checklist-optional-item-1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("checklist-optional-item-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("checklist-optional-item-3")).not.toBeInTheDocument();
    });
  });

  describe("Checkbox interaction", () => {
    it("checks item on click", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      const checkbox = screen.getByRole("checkbox", { name: /Research the company/i });
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it("unchecks item on second click", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      const checkbox = screen.getByRole("checkbox", { name: /Research the company/i });

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("can check multiple items", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      const checkbox1 = screen.getByRole("checkbox", { name: /Research the company/i });
      const checkbox2 = screen.getByRole("checkbox", { name: /Review job description/i });

      fireEvent.click(checkbox1);
      fireEvent.click(checkbox2);

      expect(checkbox1).toBeChecked();
      expect(checkbox2).toBeChecked();
    });

    it("applies strikethrough style to checked items", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      const checkbox = screen.getByRole("checkbox", { name: /Research the company/i });
      fireEvent.click(checkbox);

      // The text element should have line-through style via checkedTextStyle
      const textElement = screen.getByText("Research the company");
      expect(textElement).toHaveStyle({ textDecoration: "line-through" });
    });
  });

  describe("Progress indicator", () => {
    it("shows progress count", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      expect(screen.getByText("0 of 3 required items checked")).toBeInTheDocument();
    });

    it("updates progress count on check", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      const checkbox1 = screen.getByRole("checkbox", { name: /Research the company/i });
      fireEvent.click(checkbox1);

      expect(screen.getByText("1 of 3 required items checked")).toBeInTheDocument();
    });

    it("shows completion message when all required checked", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // Check all required items
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Prepare questions to ask/i }));

      expect(screen.getByText("All required items complete")).toBeInTheDocument();
    });

    it("has live region for progress updates", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      const progressElement = screen.getByTestId("checklist-progress-item-1");
      expect(progressElement).toHaveAttribute("role", "status");
      expect(progressElement).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Continue button", () => {
    it("does not show continue button initially", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      expect(screen.queryByTestId("checklist-continue-item-1")).not.toBeInTheDocument();
    });

    it("shows continue button when all required items checked", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // Check all required items
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Prepare questions to ask/i }));

      expect(screen.getByTestId("checklist-continue-item-1")).toBeInTheDocument();
    });

    it("hides continue button when required item is unchecked", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // Check all required items
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Prepare questions to ask/i }));

      expect(screen.getByTestId("checklist-continue-item-1")).toBeInTheDocument();

      // Uncheck one
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));

      expect(screen.queryByTestId("checklist-continue-item-1")).not.toBeInTheDocument();
    });

    it("calls onComplete when continue is clicked", () => {
      const onComplete = jest.fn();
      render(
        <ConversationalChecklist
          itemId="item-1"
          checklist={createChecklist()}
          onComplete={onComplete}
        />
      );

      // Check all required items
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Prepare questions to ask/i }));

      fireEvent.click(screen.getByTestId("checklist-continue-item-1"));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Context integration", () => {
    it("adds intro message on mount", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      expect(mockAddMessage).toHaveBeenCalledWith(
        "alex",
        "Interview Preparation Checklist",
        "item-1"
      );
    });

    it("records answer on checkbox change", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));

      expect(mockRecordAnswer).toHaveBeenCalledWith("item-1", ["item-1"]);
    });

    it("records multiple items in answer", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));

      // Check the last call
      expect(mockRecordAnswer).toHaveBeenLastCalledWith(
        "item-1",
        expect.arrayContaining(["item-1", "item-2"])
      );
    });

    it("removes item from answer when unchecked", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i })); // Uncheck

      expect(mockRecordAnswer).toHaveBeenLastCalledWith("item-1", ["item-2"]);
    });
  });

  describe("Already answered state", () => {
    it("restores from existing answer", () => {
      mockHasAnswer.mockReturnValue(true);
      mockGetAnswer.mockReturnValue({
        selectedIds: ["item-1", "item-2"],
        timestamp: Date.now(),
      });

      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // Items should be checked
      expect(screen.getByRole("checkbox", { name: /Research the company/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Review job description/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Prepare questions to ask/i })).not.toBeChecked();
    });

    it("shows correct progress from restored state", () => {
      mockHasAnswer.mockReturnValue(true);
      mockGetAnswer.mockReturnValue({
        selectedIds: ["item-1", "item-2"],
        timestamp: Date.now(),
      });

      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      expect(screen.getByText("2 of 3 required items checked")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has correct role structure", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // Container has group role
      expect(screen.getByRole("group", { name: /Interview Preparation Checklist/i })).toBeInTheDocument();

      // Items container has group role
      expect(screen.getByRole("group", { name: /Checklist items/i })).toBeInTheDocument();
    });

    it("checkboxes have accessible descriptions", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute("aria-describedby");
      });
    });

    it("continue button has accessible label", () => {
      render(<ConversationalChecklist itemId="item-1" checklist={createChecklist()} />);

      // Check all required items
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Prepare questions to ask/i }));

      expect(
        screen.getByRole("button", { name: "Continue to next" })
      ).toBeInTheDocument();
    });
  });

  describe("Keyboard navigation", () => {
    it("handles Enter key to continue when all required checked", () => {
      const onComplete = jest.fn();
      render(
        <ConversationalChecklist
          itemId="item-1"
          checklist={createChecklist()}
          onComplete={onComplete}
        />
      );

      // Check all required items
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Review job description/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Prepare questions to ask/i }));

      // Press Enter
      fireEvent.keyDown(screen.getByTestId("checklist-item-1"), { key: "Enter" });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("ignores Enter key when not all required items checked", () => {
      const onComplete = jest.fn();
      render(
        <ConversationalChecklist
          itemId="item-1"
          checklist={createChecklist()}
          onComplete={onComplete}
        />
      );

      // Check only one item
      fireEvent.click(screen.getByRole("checkbox", { name: /Research the company/i }));

      // Press Enter
      fireEvent.keyDown(screen.getByTestId("checklist-item-1"), { key: "Enter" });

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("handles empty checklist", () => {
      const checklist = createChecklist({ items: [] });
      render(<ConversationalChecklist itemId="item-1" checklist={checklist} />);

      // Should still render without crashing
      expect(screen.getByTestId("checklist-item-1")).toBeInTheDocument();
    });

    it("handles all optional items", () => {
      const checklist = createChecklist({
        items: [
          { id: "opt-1", text: "Optional 1", required: false },
          { id: "opt-2", text: "Optional 2", required: false },
        ],
      });
      render(<ConversationalChecklist itemId="item-1" checklist={checklist} />);

      // Continue button should show immediately since there are no required items
      expect(screen.getByTestId("checklist-continue-item-1")).toBeInTheDocument();
    });

    it("handles items with default required value", () => {
      const checklist = createChecklist({
        items: [
          { id: "item-1", text: "Item without required field" }, // No required field
        ],
      });
      render(<ConversationalChecklist itemId="item-1" checklist={checklist} />);

      // Should treat as required (default)
      expect(screen.queryByText("(optional)")).not.toBeInTheDocument();
      expect(screen.queryByTestId("checklist-continue-item-1")).not.toBeInTheDocument();
    });
  });
});
