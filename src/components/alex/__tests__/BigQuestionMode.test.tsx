/**
 * Tests for BigQuestionMode component
 * Issue: #185 - 2.1: Big Question mode
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { BigQuestionMode } from "../BigQuestionMode";

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
        onClick,
        role,
        "aria-label": ariaLabel,
        "data-testid": dataTestId,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & {
        style?: React.CSSProperties;
        "data-testid"?: string;
      }) => (
        <div
          className={className}
          style={style}
          onClick={onClick}
          role={role}
          aria-label={ariaLabel}
          data-testid={dataTestId || "motion-div"}
          {...props}
        >
          {children}
        </div>
      ),
    },
    useReducedMotion: jest.fn(() => false),
  };
});

// Mock Avatar component
jest.mock("../Avatar", () => ({
  Avatar: ({ size }: { size: "small" | "large" }) => (
    <div data-testid="avatar" data-size={size}>
      Avatar
    </div>
  ),
}));

describe("BigQuestionMode", () => {
  const defaultProps = {
    onContinue: jest.fn(),
    children: <div>Test Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    test("renders the component", () => {
      render(<BigQuestionMode {...defaultProps} />);

      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    test("renders children content", () => {
      render(
        <BigQuestionMode {...defaultProps}>
          <h1>Welcome to the interview prep</h1>
        </BigQuestionMode>
      );

      expect(
        screen.getByText("Welcome to the interview prep")
      ).toBeInTheDocument();
    });

    test("renders large avatar at top", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const avatar = screen.getByTestId("avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute("data-size", "large");
    });

    test("renders continue button", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const button = screen.getByTestId("continue-button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Continue");
    });

    test("renders custom continue text", () => {
      render(
        <BigQuestionMode {...defaultProps} continueText="Next Step">
          Content
        </BigQuestionMode>
      );

      const button = screen.getByTestId("continue-button");
      expect(button).toHaveTextContent("Next Step");
    });

    test("renders with custom className", () => {
      render(
        <BigQuestionMode {...defaultProps} className="custom-class">
          Content
        </BigQuestionMode>
      );

      const container = document.querySelector(".big-question-mode");
      expect(container).toHaveClass("custom-class");
    });

    test("renders with data-testid", () => {
      render(
        <BigQuestionMode {...defaultProps} data-testid="my-big-question">
          Content
        </BigQuestionMode>
      );

      expect(screen.getByTestId("my-big-question")).toBeInTheDocument();
    });
  });

  describe("layout structure", () => {
    test("has avatar container", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const avatarContainer = document.querySelector(".big-question-avatar");
      expect(avatarContainer).toBeInTheDocument();
    });

    test("has content container", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const contentContainer = document.querySelector(".big-question-content");
      expect(contentContainer).toBeInTheDocument();
    });

    test("has footer container", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const footer = document.querySelector(".big-question-footer");
      expect(footer).toBeInTheDocument();
    });

    test("container has flex column layout", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const container = document.querySelector(".big-question-mode");
      expect(container).toHaveStyle({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      });
    });

    test("container has full viewport height", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const container = document.querySelector(".big-question-mode");
      expect(container).toHaveStyle({
        minHeight: "100dvh",
      });
    });
  });

  describe("continue button behavior", () => {
    test("calls onContinue when button is clicked", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue}>Content</BigQuestionMode>
      );

      const button = screen.getByTestId("continue-button");
      fireEvent.click(button);

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    test("button is disabled when continueDisabled is true", () => {
      render(
        <BigQuestionMode {...defaultProps} continueDisabled>
          Content
        </BigQuestionMode>
      );

      const button = screen.getByTestId("continue-button");
      expect(button).toBeDisabled();
    });

    test("does not call onContinue when button is disabled", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue} continueDisabled>
          Content
        </BigQuestionMode>
      );

      const button = screen.getByTestId("continue-button");
      fireEvent.click(button);

      expect(onContinue).not.toHaveBeenCalled();
    });

    test("button has correct aria-label", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const button = screen.getByTestId("continue-button");
      expect(button).toHaveAttribute("aria-label", "Continue");
    });

    test("button has custom aria-label when continueText changes", () => {
      render(
        <BigQuestionMode {...defaultProps} continueText="Get Started">
          Content
        </BigQuestionMode>
      );

      const button = screen.getByTestId("continue-button");
      expect(button).toHaveAttribute("aria-label", "Get Started");
    });
  });

  describe("tap to advance", () => {
    test("tapping container does not advance by default", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue}>Content</BigQuestionMode>
      );

      const container = document.querySelector(".big-question-mode");
      fireEvent.click(container!);

      // Should only be called if clicking button, not container
      expect(onContinue).not.toHaveBeenCalled();
    });

    test("tapping container advances when tapToAdvance is true", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue} tapToAdvance>
          Content
        </BigQuestionMode>
      );

      const container = document.querySelector(".big-question-mode");
      fireEvent.click(container!);

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    test("tapping button does not double-trigger when tapToAdvance is true", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue} tapToAdvance>
          Content
        </BigQuestionMode>
      );

      const button = screen.getByTestId("continue-button");
      fireEvent.click(button);

      // Should only trigger once (from button click)
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    test("tapping container does not advance when disabled", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue} tapToAdvance continueDisabled>
          Content
        </BigQuestionMode>
      );

      const container = document.querySelector(".big-question-mode");
      fireEvent.click(container!);

      expect(onContinue).not.toHaveBeenCalled();
    });
  });

  describe("keyboard navigation", () => {
    test("Enter key calls onContinue", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue}>Content</BigQuestionMode>
      );

      fireEvent.keyDown(window, { key: "Enter" });

      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    test("Enter key does not call onContinue when disabled", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue} continueDisabled>
          Content
        </BigQuestionMode>
      );

      fireEvent.keyDown(window, { key: "Enter" });

      expect(onContinue).not.toHaveBeenCalled();
    });

    test("Escape key calls onExit when provided", () => {
      const onExit = jest.fn();
      render(
        <BigQuestionMode {...defaultProps} onExit={onExit}>
          Content
        </BigQuestionMode>
      );

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    test("Escape key does nothing when onExit is not provided", () => {
      const onContinue = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue}>Content</BigQuestionMode>
      );

      // Should not throw
      fireEvent.keyDown(window, { key: "Escape" });

      expect(onContinue).not.toHaveBeenCalled();
    });

    test("other keys do not trigger actions", () => {
      const onContinue = jest.fn();
      const onExit = jest.fn();
      render(
        <BigQuestionMode onContinue={onContinue} onExit={onExit}>
          Content
        </BigQuestionMode>
      );

      fireEvent.keyDown(window, { key: "Space" });
      fireEvent.keyDown(window, { key: "ArrowDown" });
      fireEvent.keyDown(window, { key: "Tab" });

      expect(onContinue).not.toHaveBeenCalled();
      expect(onExit).not.toHaveBeenCalled();
    });

    test("keyboard listener is cleaned up on unmount", () => {
      const onContinue = jest.fn();
      const { unmount } = render(
        <BigQuestionMode onContinue={onContinue}>Content</BigQuestionMode>
      );

      unmount();

      fireEvent.keyDown(window, { key: "Enter" });

      expect(onContinue).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    test("container has region role", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const region = screen.getByRole("region");
      expect(region).toBeInTheDocument();
    });

    test("container has default aria-label", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("aria-label", "Content display");
    });

    test("container accepts custom contentLabel for aria-label", () => {
      render(
        <BigQuestionMode {...defaultProps} contentLabel="Video content">
          Content
        </BigQuestionMode>
      );

      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("aria-label", "Video content");
    });

    test("container is programmatically focusable", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("tabIndex", "-1");
    });

    test("continue button is focusable", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const button = screen.getByTestId("continue-button");
      expect(button.tagName).toBe("BUTTON");
    });

    test("continue button has minimum touch target (48px)", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const button = screen.getByTestId("continue-button");
      expect(button).toHaveStyle({
        minHeight: "48px",
      });
    });

    test("avatar container is hidden from screen readers", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const avatarContainer = document.querySelector(".big-question-avatar");
      expect(avatarContainer).toHaveAttribute("aria-hidden", "true");
    });

    test("content container has live region for dynamic content", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const contentContainer = document.querySelector(".big-question-content");
      expect(contentContainer).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("button styling", () => {
    test("button has correct base styles", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const button = screen.getByTestId("continue-button");
      expect(button).toHaveStyle({
        width: "100%",
        borderRadius: "12px",
        backgroundColor: "var(--primary)",
        fontWeight: 600,
      });
    });

    test("disabled button has reduced opacity", () => {
      render(
        <BigQuestionMode {...defaultProps} continueDisabled>
          Content
        </BigQuestionMode>
      );

      const button = screen.getByTestId("continue-button");
      expect(button).toHaveStyle({
        opacity: 0.5,
        cursor: "not-allowed",
      });
    });

    test("enabled button has full opacity", () => {
      render(<BigQuestionMode {...defaultProps} />);

      const button = screen.getByTestId("continue-button");
      expect(button).toHaveStyle({
        opacity: 1,
        cursor: "pointer",
      });
    });
  });

  describe("reduced motion", () => {
    const { useReducedMotion } = require("framer-motion");

    test("renders with animations when reduced motion is not preferred", () => {
      useReducedMotion.mockReturnValue(false);
      render(<BigQuestionMode {...defaultProps} />);

      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    test("renders with instant transitions when reduced motion is preferred", () => {
      useReducedMotion.mockReturnValue(true);
      render(<BigQuestionMode {...defaultProps} />);

      // Component still renders and functions
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });
  });

  describe("complex content", () => {
    test("renders video placeholder content", () => {
      render(
        <BigQuestionMode {...defaultProps}>
          <div data-testid="video-player">Video Player</div>
        </BigQuestionMode>
      );

      expect(screen.getByTestId("video-player")).toBeInTheDocument();
    });

    test("renders header content", () => {
      render(
        <BigQuestionMode {...defaultProps}>
          <h1>Welcome to Google PM Interview Prep</h1>
          <p>Lets get started with your preparation journey.</p>
        </BigQuestionMode>
      );

      expect(
        screen.getByText("Welcome to Google PM Interview Prep")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Lets get started with your preparation journey.")
      ).toBeInTheDocument();
    });

    test("renders image content", () => {
      render(
        <BigQuestionMode {...defaultProps}>
          <img src="/test.jpg" alt="Test" data-testid="image" />
        </BigQuestionMode>
      );

      expect(screen.getByTestId("image")).toBeInTheDocument();
    });

    test("renders infographic content", () => {
      render(
        <BigQuestionMode {...defaultProps}>
          <figure data-testid="infographic">
            <img src="/infographic.svg" alt="Interview Process" />
            <figcaption>The typical interview process</figcaption>
          </figure>
        </BigQuestionMode>
      );

      expect(screen.getByTestId("infographic")).toBeInTheDocument();
    });
  });
});
