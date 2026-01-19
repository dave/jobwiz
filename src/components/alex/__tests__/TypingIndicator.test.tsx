/**
 * Tests for TypingIndicator component
 * Issue: #183 - 1.2: Chat bubble components
 */

import { render, screen } from "@testing-library/react";
import { TypingIndicator } from "../TypingIndicator";

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return {
    ...actual,
    motion: {
      span: ({
        children,
        className,
        style,
        ...props
      }: React.HTMLAttributes<HTMLSpanElement> & {
        style?: React.CSSProperties;
      }) => (
        <span
          className={className}
          style={style}
          data-testid="typing-dot"
          {...props}
        >
          {children}
        </span>
      ),
    },
    useReducedMotion: jest.fn(() => false),
  };
});

describe("TypingIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    test("renders the typing indicator", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toBeInTheDocument();
    });

    test("renders three dots", () => {
      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      expect(dots).toHaveLength(3);
    });

    test("dots container has correct class", () => {
      render(<TypingIndicator />);

      const dotsContainer = document.querySelector(".typing-dots");
      expect(dotsContainer).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    test("uses alex bubble background", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveStyle({
        backgroundColor: "var(--alex-bubble-bg)",
      });
    });

    test("has correct padding (16px)", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveStyle({
        padding: "var(--space-4)",
      });
    });

    test("has alex bubble border radius (tail top-left)", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveStyle({
        borderRadius: "4px 20px 20px 20px",
      });
    });

    test("has subtle shadow", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveStyle({
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      });
    });

    test("is inline-block", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveStyle({
        display: "inline-block",
      });
    });
  });

  describe("dot styling", () => {
    test("dots have circular shape", () => {
      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      dots.forEach((dot) => {
        expect(dot).toHaveStyle({
          borderRadius: "50%",
        });
      });
    });

    test("dots have correct size (8px)", () => {
      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      dots.forEach((dot) => {
        expect(dot).toHaveStyle({
          width: "8px",
          height: "8px",
        });
      });
    });

    test("dots have gray color", () => {
      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      dots.forEach((dot) => {
        expect(dot).toHaveStyle({
          backgroundColor: "#9ca3af",
        });
      });
    });

    test("dots are inline-block", () => {
      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      dots.forEach((dot) => {
        expect(dot).toHaveStyle({
          display: "inline-block",
        });
      });
    });
  });

  describe("accessibility", () => {
    test("has role status", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveAttribute("role", "status");
    });

    test("has aria-label for screen readers", () => {
      render(<TypingIndicator />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveAttribute("aria-label", "Alex is typing");
    });

    test("dots are aria-hidden", () => {
      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      dots.forEach((dot) => {
        expect(dot).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("animation", () => {
    test("motion spans are rendered for dots", () => {
      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      expect(dots).toHaveLength(3);
    });

    test("animation is enabled by default", () => {
      const { useReducedMotion } = require("framer-motion");
      useReducedMotion.mockReturnValue(false);

      render(<TypingIndicator />);

      const dots = screen.getAllByTestId("typing-dot");
      expect(dots).toHaveLength(3);
    });
  });

  describe("reduced motion", () => {
    const { useReducedMotion } = require("framer-motion");

    test("animation applied when reduced motion not preferred", () => {
      useReducedMotion.mockReturnValue(false);
      render(<TypingIndicator />);

      expect(screen.getAllByTestId("typing-dot")).toHaveLength(3);
    });

    test("respects reduced motion preference", () => {
      useReducedMotion.mockReturnValue(true);
      render(<TypingIndicator />);

      // Component still renders but with no animation
      expect(screen.getAllByTestId("typing-dot")).toHaveLength(3);
    });
  });

  describe("className prop", () => {
    test("applies custom className", () => {
      render(<TypingIndicator className="custom-class" />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveClass("custom-class");
    });

    test("preserves typing-indicator class with custom className", () => {
      render(<TypingIndicator className="my-custom-style" />);

      const indicator = document.querySelector(".typing-indicator");
      expect(indicator).toHaveClass("typing-indicator");
      expect(indicator).toHaveClass("my-custom-style");
    });
  });

  describe("dots container layout", () => {
    test("dots container uses flexbox", () => {
      render(<TypingIndicator />);

      const dotsContainer = document.querySelector(".typing-dots");
      expect(dotsContainer).toHaveStyle({
        display: "flex",
      });
    });

    test("dots have gap between them", () => {
      render(<TypingIndicator />);

      const dotsContainer = document.querySelector(".typing-dots");
      expect(dotsContainer).toHaveStyle({
        gap: "6px",
      });
    });

    test("dots are vertically centered", () => {
      render(<TypingIndicator />);

      const dotsContainer = document.querySelector(".typing-dots");
      expect(dotsContainer).toHaveStyle({
        alignItems: "center",
      });
    });

    test("dots container has fixed height", () => {
      render(<TypingIndicator />);

      const dotsContainer = document.querySelector(".typing-dots");
      expect(dotsContainer).toHaveStyle({
        height: "20px",
      });
    });
  });
});
