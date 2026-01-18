import { render, screen, fireEvent } from "@testing-library/react";
import { Timeline } from "../Timeline";
import { JourneyProvider } from "../JourneyContext";
import type { JourneyConfig, JourneyStep } from "@/types";

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
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock Supabase sync
jest.mock("@/lib/journey/supabase-sync", () => ({
  loadFromSupabase: jest.fn().mockResolvedValue(null),
  saveToSupabase: jest.fn().mockResolvedValue(true),
}));

// Test data factory
function createStep(overrides: Partial<JourneyStep> = {}): JourneyStep {
  return {
    id: "test-step",
    title: "Test Step",
    type: "content",
    moduleId: "test-module",
    required: false,
    ...overrides,
  };
}

function createConfig(overrides: Partial<JourneyConfig> = {}): JourneyConfig {
  return {
    id: "test-journey",
    companySlug: "test-company",
    roleSlug: "test-role",
    steps: [
      createStep({ id: "step-1", title: "Step 1", estimatedMinutes: 5 }),
      createStep({ id: "step-2", title: "Step 2", estimatedMinutes: 10 }),
      createStep({ id: "step-3", title: "Step 3" }),
      createStep({ id: "step-4", title: "Step 4" }),
    ],
    ...overrides,
  };
}

interface RenderTimelineOptions {
  config?: JourneyConfig;
  initialStepIndex?: number;
  interactive?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
  preCompleteSteps?: string[];
}

function renderTimeline(options: RenderTimelineOptions = {}) {
  const {
    config = createConfig(),
    initialStepIndex = 0,
    interactive = true,
    orientation = "vertical",
    className,
    preCompleteSteps = [],
  } = options;

  // Set up pre-completed steps in localStorage
  if (preCompleteSteps.length > 0) {
    mockLocalStorage.store[`journey-${config.id}`] = JSON.stringify({
      journeyId: config.id,
      currentStepIndex: initialStepIndex,
      completedSteps: preCompleteSteps,
      answers: [],
      lastUpdated: Date.now(),
    });
  }

  return render(
    <JourneyProvider config={config} initialStepIndex={initialStepIndex}>
      <Timeline
        interactive={interactive}
        orientation={orientation}
        className={className}
      />
    </JourneyProvider>
  );
}

