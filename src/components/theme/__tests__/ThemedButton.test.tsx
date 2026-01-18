/**
 * Tests for ThemedButton component
 * Issue: #36 - Company theming system
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ThemedButton } from "../ThemedButton";

describe("ThemedButton", () => {
  test("renders children", () => {
    render(<ThemedButton>Click me</ThemedButton>);

    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  test("handles click events", () => {
    const handleClick = jest.fn();
    render(<ThemedButton onClick={handleClick}>Click me</ThemedButton>);

    fireEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe("variants", () => {
    test("primary variant uses theme primary color", () => {
      render(<ThemedButton variant="primary">Primary</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-[var(--theme-primary,#2563eb)]");
      expect(button).toHaveClass("text-[var(--theme-text-on-primary,#ffffff)]");
    });

    test("secondary variant uses theme secondary color", () => {
      render(<ThemedButton variant="secondary">Secondary</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-[var(--theme-secondary,#64748b)]");
      expect(button).toHaveClass("text-[var(--theme-text-on-secondary,#ffffff)]");
    });

    test("outline variant uses border", () => {
      render(<ThemedButton variant="outline">Outline</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("border-2");
      expect(button).toHaveClass("border-[var(--theme-primary,#2563eb)]");
      expect(button).toHaveClass("bg-transparent");
    });

    test("defaults to primary variant", () => {
      render(<ThemedButton>Default</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-[var(--theme-primary,#2563eb)]");
    });
  });

  describe("sizes", () => {
    test("small size has appropriate padding", () => {
      render(<ThemedButton size="small">Small</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
      expect(button).toHaveClass("text-sm");
    });

    test("medium size has appropriate padding", () => {
      render(<ThemedButton size="medium">Medium</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-6");
      expect(button).toHaveClass("py-3");
      expect(button).toHaveClass("text-base");
    });

    test("large size has appropriate padding", () => {
      render(<ThemedButton size="large">Large</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-8");
      expect(button).toHaveClass("py-4");
      expect(button).toHaveClass("text-lg");
    });

    test("defaults to medium size", () => {
      render(<ThemedButton>Default</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-6");
      expect(button).toHaveClass("py-3");
    });
  });

  describe("accessibility", () => {
    test("minimum touch target size (44px)", () => {
      render(<ThemedButton size="small">Small</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("min-h-[36px]");
      expect(button).toHaveClass("min-w-[44px]");
    });

    test("medium button meets touch target", () => {
      render(<ThemedButton size="medium">Medium</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("min-h-[44px]");
    });

    test("large button exceeds touch target", () => {
      render(<ThemedButton size="large">Large</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("min-h-[52px]");
    });

    test("has focus ring styles", () => {
      render(<ThemedButton>Focusable</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus:ring-2");
      expect(button).toHaveClass("focus:ring-offset-2");
    });
  });

  describe("states", () => {
    test("disabled state", () => {
      render(<ThemedButton disabled>Disabled</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:opacity-50");
      expect(button).toHaveClass("disabled:cursor-not-allowed");
    });

    test("passes through HTML button attributes", () => {
      render(
        <ThemedButton type="submit" name="submit-btn">
          Submit
        </ThemedButton>
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
      expect(button).toHaveAttribute("name", "submit-btn");
    });
  });

  describe("fullWidth", () => {
    test("fullWidth applies w-full class", () => {
      render(<ThemedButton fullWidth>Full Width</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
    });

    test("not fullWidth by default", () => {
      render(<ThemedButton>Default</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).not.toHaveClass("w-full");
    });
  });

  describe("custom className", () => {
    test("accepts custom className", () => {
      render(<ThemedButton className="custom-class">Custom</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    test("custom className does not override base styles", () => {
      render(<ThemedButton className="custom-class">Custom</ThemedButton>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
      expect(button).toHaveClass("rounded-lg");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref to button element", () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<ThemedButton ref={ref}>Ref Button</ThemedButton>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
