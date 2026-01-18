import { render, screen, fireEvent } from "@testing-library/react";
import { QuizBlock } from "../QuizBlock";
import type { QuizBlock as QuizBlockType } from "@/types/module";

describe("QuizBlock", () => {
  const singleSelectBlock: QuizBlockType = {
    id: "1",
    type: "quiz",
    question: "What is 2 + 2?",
    options: [
      { id: "a", text: "3", isCorrect: false },
      { id: "b", text: "4", isCorrect: true },
      { id: "c", text: "5", isCorrect: false },
    ],
    explanation: "2 + 2 equals 4 because that's basic math.",
  };

  const multiSelectBlock: QuizBlockType = {
    id: "2",
    type: "quiz",
    question: "Which of these are fruits?",
    options: [
      { id: "a", text: "Apple", isCorrect: true },
      { id: "b", text: "Carrot", isCorrect: false },
      { id: "c", text: "Banana", isCorrect: true },
    ],
    multiSelect: true,
    explanation: "Apple and Banana are fruits. Carrot is a vegetable.",
  };

  describe("rendering", () => {
    it("renders question and options", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("uses radio buttons for single-select", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const options = screen.getAllByRole("radio");
      expect(options).toHaveLength(3);
    });

    it("uses checkboxes for multi-select", () => {
      render(<QuizBlock block={multiSelectBlock} />);

      const options = screen.getAllByRole("checkbox");
      expect(options).toHaveLength(3);
    });
  });

  describe("submit button", () => {
    it("is disabled until selection is made", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const submitButton = screen.getByText("Submit Answer");
      expect(submitButton).toBeDisabled();
    });

    it("is enabled after selection", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const option = screen.getByText("4");
      fireEvent.click(option);

      const submitButton = screen.getByText("Submit Answer");
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("feedback", () => {
    it("shows correct feedback for right answer", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const correctOption = screen.getByText("4");
      fireEvent.click(correctOption);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    it("shows incorrect feedback for wrong answer", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const wrongOption = screen.getByText("3");
      fireEvent.click(wrongOption);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      expect(screen.getByText("Incorrect")).toBeInTheDocument();
    });

    it("reveals explanation after submit", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      // Explanation should not be visible initially
      expect(
        screen.queryByText("2 + 2 equals 4 because that's basic math.")
      ).not.toBeInTheDocument();

      const option = screen.getByText("4");
      fireEvent.click(option);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      expect(
        screen.getByText("2 + 2 equals 4 because that's basic math.")
      ).toBeInTheDocument();
    });

    it("highlights correct answer in green", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const correctOption = screen.getByText("4");
      fireEvent.click(correctOption);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      // The button containing "4" should have green styling (the button itself)
      const buttons = screen.getAllByRole("radio");
      const correctButton = buttons.find((btn) =>
        btn.textContent?.includes("4")
      );
      expect(correctButton).toHaveClass("border-green-500");
    });

    it("highlights incorrect answer in red", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const wrongOption = screen.getByText("3");
      fireEvent.click(wrongOption);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      // The button containing "3" should have red styling (the button itself)
      const buttons = screen.getAllByRole("radio");
      const incorrectButton = buttons.find((btn) =>
        btn.textContent?.includes("3")
      );
      expect(incorrectButton).toHaveClass("border-red-500");
    });
  });

  describe("onComplete callback", () => {
    it("calls onComplete after submit", () => {
      const mockOnComplete = jest.fn();
      render(<QuizBlock block={singleSelectBlock} onComplete={mockOnComplete} />);

      const option = screen.getByText("4");
      fireEvent.click(option);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it("calls onComplete even for wrong answer", () => {
      const mockOnComplete = jest.fn();
      render(<QuizBlock block={singleSelectBlock} onComplete={mockOnComplete} />);

      const option = screen.getByText("3");
      fireEvent.click(option);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("multi-select behavior", () => {
    it("allows selecting multiple options", () => {
      render(<QuizBlock block={multiSelectBlock} />);

      const apple = screen.getByText("Apple");
      const banana = screen.getByText("Banana");

      fireEvent.click(apple);
      fireEvent.click(banana);

      const checkboxes = screen.getAllByRole("checkbox");
      const selectedCount = checkboxes.filter(
        (cb) => cb.getAttribute("aria-checked") === "true"
      ).length;
      expect(selectedCount).toBe(2);
    });

    it("shows correct for all correct selections", () => {
      render(<QuizBlock block={multiSelectBlock} />);

      const apple = screen.getByText("Apple");
      const banana = screen.getByText("Banana");

      fireEvent.click(apple);
      fireEvent.click(banana);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    it("shows incorrect if not all correct options selected", () => {
      render(<QuizBlock block={multiSelectBlock} />);

      // Only select one of the two correct options
      const apple = screen.getByText("Apple");
      fireEvent.click(apple);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      expect(screen.getByText("Incorrect")).toBeInTheDocument();
    });

    it("allows deselecting options", () => {
      render(<QuizBlock block={multiSelectBlock} />);

      const apple = screen.getByText("Apple");

      fireEvent.click(apple); // Select
      fireEvent.click(apple); // Deselect

      const checkboxes = screen.getAllByRole("checkbox");
      const selectedCount = checkboxes.filter(
        (cb) => cb.getAttribute("aria-checked") === "true"
      ).length;
      expect(selectedCount).toBe(0);
    });
  });

  describe("disabled state after submit", () => {
    it("disables options after submit", () => {
      render(<QuizBlock block={singleSelectBlock} />);

      const option = screen.getByText("4");
      fireEvent.click(option);

      const submitButton = screen.getByText("Submit Answer");
      fireEvent.click(submitButton);

      const options = screen.getAllByRole("radio");
      options.forEach((opt) => {
        expect(opt).toHaveAttribute("aria-disabled", "true");
      });
    });
  });
});
