import { render, screen } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
  describe("rendering", () => {
    test("renders progress bar container", () => {
      render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });

    test("applies custom className", () => {
      const { container } = render(
        <ProgressBar
          progress={50}
          totalSteps={10}
          completedSteps={5}
          className="my-custom-class"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("my-custom-class");
    });
  });

  describe("progress display", () => {
    test("shows correct percentage width", () => {
      const { container } = render(
        <ProgressBar progress={75} totalSteps={4} completedSteps={3} />
      );

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveStyle({ width: "75%" });
    });

    test("shows 0% when no steps completed", () => {
      const { container } = render(
        <ProgressBar progress={0} totalSteps={10} completedSteps={0} />
      );

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveStyle({ width: "0%" });
    });

    test("shows 100% when all steps completed", () => {
      const { container } = render(
        <ProgressBar progress={100} totalSteps={5} completedSteps={5} />
      );

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveStyle({ width: "100%" });
    });
  });

  describe("step count text", () => {
    test("displays X of Y complete text", () => {
      render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      expect(screen.getByText("5 of 10 complete")).toBeInTheDocument();
    });

    test("displays 0 of X when no steps completed", () => {
      render(
        <ProgressBar progress={0} totalSteps={8} completedSteps={0} />
      );

      expect(screen.getByText("0 of 8 complete")).toBeInTheDocument();
    });

    test("displays X of X when all steps completed", () => {
      render(
        <ProgressBar progress={100} totalSteps={6} completedSteps={6} />
      );

      expect(screen.getByText("6 of 6 complete")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    test("has aria-valuenow matching progress", () => {
      render(
        <ProgressBar progress={42} totalSteps={10} completedSteps={4} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "42");
    });

    test("has aria-valuemin of 0", () => {
      render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    });

    test("has aria-valuemax of 100", () => {
      render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    });

    test("has descriptive aria-label", () => {
      render(
        <ProgressBar progress={60} totalSteps={5} completedSteps={3} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute(
        "aria-label",
        "3 of 5 steps complete"
      );
    });
  });

  describe("animation", () => {
    test("progress fill has transition classes for smooth animation", () => {
      const { container } = render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveClass("transition-all");
      expect(progressFill).toHaveClass("duration-300");
    });
  });

  describe("styling", () => {
    test("progress bar has rounded corners", () => {
      const { container } = render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveClass("rounded-full");

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveClass("rounded-full");
    });

    test("progress bar has gray background", () => {
      render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveClass("bg-gray-200");
    });

    test("progress fill has blue background", () => {
      const { container } = render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveClass("bg-blue-600");
    });

    test("step count text is styled as small right-aligned text", () => {
      render(
        <ProgressBar progress={50} totalSteps={10} completedSteps={5} />
      );

      const stepText = screen.getByText("5 of 10 complete");
      expect(stepText).toHaveClass("text-xs");
      expect(stepText).toHaveClass("text-gray-500");
      expect(stepText).toHaveClass("text-right");
    });
  });

  describe("edge cases", () => {
    test("handles progress value of 0", () => {
      render(
        <ProgressBar progress={0} totalSteps={5} completedSteps={0} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    });

    test("handles progress value of 100", () => {
      render(
        <ProgressBar progress={100} totalSteps={3} completedSteps={3} />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    });

    test("handles single step journey", () => {
      render(
        <ProgressBar progress={100} totalSteps={1} completedSteps={1} />
      );

      expect(screen.getByText("1 of 1 complete")).toBeInTheDocument();
    });

    test("handles many steps", () => {
      render(
        <ProgressBar progress={10} totalSteps={100} completedSteps={10} />
      );

      expect(screen.getByText("10 of 100 complete")).toBeInTheDocument();
    });

    test("handles decimal progress values", () => {
      const { container } = render(
        <ProgressBar progress={33.33} totalSteps={3} completedSteps={1} />
      );

      const progressFill = container.querySelector('[style*="width"]');
      expect(progressFill).toHaveStyle({ width: "33.33%" });
    });
  });
});
