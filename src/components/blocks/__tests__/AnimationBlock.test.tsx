import { render, screen, waitFor } from "@testing-library/react";
import { AnimationBlock } from "../AnimationBlock";
import type { AnimationBlock as AnimationBlockType } from "@/types/module";

// Mock lottie-react
jest.mock("lottie-react", () => {
  return {
    __esModule: true,
    default: ({ onComplete, loop }: { onComplete?: () => void; loop?: boolean }) => {
      // Simulate non-looping animation completing
      if (!loop && onComplete) {
        setTimeout(onComplete, 10);
      }
      return <div data-testid="lottie-animation">Lottie Animation</div>;
    },
  };
});

// Mock fetch for animation data
global.fetch = jest.fn();

describe("AnimationBlock", () => {
  const mockAnimationData = {
    v: "5.5.7",
    fr: 60,
    ip: 0,
    op: 120,
    w: 500,
    h: 500,
    nm: "Test Animation",
    layers: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnimationData),
    });

    // Mock matchMedia for reduced motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it("loads Lottie JSON animation", async () => {
    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
      loop: true,
      autoplay: true,
    };

    render(<AnimationBlock block={block} />);

    await waitFor(() => {
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/animation.json");
  });

  it("shows loading state while fetching", async () => {
    // Delay the fetch response
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve(mockAnimationData),
              }),
            100
          )
        )
    );

    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
    };

    render(<AnimationBlock block={block} />);

    expect(screen.getByText("Loading animation...")).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
    };

    render(<AnimationBlock block={block} />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load animation")).toBeInTheDocument();
    });
  });

  it("handles HTTP error gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
    };

    render(<AnimationBlock block={block} />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load animation")).toBeInTheDocument();
    });
  });

  it("shows error when no URL provided", async () => {
    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "",
    };

    render(<AnimationBlock block={block} />);

    await waitFor(() => {
      expect(screen.getByText("No animation URL provided")).toBeInTheDocument();
    });
  });

  it("shows static fallback when prefers-reduced-motion is enabled", async () => {
    // Mock reduced motion preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
      loop: true,
    };

    render(<AnimationBlock block={block} />);

    await waitFor(() => {
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });

    // Should have screen reader text about paused animation
    expect(
      screen.getByText("Animation paused due to reduced motion preference")
    ).toBeInTheDocument();
  });

  it("calls onComplete when non-looping animation finishes", async () => {
    const mockOnComplete = jest.fn();
    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
      loop: false,
    };

    render(<AnimationBlock block={block} onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });

    // Wait for the mocked onComplete to be called
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it("does not call onComplete for looping animations", async () => {
    const mockOnComplete = jest.fn();
    const block: AnimationBlockType = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
      loop: true,
    };

    render(<AnimationBlock block={block} onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId("lottie-animation")).toBeInTheDocument();
    });

    // Give time for potential onComplete calls
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not have been called since it's looping
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});
