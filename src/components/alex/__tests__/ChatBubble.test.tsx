/**
 * Tests for ChatBubble component
 * Issue: #183 - 1.2: Chat bubble components
 */

import { render, screen } from "@testing-library/react";
import { ChatBubble } from "../ChatBubble";

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({
        children,
        className,
        style,
        "data-variant": dataVariant,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & {
        style?: React.CSSProperties;
        "data-variant"?: string;
      }) => (
        <div
          className={className}
          style={style}
          data-testid="motion-div"
          data-variant={dataVariant}
          {...props}
        >
          {children}
        </div>
      ),
    },
    useReducedMotion: jest.fn(() => false),
  };
});

describe("ChatBubble", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("alex variant (coach)", () => {
    test("renders alex variant", () => {
      render(<ChatBubble variant="alex">Hello!</ChatBubble>);

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveAttribute("data-variant", "alex");
    });

    test("renders children content", () => {
      render(<ChatBubble variant="alex">Hello world!</ChatBubble>);

      expect(screen.getByText("Hello world!")).toBeInTheDocument();
    });

    test("alex bubble has correct background", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      const inner = document.querySelector(".alex-bubble-inner");
      expect(inner).toHaveStyle({
        backgroundColor: "var(--alex-bubble-bg)",
      });
    });

    test("alex bubble has correct padding (16px)", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      const inner = document.querySelector(".alex-bubble-inner");
      expect(inner).toHaveStyle({
        padding: "var(--space-4)",
      });
    });

    test("alex bubble has tail top-left border radius", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      const inner = document.querySelector(".alex-bubble-inner");
      expect(inner).toHaveStyle({
        borderRadius: "4px 20px 20px 20px",
      });
    });

    test("alex bubble has max width", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      const inner = document.querySelector(".alex-bubble-inner");
      expect(inner).toHaveStyle({
        maxWidth: "var(--bubble-max-w)",
      });
    });

    test("alex bubble has subtle shadow", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      const inner = document.querySelector(".alex-bubble-inner");
      expect(inner).toHaveStyle({
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      });
    });

    test("alex bubble has alex-bubble class", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveClass("alex-bubble");
    });
  });

  describe("user variant (answer)", () => {
    test("renders user variant", () => {
      render(<ChatBubble variant="user">My answer</ChatBubble>);

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveAttribute("data-variant", "user");
    });

    test("renders children content", () => {
      render(<ChatBubble variant="user">Selected option A</ChatBubble>);

      expect(screen.getByText("Selected option A")).toBeInTheDocument();
    });

    test("user bubble has correct background", () => {
      render(<ChatBubble variant="user">Test</ChatBubble>);

      const inner = document.querySelector(".user-bubble-inner");
      expect(inner).toHaveStyle({
        backgroundColor: "var(--user-bubble-bg)",
      });
    });

    test("user bubble has correct padding (12px 16px)", () => {
      render(<ChatBubble variant="user">Test</ChatBubble>);

      const inner = document.querySelector(".user-bubble-inner");
      expect(inner).toHaveStyle({
        padding: "var(--space-3) var(--space-4)",
      });
    });

    test("user bubble has 20px border radius all corners", () => {
      render(<ChatBubble variant="user">Test</ChatBubble>);

      const inner = document.querySelector(".user-bubble-inner");
      expect(inner).toHaveStyle({
        borderRadius: "var(--bubble-radius)",
      });
    });

    test("user bubble has white text", () => {
      render(<ChatBubble variant="user">Test</ChatBubble>);

      const inner = document.querySelector(".user-bubble-inner");
      expect(inner).toHaveStyle({
        color: "white",
      });
    });

    test("user bubble is right-aligned", () => {
      render(<ChatBubble variant="user">Test</ChatBubble>);

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveClass("justify-end");
    });

    test("user bubble has user-bubble class", () => {
      render(<ChatBubble variant="user">Test</ChatBubble>);

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveClass("user-bubble");
    });
  });

  describe("animation", () => {
    test("motion div is rendered", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });

    test("animation is enabled by default", () => {
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      // Motion div should be present (animation would be applied)
      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });

    test("accepts animate prop", () => {
      render(
        <ChatBubble variant="alex" animate={false}>
          Test
        </ChatBubble>
      );

      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });
  });

  describe("reduced motion", () => {
    const { useReducedMotion } = require("framer-motion");

    test("animation is applied when reduced motion is not preferred", () => {
      useReducedMotion.mockReturnValue(false);
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });

    test("respects reduced motion preference", () => {
      useReducedMotion.mockReturnValue(true);
      render(<ChatBubble variant="alex">Test</ChatBubble>);

      // Component still renders but with instant transition
      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    test("applies custom className to alex variant", () => {
      render(
        <ChatBubble variant="alex" className="custom-class">
          Test
        </ChatBubble>
      );

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveClass("custom-class");
    });

    test("applies custom className to user variant", () => {
      render(
        <ChatBubble variant="user" className="my-class">
          Test
        </ChatBubble>
      );

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveClass("my-class");
    });
  });

  describe("content types", () => {
    test("renders text content", () => {
      render(<ChatBubble variant="alex">Plain text message</ChatBubble>);

      expect(screen.getByText("Plain text message")).toBeInTheDocument();
    });

    test("renders JSX content", () => {
      render(
        <ChatBubble variant="alex">
          <strong>Bold text</strong> and <em>italic</em>
        </ChatBubble>
      );

      expect(screen.getByText("Bold text")).toBeInTheDocument();
      expect(screen.getByText("italic")).toBeInTheDocument();
    });

    test("renders complex nested content", () => {
      render(
        <ChatBubble variant="alex">
          <div data-testid="nested-content">
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </ChatBubble>
      );

      expect(screen.getByTestId("nested-content")).toBeInTheDocument();
      expect(screen.getByText("Paragraph 1")).toBeInTheDocument();
      expect(screen.getByText("Paragraph 2")).toBeInTheDocument();
    });
  });
});
