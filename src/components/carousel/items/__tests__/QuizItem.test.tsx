import { render, screen, fireEvent } from "@testing-library/react";
import { QuizItem } from "../QuizItem";
import type { QuizBlock } from "@/types/module";

describe("QuizItem", () => {
  const singleChoiceQuiz: QuizBlock = {
    id: "quiz-1",
    type: "quiz",
    question: "What is the capital of France?",
    options: [
      { id: "a", text: "London", isCorrect: false },
      { id: "b", text: "Paris", isCorrect: true },
      { id: "c", text: "Berlin", isCorrect: false },
      { id: "d", text: "Madrid", isCorrect: false },
    ],
    explanation: "Paris is the capital and largest city of France.",
  };

  const multiSelectQuiz: QuizBlock = {
    id: "quiz-2",
    type: "quiz",
    question: "Which are programming languages?",
    options: [
      { id: "a", text: "Python", isCorrect: true },
      { id: "b", text: "HTML", isCorrect: false },
      { id: "c", text: "JavaScript", isCorrect: true },
      { id: "d", text: "CSS", isCorrect: false },
    ],
    multiSelect: true,
    explanation: "Python and JavaScript are programming languages.",
  };

  describe("Rendering", () => {
    it("renders the question", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
    });

    it("renders all options", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      expect(screen.getByText("London")).toBeInTheDocument();
      expect(screen.getByText("Paris")).toBeInTheDocument();
      expect(screen.getByText("Berlin")).toBeInTheDocument();
      expect(screen.getByText("Madrid")).toBeInTheDocument();
    });

    it("renders option letters (A, B, C, D)", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();
      expect(screen.getByText("D")).toBeInTheDocument();
    });

    it("renders Check Answer button initially", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      expect(screen.getByRole("button", { name: "Check Answer" })).toBeInTheDocument();
    });

    it("uses large centered typography", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const question = screen.getByRole("heading", { level: 2 });
      expect(question).toHaveClass("text-2xl", "sm:text-3xl", "text-center");
    });
  });

  describe("Single Choice Selection", () => {
    it("allows selecting an option", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);
      expect(parisOption).toHaveAttribute("aria-checked", "true");
    });

    it("only allows one selection at a time", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const londonOption = screen.getByRole("radio", { name: /London/i });
      const parisOption = screen.getByRole("radio", { name: /Paris/i });

      fireEvent.click(londonOption);
      expect(londonOption).toHaveAttribute("aria-checked", "true");
      expect(parisOption).toHaveAttribute("aria-checked", "false");

      fireEvent.click(parisOption);
      expect(londonOption).toHaveAttribute("aria-checked", "false");
      expect(parisOption).toHaveAttribute("aria-checked", "true");
    });

    it("disables submit when no option selected", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit when an option is selected", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Multi-Select", () => {
    it("uses checkbox role for multi-select", () => {
      render(<QuizItem block={multiSelectQuiz} />);
      const pythonOption = screen.getByRole("checkbox", { name: /Python/i });
      expect(pythonOption).toBeInTheDocument();
    });

    it("allows selecting multiple options", () => {
      render(<QuizItem block={multiSelectQuiz} />);
      const pythonOption = screen.getByRole("checkbox", { name: /Python/i });
      const jsOption = screen.getByRole("checkbox", { name: /JavaScript/i });

      fireEvent.click(pythonOption);
      fireEvent.click(jsOption);

      expect(pythonOption).toHaveAttribute("aria-checked", "true");
      expect(jsOption).toHaveAttribute("aria-checked", "true");
    });

    it("allows toggling options off", () => {
      render(<QuizItem block={multiSelectQuiz} />);
      const pythonOption = screen.getByRole("checkbox", { name: /Python/i });

      fireEvent.click(pythonOption);
      expect(pythonOption).toHaveAttribute("aria-checked", "true");

      fireEvent.click(pythonOption);
      expect(pythonOption).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Submission and Feedback", () => {
    it("shows correct feedback when right answer selected", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    it("shows incorrect feedback when wrong answer selected", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const londonOption = screen.getByRole("radio", { name: /London/i });
      fireEvent.click(londonOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(screen.getByText("Not quite")).toBeInTheDocument();
    });

    it("displays explanation after submission", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(screen.getByText(/Paris is the capital/)).toBeInTheDocument();
    });

    it("shows Continue button after submission", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    });

    it("disables options after submission", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      const londonOption = screen.getByRole("radio", { name: /London/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(parisOption).toBeDisabled();
      expect(londonOption).toBeDisabled();
    });

    it("highlights correct answer with green styling", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(parisOption).toHaveClass("border-green-500", "bg-green-50");
    });

    it("highlights wrong selection with red styling", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const londonOption = screen.getByRole("radio", { name: /London/i });
      fireEvent.click(londonOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(londonOption).toHaveClass("border-red-500", "bg-red-50");
    });
  });

  describe("onComplete Callback", () => {
    it("calls onComplete when Continue is clicked", () => {
      const onComplete = jest.fn();
      render(<QuizItem block={singleChoiceQuiz} onComplete={onComplete} />);

      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      const continueButton = screen.getByRole("button", { name: "Continue" });
      fireEvent.click(continueButton);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("does not call onComplete on submit", () => {
      const onComplete = jest.fn();
      render(<QuizItem block={singleChoiceQuiz} onComplete={onComplete} />);

      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("uses aria-checked for selection state", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      expect(parisOption).toHaveAttribute("aria-checked", "false");

      fireEvent.click(parisOption);
      expect(parisOption).toHaveAttribute("aria-checked", "true");
    });

    it("uses aria-disabled after submission", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(parisOption).toHaveAttribute("aria-disabled", "true");
    });

    it("has aria-live on feedback region", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      const parisOption = screen.getByRole("radio", { name: /Paris/i });
      fireEvent.click(parisOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      const feedbackRegion = screen.getByRole("status");
      expect(feedbackRegion).toHaveAttribute("aria-live", "polite");
    });

    it("has group role on options container", () => {
      render(<QuizItem block={singleChoiceQuiz} />);
      expect(screen.getByRole("group", { name: "Quiz options" })).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("uses min-height for vertical centering", () => {
      const { container } = render(<QuizItem block={singleChoiceQuiz} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("min-h-[50vh]");
    });

    it("centers content", () => {
      const { container } = render(<QuizItem block={singleChoiceQuiz} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <QuizItem block={singleChoiceQuiz} className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("Without explanation", () => {
    it("renders feedback without explanation", () => {
      const quizWithoutExplanation: QuizBlock = {
        id: "quiz-no-exp",
        type: "quiz",
        question: "Simple question?",
        options: [
          { id: "a", text: "Yes", isCorrect: true },
          { id: "b", text: "No", isCorrect: false },
        ],
      };

      render(<QuizItem block={quizWithoutExplanation} />);
      const yesOption = screen.getByRole("radio", { name: /Yes/i });
      fireEvent.click(yesOption);

      const submitButton = screen.getByRole("button", { name: "Check Answer" });
      fireEvent.click(submitButton);

      expect(screen.getByText("Correct!")).toBeInTheDocument();
      // Should not crash and should still show continue button
      expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    });
  });
});
