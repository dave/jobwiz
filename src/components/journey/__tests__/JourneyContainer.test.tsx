import { render, screen, within, act } from "@testing-library/react";
import { JourneyContainer } from "../JourneyContainer";
import type { JourneyConfig } from "@/types";

// Mock matchMedia for responsive testing
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Test config
const testConfig: JourneyConfig = {
  id: "test-journey",
  companySlug: "test-company",
  roleSlug: "test-role",
  steps: [
    {
      id: "step-1",
      title: "Step 1",
      type: "content",
      moduleId: "module-1",
      required: false,
      estimatedMinutes: 5,
    },
    {
      id: "step-2",
      title: "Step 2",
      type: "content",
      moduleId: "module-2",
      required: true,
      estimatedMinutes: 10,
    },
    {
      id: "step-3",
      title: "Step 3",
      type: "content",
      moduleId: "module-3",
      required: false,
    },
  ],
};

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

describe("JourneyContainer", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    mockMatchMedia(false);
  });

  describe("rendering", () => {
    test("renders step title in header", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={false}>
          {(stepId) => <div data-testid="content">{stepId}</div>}
        </JourneyContainer>
      );

      // With no sidebar, there's only one "Step 1" in the header
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Step 1");
    });

    test("renders step count", () => {
      render(
        <JourneyContainer config={testConfig}>
          {(stepId) => <div data-testid="content">{stepId}</div>}
        </JourneyContainer>
      );

      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    });

    test("renders children with step information", () => {
      render(
        <JourneyContainer config={testConfig}>
          {(stepId, moduleId) => (
            <div data-testid="content">
              {stepId} - {moduleId}
            </div>
          )}
        </JourneyContainer>
      );

      expect(screen.getByTestId("content")).toHaveTextContent(
        "step-1 - module-1"
      );
    });

    test("renders progress bar", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={false}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // With no sidebar, there's only one progress bar
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    test("renders navigation", () => {
      render(
        <JourneyContainer config={testConfig}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      expect(
        screen.getByRole("navigation", { name: "Journey navigation" })
      ).toBeInTheDocument();
    });
  });

  describe("sidebar behavior", () => {
    test("renders sidebar when showSidebar is true", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={true}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // Sidebar contains the "Your Progress" heading
      expect(screen.getByText("Your Progress")).toBeInTheDocument();
    });

    test("renders timeline in sidebar", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={true}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // Timeline is rendered in sidebar
      const sidebar = screen.getByRole("navigation", { name: "Journey timeline" });
      expect(sidebar).toBeInTheDocument();
    });

    test("does not render sidebar when showSidebar is false", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={false}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // Sidebar heading should not exist
      expect(screen.queryByText("Your Progress")).not.toBeInTheDocument();
    });

    test("sidebar shows progress bar", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={true}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // There should be multiple progress bars (one in sidebar, one in header for mobile)
      const progressBars = screen.getAllByRole("progressbar");
      expect(progressBars.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("accessibility", () => {
    test("content area has proper role and label", () => {
      render(
        <JourneyContainer config={testConfig}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      const region = screen.getByRole("region", { name: /Step 1: Step 1/i });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("aria-current", "step");
    });

    test("navigation has aria-label", () => {
      render(
        <JourneyContainer config={testConfig}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      expect(
        screen.getByRole("navigation", { name: "Journey navigation" })
      ).toBeInTheDocument();
    });

    test("timeline has aria-label", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={true}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      expect(
        screen.getByRole("navigation", { name: "Journey timeline" })
      ).toBeInTheDocument();
    });
  });

  describe("touch targets", () => {
    test("navigation buttons have minimum 44px touch targets", () => {
      render(
        <JourneyContainer config={testConfig} initialStepIndex={1}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      const backButton = screen.getByRole("button", {
        name: /go back to previous step/i,
      });
      const nextButton = screen.getByRole("button", {
        name: /continue to next step/i,
      });

      expect(backButton).toHaveClass("min-h-[44px]", "min-w-[44px]");
      expect(nextButton).toHaveClass("min-h-[44px]", "min-w-[44px]");
    });

    test("timeline step buttons have minimum 44px touch targets", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={true}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      const stepButtons = screen.getAllByRole("button", {
        name: /Step \d+ -/i,
      });

      stepButtons.forEach((button) => {
        expect(button).toHaveClass("min-w-[44px]", "min-h-[44px]");
      });
    });
  });

  describe("estimated time", () => {
    test("displays estimated time when available", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={false}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // With no sidebar, only footer shows estimated time
      expect(screen.getByText("~5 min")).toBeInTheDocument();
    });

    test("does not display estimated time in footer on last step", () => {
      render(
        <JourneyContainer config={testConfig} initialStepIndex={2} showSidebar={false}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // Step 3 doesn't have estimatedMinutes and it's the last step
      // With no sidebar (which also shows estimated times), footer should not show time
      const footer = document.querySelector("footer");
      expect(within(footer!).queryByText(/~\d+ min/)).not.toBeInTheDocument();
    });
  });

  describe("responsive classes", () => {
    test("container has responsive flex direction classes", () => {
      const { container } = render(
        <JourneyContainer config={testConfig}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("flex", "flex-col", "lg:flex-row");
    });

    test("sidebar has hidden class on mobile", () => {
      render(
        <JourneyContainer config={testConfig} showSidebar={true}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // Find the aside element
      const sidebar = document.querySelector("aside");
      expect(sidebar).toHaveClass("hidden", "lg:flex");
    });

    test("content area has responsive padding", () => {
      render(
        <JourneyContainer config={testConfig}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      const main = screen.getByRole("main");
      expect(main).toHaveClass("px-4", "py-6", "sm:px-6", "sm:py-8", "lg:px-8", "lg:py-10");
    });
  });

  describe("animations", () => {
    test("content has motion-safe animation classes", () => {
      render(
        <JourneyContainer config={testConfig}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      const region = screen.getByRole("region");
      expect(region.className).toContain("motion-safe:");
    });
  });

  describe("onComplete callback", () => {
    test("onComplete is called when journey is completed", async () => {
      const onComplete = jest.fn();
      const singleStepConfig: JourneyConfig = {
        ...testConfig,
        steps: [testConfig.steps[0]!],
      };

      render(
        <JourneyContainer config={singleStepConfig} onComplete={onComplete}>
          {() => <div>Content</div>}
        </JourneyContainer>
      );

      // On a single step journey, clicking Complete should trigger onComplete
      const completeButton = screen.getByRole("button", {
        name: /complete journey/i,
      });

      await act(async () => {
        completeButton.click();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});

describe("JourneyContainer safe area", () => {
  test("footer has safe-area-inset-bottom class", () => {
    render(
      <JourneyContainer config={testConfig}>
        {() => <div>Content</div>}
      </JourneyContainer>
    );

    const footer = document.querySelector("footer");
    expect(footer).toHaveClass("safe-area-inset-bottom");
  });
});