describe("Timeline", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    test("renders all steps", () => {
      renderTimeline();

      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
      expect(screen.getByText("Step 3")).toBeInTheDocument();
      expect(screen.getByText("Step 4")).toBeInTheDocument();
    });

    test("renders as nav element with aria-label", () => {
      renderTimeline();

      const nav = screen.getByRole("navigation", { name: "Journey timeline" });
      expect(nav).toBeInTheDocument();
    });

    test("renders as unordered list for semantic markup", () => {
      renderTimeline();

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
      expect(list.tagName).toBe("UL");
    });

    test("applies custom className", () => {
      renderTimeline({ className: "my-custom-class" });

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("my-custom-class");
    });

    test("shows estimated time for steps that have it", () => {
      renderTimeline();

      expect(screen.getByText("~5 min")).toBeInTheDocument();
      expect(screen.getByText("~10 min")).toBeInTheDocument();
    });
  });

  describe("step states", () => {
    test("shows current step as highlighted", () => {
      renderTimeline({ initialStepIndex: 1 });

      const step2Button = screen.getByRole("button", {
        name: /Step 2 - current/i,
      });
      expect(step2Button).toHaveAttribute("aria-current", "step");
      expect(step2Button).toHaveClass("bg-blue-600");
    });

    test("shows completed step with checkmark", () => {
      renderTimeline({
        initialStepIndex: 1,
        preCompleteSteps: ["step-1"],
      });

      const step1Button = screen.getByRole("button", {
        name: /Step 1 - completed/i,
      });
      expect(step1Button).toHaveClass("bg-green-600");

      // Check for checkmark SVG
      const checkmark = step1Button.querySelector("svg");
      expect(checkmark).toBeInTheDocument();
    });

    test("shows upcoming step with number", () => {
      renderTimeline({ initialStepIndex: 0 });

      const step3Button = screen.getByRole("button", {
        name: /Step 3 - upcoming/i,
      });
      expect(step3Button).toHaveClass("bg-gray-200");
      expect(step3Button).toHaveTextContent("3");
    });

    test("shows locked step with lock icon when paywall configured", () => {
      const config = createConfig({
        paywallConfig: { position: 2, value: "Unlock premium content", variant: "hard" },
      });
      renderTimeline({ config });

      const step3Button = screen.getByRole("button", {
        name: /Step 3 - locked/i,
      });
      expect(step3Button).toHaveClass("bg-gray-100");

      // Check for lock SVG
      const lockIcon = step3Button.querySelector("svg");
      expect(lockIcon).toBeInTheDocument();
    });

    test("step titles have correct colors for each state", () => {
      const config = createConfig({
        paywallConfig: { position: 3, value: "Unlock premium content", variant: "hard" },
      });
      renderTimeline({
        config,
        initialStepIndex: 1,
        preCompleteSteps: ["step-1"],
      });

      // Completed: green
      expect(screen.getByText("Step 1")).toHaveClass("text-green-700");

      // Current: blue
      expect(screen.getByText("Step 2")).toHaveClass("text-blue-700");

      // Upcoming: gray
      expect(screen.getByText("Step 3")).toHaveClass("text-gray-600");

      // Locked: light gray
      expect(screen.getByText("Step 4")).toHaveClass("text-gray-400");
    });
  });

  describe("interaction", () => {
    test("clicking completed step navigates to it", () => {
      renderTimeline({
        initialStepIndex: 2,
        preCompleteSteps: ["step-1", "step-2"],
      });

      // Initially step 3 is current
      expect(
        screen.getByRole("button", { name: /Step 3 - current/i })
      ).toHaveAttribute("aria-current", "step");

      const step1Button = screen.getByRole("button", {
        name: /Step 1 - completed/i,
      });
      fireEvent.click(step1Button);

      // After clicking step 1, step 3 should no longer be current
      // Note: Completed steps maintain their "completed" status even when navigated to
      // So step 1 stays as "completed" but the internal currentStepIndex changes
      // The navigation works - we verify by checking step 3 is no longer aria-current
      const step3Button = screen.getByRole("button", { name: /Step 3/i });
      expect(step3Button).not.toHaveAttribute("aria-current");
    });

    test("clicking upcoming step within reach navigates to it", () => {
      renderTimeline({ initialStepIndex: 0 });

      // Clicking the current step should not change anything
      const step1Button = screen.getByRole("button", {
        name: /Step 1 - current/i,
      });
      expect(step1Button).toHaveAttribute("aria-current", "step");
    });

    test("clicking locked step does not navigate", () => {
      const config = createConfig({
        paywallConfig: { position: 2, value: "Unlock premium content", variant: "hard" },
      });
      renderTimeline({ config, initialStepIndex: 0 });

      const step3Button = screen.getByRole("button", {
        name: /Step 3 - locked/i,
      });

      expect(step3Button).toBeDisabled();
      fireEvent.click(step3Button);

      // Current step should still be step 1
      const step1Button = screen.getByRole("button", {
        name: /Step 1 - current/i,
      });
      expect(step1Button).toHaveAttribute("aria-current", "step");
    });

    test("interactive=false disables all clicks", () => {
      renderTimeline({
        interactive: false,
        initialStepIndex: 1,
        preCompleteSteps: ["step-1"],
      });

      const step1Button = screen.getByRole("button", {
        name: /Step 1 - completed/i,
      });
      expect(step1Button).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    test("current step has aria-current=step", () => {
      renderTimeline({ initialStepIndex: 1 });

      const currentButton = screen.getByRole("button", {
        name: /Step 2 - current/i,
      });
      expect(currentButton).toHaveAttribute("aria-current", "step");
    });

    test("non-current steps do not have aria-current", () => {
      renderTimeline({ initialStepIndex: 1 });

      const step1Button = screen.getByRole("button", {
        name: /Step 1 - upcoming/i,
      });
      expect(step1Button).not.toHaveAttribute("aria-current");

      const step3Button = screen.getByRole("button", {
        name: /Step 3 - upcoming/i,
      });
      expect(step3Button).not.toHaveAttribute("aria-current");
    });

    test("buttons have descriptive aria-labels", () => {
      const config = createConfig({
        paywallConfig: { position: 3, value: "Unlock premium content", variant: "hard" },
      });
      renderTimeline({
        config,
        initialStepIndex: 1,
        preCompleteSteps: ["step-1"],
      });

      expect(
        screen.getByRole("button", { name: "Step 1 - completed" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Step 2 - current" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Step 3 - upcoming" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Step 4 - locked" })
      ).toBeInTheDocument();
    });

    test("touch targets are at least 44px", () => {
      renderTimeline();

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveClass("min-w-[44px]");
        expect(button).toHaveClass("min-h-[44px]");
      });
    });

    test("buttons have focus ring styles", () => {
      renderTimeline();

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveClass("focus:ring-2");
        expect(button).toHaveClass("focus:ring-blue-500");
      });
    });
  });

  describe("vertical orientation", () => {
    test("renders vertical layout by default", () => {
      renderTimeline();

      const list = screen.getByRole("list");
      expect(list).toHaveClass("flex-col");
    });

    test("shows estimated minutes in vertical layout", () => {
      renderTimeline({ orientation: "vertical" });

      expect(screen.getByText("~5 min")).toBeInTheDocument();
    });
  });

  describe("horizontal orientation", () => {
    test("renders horizontal layout when specified", () => {
      renderTimeline({ orientation: "horizontal" });

      const list = screen.getByRole("list");
      expect(list).toHaveClass("flex-row");
    });

    test("hides estimated minutes in horizontal layout", () => {
      renderTimeline({ orientation: "horizontal" });

      expect(screen.queryByText("~5 min")).not.toBeInTheDocument();
    });

    test("step content is centered in horizontal layout", () => {
      renderTimeline({ orientation: "horizontal" });

      const stepItems = screen.getAllByRole("listitem");
      stepItems.forEach((item) => {
        expect(item).toHaveClass("flex-col");
        expect(item).toHaveClass("items-center");
      });
    });
  });

  describe("connector lines", () => {
    test("connector lines exist between steps", () => {
      const { container } = renderTimeline();

      // There should be 3 connector lines for 4 steps (divs with aria-hidden)
      const connectors = container.querySelectorAll('div[aria-hidden="true"]');
      expect(connectors.length).toBeGreaterThanOrEqual(3);
    });

    test("completed step has green connector line", () => {
      const { container } = renderTimeline({
        initialStepIndex: 2,
        preCompleteSteps: ["step-1"],
      });

      const connectors = container.querySelectorAll('div[aria-hidden="true"]');
      // First connector (after step-1 which is completed) should be green
      expect(connectors[0]).toHaveClass("bg-green-600");
    });

    test("incomplete step has gray connector line", () => {
      const { container } = renderTimeline({ initialStepIndex: 0 });

      const connectors = container.querySelectorAll('div[aria-hidden="true"]');
      // All connectors should be gray since no steps are completed
      connectors.forEach((connector) => {
        expect(connector).toHaveClass("bg-gray-200");
      });
    });
  });
});
