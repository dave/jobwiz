/**
 * Tests for Avatar component
 * Issue: #182 - 1.1: Avatar component
 */

/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent } from "@testing-library/react";
import { Avatar } from "../Avatar";

// Mock framer-motion
jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) => (
        <div className={className} style={style} data-testid="motion-div" {...props}>
          {children}
        </div>
      ),
    },
    useReducedMotion: jest.fn(() => false),
  };
});

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    onError,
    alt,
    priority,
    ...props
  }: {
    onError?: () => void;
    alt: string;
    src: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
  }) {
    return (
      <img
        alt={alt}
        data-testid="avatar-image"
        data-priority={priority ? "true" : undefined}
        {...props}
        onError={onError}
      />
    );
  },
}));

describe("Avatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    test("renders with small size", () => {
      const { container } = render(<Avatar size="small" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveStyle({ width: "var(--avatar-sm)" });
      expect(wrapper).toHaveStyle({ height: "var(--avatar-sm)" });
    });

    test("renders with large size", () => {
      const { container } = render(<Avatar size="large" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveStyle({ width: "var(--avatar-lg)" });
      expect(wrapper).toHaveStyle({ height: "var(--avatar-lg)" });
    });

    test("renders image by default", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/alex-avatar.jpg");
    });

    test("uses default alt text", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("alt", "Alex");
    });

    test("accepts custom alt text", () => {
      render(<Avatar size="small" alt="Coach Alex" />);

      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("alt", "Coach Alex");
    });

    test("applies custom className", () => {
      const { container } = render(<Avatar size="small" className="custom-class" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toHaveClass("custom-class");
    });

    test("has rounded shape", () => {
      const { container } = render(<Avatar size="small" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toHaveClass("rounded-full");
    });

    test("has overflow hidden for circular crop", () => {
      const { container } = render(<Avatar size="small" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toHaveClass("overflow-hidden");
    });

    test("has subtle shadow", () => {
      const { container } = render(<Avatar size="small" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toHaveStyle({ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" });
    });

    test("is aria-hidden (decorative)", () => {
      const { container } = render(<Avatar size="small" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("image fallback", () => {
    test("shows fallback when image fails to load", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      fireEvent.error(img);

      // Fallback should now be visible
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.queryByTestId("avatar-image")).not.toBeInTheDocument();
    });

    test("fallback shows initial 'A' for Alex", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      fireEvent.error(img);

      const fallback = screen.getByText("A");
      expect(fallback).toBeInTheDocument();
    });

    test("fallback has blue background", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      fireEvent.error(img);

      const fallback = screen.getByText("A");
      expect(fallback).toHaveClass("bg-blue-500");
    });

    test("fallback has white text", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      fireEvent.error(img);

      const fallback = screen.getByText("A");
      expect(fallback).toHaveClass("text-white");
    });

    test("fallback has aria-label", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      fireEvent.error(img);

      const fallback = screen.getByText("A").closest("div");
      expect(fallback).toHaveAttribute("aria-label", "Alex avatar fallback");
    });
  });

  describe("image priority", () => {
    test("large size has priority loading", () => {
      render(<Avatar size="large" />);

      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("data-priority", "true");
    });

    test("small size does not have priority loading", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      expect(img).not.toHaveAttribute("data-priority");
    });
  });

  describe("animation", () => {
    test("motion div is rendered", () => {
      render(<Avatar size="small" />);

      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });

    test("is not shrinkable (flex-shrink-0)", () => {
      const { container } = render(<Avatar size="small" />);

      const wrapper = container.querySelector('[data-testid="motion-div"]');
      expect(wrapper).toHaveClass("flex-shrink-0");
    });
  });

  describe("reduced motion", () => {
    const { useReducedMotion } = require("framer-motion");

    test("animation is applied when reduced motion is not preferred", () => {
      useReducedMotion.mockReturnValue(false);
      render(<Avatar size="small" />);

      // Motion div should be rendered (animation would be applied)
      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });

    test("respects reduced motion preference", () => {
      useReducedMotion.mockReturnValue(true);
      render(<Avatar size="small" />);

      // Component still renders but with instant transition
      expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    });
  });

  describe("both sizes render correctly", () => {
    test("small size uses 40px dimension", () => {
      render(<Avatar size="small" />);

      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("width", "40");
      expect(img).toHaveAttribute("height", "40");
    });

    test("large size uses 72px dimension", () => {
      render(<Avatar size="large" />);

      const img = screen.getByTestId("avatar-image");
      expect(img).toHaveAttribute("width", "72");
      expect(img).toHaveAttribute("height", "72");
    });
  });
});
