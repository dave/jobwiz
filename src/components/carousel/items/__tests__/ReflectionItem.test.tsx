import { render, screen, fireEvent } from "@testing-library/react";
import { ReflectionItem } from "../ReflectionItem";
import type { QuizBlock } from "@/types/module";

describe("ReflectionItem", () => {
  const reflectionQuiz: QuizBlock = {
    id: "reflection-1",
    type: "quiz",
    question: "Tell me about a time you had to lead a project without formal authority.",
    options: [
      { id: "a", text: "Describing coercion as influence", isCorrect: false },
      {
        id: "b",
        text: "Demonstrate influence without authority, stakeholder management, and self-awareness about leadership style",
        isCorrect: true,
      },
      { id: "c", text: "Taking all credit", isCorrect: false },
      { id: "d", text: "Focusing on the WHAT instead of the HOW", isCorrect: false },
    ],
    explanation:
      "Focus on showing how you built consensus and motivated team members without positional power.",
  };

  const quizWithoutExplanation: QuizBlock = {
    id: "reflection-2",
    type: "quiz",
    question: "Describe a conflict you resolved.",
    options: [
      { id: "a", text: "No resolution provided", isCorrect: false },
      {
        id: "b",
        text: "Demonstrate conflict resolution skills and emotional intelligence",
        isCorrect: true,
      },
      { id: "c", text: "Blaming others", isCorrect: false },
    ],
  };

  const quizAllIncorrect: QuizBlock = {
    id: "reflection-3",
    type: "quiz",
    question: "What should you avoid?",
    options: [
      { id: "a", text: "Being unprepared", isCorrect: false },
      { id: "b", text: "Not asking questions", isCorrect: false },
      { id: "c", text: "Showing up late", isCorrect: false },
    ],
    explanation: "All of these should be avoided.",
  };

  describe("Rendering", () => {
    it("renders the question in the interview question section", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(
        screen.getByText(/Tell me about a time you had to lead a project/)
      ).toBeInTheDocument();
    });

    it("renders the question with quote marks", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const questionText = screen.getByText(/Tell me about a time/);
      // Check the parent element contains the quote character
      expect(questionText.textContent).toContain("Tell me about a time");
    });

    it("renders 'Interview Question' label", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByText("Interview Question")).toBeInTheDocument();
    });

    it("renders 'What to Demonstrate' section with correct answer", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByText("What to Demonstrate")).toBeInTheDocument();
      expect(
        screen.getByText(/Demonstrate influence without authority/)
      ).toBeInTheDocument();
    });

    it("renders 'Common Mistakes to Avoid' section", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByText("Common Mistakes to Avoid")).toBeInTheDocument();
    });

    it("renders incorrect answers as bullets", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByText("Describing coercion as influence")).toBeInTheDocument();
      expect(screen.getByText("Taking all credit")).toBeInTheDocument();
      expect(screen.getByText(/Focusing on the WHAT/)).toBeInTheDocument();
    });

    it("renders 'Tip' section with explanation", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByText("Tip")).toBeInTheDocument();
      expect(screen.getByText(/Focus on showing how you built consensus/)).toBeInTheDocument();
    });

    it("renders Continue button", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    });
  });

  describe("Without explanation", () => {
    it("does not render Tip section when no explanation", () => {
      render(<ReflectionItem block={quizWithoutExplanation} />);
      expect(screen.queryByText("Tip")).not.toBeInTheDocument();
    });

    it("still renders other sections", () => {
      render(<ReflectionItem block={quizWithoutExplanation} />);
      expect(screen.getByText("Interview Question")).toBeInTheDocument();
      expect(screen.getByText("What to Demonstrate")).toBeInTheDocument();
      expect(screen.getByText("Common Mistakes to Avoid")).toBeInTheDocument();
    });
  });

  describe("Without correct answer", () => {
    it("does not render What to Demonstrate section when no correct answer", () => {
      render(<ReflectionItem block={quizAllIncorrect} />);
      expect(screen.queryByText("What to Demonstrate")).not.toBeInTheDocument();
    });

    it("still renders mistakes section", () => {
      render(<ReflectionItem block={quizAllIncorrect} />);
      expect(screen.getByText("Common Mistakes to Avoid")).toBeInTheDocument();
      expect(screen.getByText("Being unprepared")).toBeInTheDocument();
      expect(screen.getByText("Not asking questions")).toBeInTheDocument();
      expect(screen.getByText("Showing up late")).toBeInTheDocument();
    });
  });

  describe("onComplete Callback", () => {
    it("calls onComplete when Continue is clicked", () => {
      const onComplete = jest.fn();
      render(<ReflectionItem block={reflectionQuiz} onComplete={onComplete} />);

      const continueButton = screen.getByRole("button", { name: "Continue" });
      fireEvent.click(continueButton);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("works without onComplete callback", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const continueButton = screen.getByRole("button", { name: "Continue" });

      // Should not throw
      expect(() => fireEvent.click(continueButton)).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("has aria-label on interview question region", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByRole("region", { name: "Interview question" })).toBeInTheDocument();
    });

    it("has aria-label on what to demonstrate region", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByRole("region", { name: "What to demonstrate" })).toBeInTheDocument();
    });

    it("has aria-label on common mistakes region", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByRole("region", { name: "Common mistakes to avoid" })).toBeInTheDocument();
    });

    it("has aria-label on tip region", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      expect(screen.getByRole("note", { name: "Tip" })).toBeInTheDocument();
    });

    it("Continue button is keyboard accessible", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const continueButton = screen.getByRole("button", { name: "Continue" });
      expect(continueButton).toHaveAttribute("type", "button");
    });
  });

  describe("Styling", () => {
    it("uses blue background for question section", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const questionRegion = screen.getByRole("region", { name: "Interview question" });
      expect(questionRegion).toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("uses green background for what to demonstrate section", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const demonstrateRegion = screen.getByRole("region", { name: "What to demonstrate" });
      expect(demonstrateRegion).toHaveClass("bg-green-50", "border-green-200");
    });

    it("uses amber background for mistakes section", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const mistakesRegion = screen.getByRole("region", { name: "Common mistakes to avoid" });
      expect(mistakesRegion).toHaveClass("bg-amber-50", "border-amber-200");
    });

    it("uses purple background for tip section", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const tipRegion = screen.getByRole("note", { name: "Tip" });
      expect(tipRegion).toHaveClass("bg-purple-50", "border-purple-200");
    });

    it("uses blue styling for Continue button", () => {
      render(<ReflectionItem block={reflectionQuiz} />);
      const continueButton = screen.getByRole("button", { name: "Continue" });
      expect(continueButton).toHaveClass("bg-blue-600", "text-white");
    });
  });

  describe("Layout", () => {
    it("uses min-height for vertical centering", () => {
      const { container } = render(<ReflectionItem block={reflectionQuiz} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("min-h-[40vh]", "sm:min-h-[50vh]");
    });

    it("centers content", () => {
      const { container } = render(<ReflectionItem block={reflectionQuiz} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <ReflectionItem block={reflectionQuiz} className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("uses max-width for content", () => {
      const { container } = render(<ReflectionItem block={reflectionQuiz} />);
      const contentWrapper = container.querySelector(".max-w-2xl");
      expect(contentWrapper).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles quiz with single incorrect answer", () => {
      const singleIncorrect: QuizBlock = {
        id: "single",
        type: "quiz",
        question: "Test question",
        options: [
          { id: "a", text: "Correct answer", isCorrect: true },
          { id: "b", text: "Single mistake", isCorrect: false },
        ],
      };

      render(<ReflectionItem block={singleIncorrect} />);
      expect(screen.getByText("Single mistake")).toBeInTheDocument();
    });

    it("handles quiz with only correct answer", () => {
      const onlyCorrect: QuizBlock = {
        id: "only-correct",
        type: "quiz",
        question: "Test question",
        options: [{ id: "a", text: "The only answer", isCorrect: true }],
      };

      render(<ReflectionItem block={onlyCorrect} />);
      expect(screen.getByText("The only answer")).toBeInTheDocument();
      expect(screen.queryByText("Common Mistakes to Avoid")).not.toBeInTheDocument();
    });

    it("handles empty options array", () => {
      const emptyOptions: QuizBlock = {
        id: "empty",
        type: "quiz",
        question: "Test question",
        options: [],
      };

      render(<ReflectionItem block={emptyOptions} />);
      expect(screen.getByText(/Test question/)).toBeInTheDocument();
      expect(screen.queryByText("What to Demonstrate")).not.toBeInTheDocument();
      expect(screen.queryByText("Common Mistakes to Avoid")).not.toBeInTheDocument();
    });

    it("handles long question text", () => {
      const longQuestion: QuizBlock = {
        id: "long",
        type: "quiz",
        question:
          "This is a very long interview question that spans multiple lines and tests how the component handles lengthy text content in the question field without breaking the layout or causing any visual issues",
        options: [{ id: "a", text: "Answer", isCorrect: true }],
      };

      render(<ReflectionItem block={longQuestion} />);
      expect(screen.getByText(/This is a very long interview question/)).toBeInTheDocument();
    });

    it("handles special characters in text", () => {
      const specialChars: QuizBlock = {
        id: "special",
        type: "quiz",
        question: "How do you handle <script> tags & SQL injection?",
        options: [
          { id: "a", text: "Use proper escaping & sanitization", isCorrect: true },
          { id: "b", text: "Ignore security concerns", isCorrect: false },
        ],
        explanation: "Always escape special characters like <, >, &, and quotes.",
      };

      render(<ReflectionItem block={specialChars} />);
      expect(screen.getByText(/How do you handle/)).toBeInTheDocument();
      expect(screen.getByText(/Use proper escaping/)).toBeInTheDocument();
    });
  });
});
