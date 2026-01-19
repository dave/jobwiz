/**
 * Tests for ConversationalQuiz component
 *
 * Tests cover:
 * - Question shows as Alex bubble
 * - Options render as cards
 * - Selected option highlights
 * - User answer shows as pill
 * - Feedback bubble shows result
 * - Answer persists to context
 * - Auto-advance after delay
 * - Keyboard navigation
 * - Accessibility
 * - Already-answered state restoration
 */

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ConversationalQuiz } from "../ConversationalQuiz";
import type { QuizBlock } from "@/types";

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

// Sample quiz data
const createQuiz = (overrides?: Partial<QuizBlock>): QuizBlock => ({
  id: "quiz-1",
  type: "quiz",
  question: "What is the capital of France?",
  options: [
    { id: "opt-1", text: "London", isCorrect: false },
    { id: "opt-2", text: "Paris", isCorrect: true },
    { id: "opt-3", text: "Berlin", isCorrect: false },
    { id: "opt-4", text: "Madrid", isCorrect: false },
  ],
  explanation: "Paris is the capital city of France.",
  ...overrides,
});

describe("ConversationalQuiz", () => {
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
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);
      expect(screen.getByTestId("quiz-item-1")).toBeInTheDocument();
    });

    it("shows question as Alex bubble", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      // Question text should be visible
      expect(
        screen.getByText("What is the capital of France?")
      ).toBeInTheDocument();

      // Should have Alex avatar
      expect(screen.getByTestId("avatar-small")).toBeInTheDocument();

      // Should have Alex bubble
      expect(screen.getByTestId("bubble-alex")).toBeInTheDocument();
    });

    it("renders all options as cards", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      expect(screen.getByTestId("quiz-option-opt-1")).toBeInTheDocument();
      expect(screen.getByTestId("quiz-option-opt-2")).toBeInTheDocument();
      expect(screen.getByTestId("quiz-option-opt-3")).toBeInTheDocument();
      expect(screen.getByTestId("quiz-option-opt-4")).toBeInTheDocument();

      expect(screen.getByText("London")).toBeInTheDocument();
      expect(screen.getByText("Paris")).toBeInTheDocument();
      expect(screen.getByText("Berlin")).toBeInTheDocument();
      expect(screen.getByText("Madrid")).toBeInTheDocument();
    });

    it("options have radio role", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      const options = screen.getAllByRole("radio");
      expect(options).toHaveLength(4);
    });

    it("applies custom className", () => {
      render(
        <ConversationalQuiz
          itemId="item-1"
          quiz={createQuiz()}
          className="custom-class"
        />
      );

      expect(screen.getByTestId("quiz-item-1")).toHaveClass("custom-class");
    });
  });

  describe("Option selection", () => {
    it("selects option on click", async () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      const parisOption = screen.getByTestId("quiz-option-opt-2");
      fireEvent.click(parisOption);

      // Option should be selected
      expect(parisOption).toHaveAttribute("aria-checked", "true");
    });

    it("disables options after selection", async () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      const parisOption = screen.getByTestId("quiz-option-opt-2");
      fireEvent.click(parisOption);

      // All options should be disabled
      expect(screen.getByTestId("quiz-option-opt-1")).toBeDisabled();
      expect(screen.getByTestId("quiz-option-opt-2")).toBeDisabled();
      expect(screen.getByTestId("quiz-option-opt-3")).toBeDisabled();
      expect(screen.getByTestId("quiz-option-opt-4")).toBeDisabled();
    });

    it("shows correct state for correct answer", async () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      const parisOption = screen.getByTestId("quiz-option-opt-2");
      fireEvent.click(parisOption);

      // Fast-forward through feedback delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Option should show correct state
      expect(parisOption).toHaveAttribute("data-state", "correct");
    });

    it("shows incorrect state for wrong answer", async () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      const londonOption = screen.getByTestId("quiz-option-opt-1");
      fireEvent.click(londonOption);

      // Fast-forward through feedback delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Selected option should show incorrect state
      expect(londonOption).toHaveAttribute("data-state", "incorrect");

      // Correct option should be highlighted
      const parisOption = screen.getByTestId("quiz-option-opt-2");
      expect(parisOption).toHaveAttribute("data-state", "correct");
    });
  });

  describe("User answer display", () => {
    it("shows user answer as pill after selection", async () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      // User answer should appear
      expect(screen.getByTestId("quiz-user-answer-item-1")).toBeInTheDocument();

      // Should be in user bubble
      const userBubbles = screen.getAllByTestId("bubble-user");
      expect(userBubbles.length).toBeGreaterThan(0);
    });
  });

  describe("Feedback", () => {
    it("shows feedback bubble after delay", async () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      // Fast-forward through feedback delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Feedback should appear
      expect(screen.getByTestId("quiz-feedback-item-1")).toBeInTheDocument();
    });

    it("shows correct feedback for right answer", async () => {
      const quiz = createQuiz({ explanation: "Great job! Paris is correct." });
      render(<ConversationalQuiz itemId="item-1" quiz={quiz} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByText("Great job! Paris is correct.")).toBeInTheDocument();
    });

    it("shows incorrect feedback for wrong answer", async () => {
      const quiz = createQuiz({ explanation: "Paris is the capital city of France." });
      render(<ConversationalQuiz itemId="item-1" quiz={quiz} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-1")); // London (wrong)

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(
        screen.getByText(/Not quite.*Paris is the capital city of France./)
      ).toBeInTheDocument();
    });

    it("shows default correct message when no explanation", async () => {
      const quiz = createQuiz({ explanation: undefined });
      render(<ConversationalQuiz itemId="item-1" quiz={quiz} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByText("That's correct!")).toBeInTheDocument();
    });

    it("shows continue button after feedback", async () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByTestId("quiz-continue-item-1")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Continue to next question" })
      ).toBeInTheDocument();
    });
  });

  describe("Context integration", () => {
    it("adds question message on mount", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      expect(mockAddMessage).toHaveBeenCalledWith(
        "alex",
        "What is the capital of France?",
        "item-1"
      );
    });

    it("adds user answer message on selection", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      expect(mockAddMessage).toHaveBeenCalledWith("user", "Paris", "item-1");
    });

    it("records answer in context", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      expect(mockRecordAnswer).toHaveBeenCalledWith("item-1", ["opt-2"], true);
    });

    it("records incorrect answer correctly", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-1")); // London (wrong)

      expect(mockRecordAnswer).toHaveBeenCalledWith("item-1", ["opt-1"], false);
    });

    it("adds feedback message after delay", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should have added feedback message
      expect(mockAddMessage).toHaveBeenCalledWith(
        "alex",
        "Paris is the capital city of France.",
        "item-1"
      );
    });
  });

  describe("Auto-advance", () => {
    it("calls onComplete after auto-advance delay", async () => {
      const onComplete = jest.fn();
      render(
        <ConversationalQuiz
          itemId="item-1"
          quiz={createQuiz()}
          onComplete={onComplete}
          autoAdvanceDelay={1500}
        />
      );

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      // After feedback delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onComplete).not.toHaveBeenCalled();

      // After auto-advance delay
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("respects custom autoAdvanceDelay", async () => {
      const onComplete = jest.fn();
      render(
        <ConversationalQuiz
          itemId="item-1"
          quiz={createQuiz()}
          onComplete={onComplete}
          autoAdvanceDelay={3000}
        />
      );

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // After 1500ms (default), should not have called
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(onComplete).not.toHaveBeenCalled();

      // After 3000ms total, should call
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("skips auto-advance on continue button click", async () => {
      const onComplete = jest.fn();
      render(
        <ConversationalQuiz
          itemId="item-1"
          quiz={createQuiz()}
          onComplete={onComplete}
          autoAdvanceDelay={5000}
        />
      );

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Click continue before auto-advance
      fireEvent.click(screen.getByTestId("quiz-continue-item-1"));

      expect(onComplete).toHaveBeenCalledTimes(1);

      // Should not call again after auto-advance time
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Already answered state", () => {
    it("restores from existing answer", () => {
      mockHasAnswer.mockReturnValue(true);
      mockGetAnswer.mockReturnValue({
        selectedIds: ["opt-2"],
        isCorrect: true,
        timestamp: Date.now(),
      });

      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      // Should show feedback state immediately
      expect(screen.getByTestId("quiz-feedback-item-1")).toBeInTheDocument();

      // Should not add question message again
      expect(mockAddMessage).not.toHaveBeenCalledWith(
        "alex",
        "What is the capital of France?",
        "item-1"
      );
    });

    it("shows correct option as selected when restored", () => {
      mockHasAnswer.mockReturnValue(true);
      mockGetAnswer.mockReturnValue({
        selectedIds: ["opt-2"],
        isCorrect: true,
        timestamp: Date.now(),
      });

      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      const parisOption = screen.getByTestId("quiz-option-opt-2");
      expect(parisOption).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Accessibility", () => {
    it("has correct role structure", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      // Container has group role
      expect(screen.getByRole("group")).toBeInTheDocument();

      // Options container has radiogroup role
      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("options have correct aria attributes", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      const options = screen.getAllByRole("radio");
      options.forEach((option) => {
        expect(option).toHaveAttribute("aria-checked", "false");
        expect(option).toHaveAttribute("aria-disabled", "false");
      });
    });

    it("updates aria-checked on selection", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      const parisOption = screen.getByTestId("quiz-option-opt-2");
      expect(parisOption).toHaveAttribute("aria-checked", "true");

      const londonOption = screen.getByTestId("quiz-option-opt-1");
      expect(londonOption).toHaveAttribute("aria-checked", "false");
    });

    it("updates aria-disabled after selection", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      const options = screen.getAllByRole("radio");
      options.forEach((option) => {
        expect(option).toHaveAttribute("aria-disabled", "true");
      });
    });

    it("continue button has accessible label", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(
        screen.getByRole("button", { name: "Continue to next question" })
      ).toBeInTheDocument();
    });

    it("shows checkmark for correct answer", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const parisOption = screen.getByTestId("quiz-option-opt-2");
      expect(parisOption.textContent).toContain("✓");
    });

    it("shows X for incorrect answer", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-1")); // Wrong answer

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const londonOption = screen.getByTestId("quiz-option-opt-1");
      expect(londonOption.textContent).toContain("✗");
    });
  });

  describe("Keyboard navigation", () => {
    it("handles Enter key to continue during feedback", () => {
      const onComplete = jest.fn();
      render(
        <ConversationalQuiz
          itemId="item-1"
          quiz={createQuiz()}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Press Enter on the container
      fireEvent.keyDown(screen.getByTestId("quiz-item-1"), { key: "Enter" });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("ignores Enter key before feedback", () => {
      const onComplete = jest.fn();
      render(
        <ConversationalQuiz
          itemId="item-1"
          quiz={createQuiz()}
          onComplete={onComplete}
        />
      );

      // Press Enter before answering
      fireEvent.keyDown(screen.getByTestId("quiz-item-1"), { key: "Enter" });

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("handles quiz with no explanation", () => {
      const quiz = createQuiz({ explanation: undefined });
      render(<ConversationalQuiz itemId="item-1" quiz={quiz} />);

      fireEvent.click(screen.getByTestId("quiz-option-opt-1")); // Wrong

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should show default incorrect message with correct answer
      expect(screen.getByText(/The correct answer is: Paris/)).toBeInTheDocument();
    });

    it("handles rapid clicks", () => {
      render(<ConversationalQuiz itemId="item-1" quiz={createQuiz()} />);

      // Click multiple options rapidly
      fireEvent.click(screen.getByTestId("quiz-option-opt-1"));
      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));
      fireEvent.click(screen.getByTestId("quiz-option-opt-3"));

      // Only first click should register
      expect(mockRecordAnswer).toHaveBeenCalledTimes(1);
      expect(mockRecordAnswer).toHaveBeenCalledWith("item-1", ["opt-1"], false);
    });

    it("handles autoAdvanceDelay of 0", () => {
      const onComplete = jest.fn();
      render(
        <ConversationalQuiz
          itemId="item-1"
          quiz={createQuiz()}
          onComplete={onComplete}
          autoAdvanceDelay={0}
        />
      );

      fireEvent.click(screen.getByTestId("quiz-option-opt-2"));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not auto-advance when delay is 0
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
