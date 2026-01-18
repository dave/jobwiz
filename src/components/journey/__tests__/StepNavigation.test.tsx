import { render, screen, fireEvent, act } from "@testing-library/react";
import { StepNavigation } from "../StepNavigation";
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
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock Supabase sync module
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
      createStep({ id: "step-1", title: "Step 1" }),
      createStep({ id: "step-2", title: "Step 2" }),
      createStep({ id: "step-3", title: "Step 3" }),
    ],
    ...overrides,
  };
}

interface WrapperProps {
  children: React.ReactNode;
}

function createWrapper(config: JourneyConfig, initialStepIndex?: number) {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <JourneyProvider
        config={config}
        initialStepIndex={initialStepIndex}
        enableSupabaseSync={false}
      >
        {children}
      </JourneyProvider>
    );
  };
}

describe("StepNavigation", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe("next button", () => {
    test("next button calls onNext callback", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config);

      render(
        <Wrapper>
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      const nextButton = screen.getByRole("button", { name: /continue/i });
      fireEvent.click(nextButton);

      expect(onNavigate).toHaveBeenCalledWith("next");
    });

    test("next button advances step index", async () => {
      const config = createConfig();
      const Wrapper = createWrapper(config);

      // We need a component that displays step info to verify navigation
      function TestComponent() {
        const { useJourney } = require("../JourneyContext");
        const { currentStepIndex } = useJourney();
        return (
          <>
            <div data-testid="step-index">{currentStepIndex}</div>
            <StepNavigation />
          </>
        );
      }

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      expect(screen.getByTestId("step-index")).toHaveTextContent("0");

      const nextButton = screen.getByRole("button", { name: /continue/i });
      fireEvent.click(nextButton);

      expect(screen.getByTestId("step-index")).toHaveTextContent("1");
    });
  });

  describe("back button", () => {
    test("back button calls onPrev callback", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config, 1); // Start at step 2

      render(
        <Wrapper>
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);

      expect(onNavigate).toHaveBeenCalledWith("prev");
    });

    test("back button decrements step index", async () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 2); // Start at last step

      function TestComponent() {
        const { useJourney } = require("../JourneyContext");
        const { currentStepIndex } = useJourney();
        return (
          <>
            <div data-testid="step-index">{currentStepIndex}</div>
            <StepNavigation />
          </>
        );
      }

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      expect(screen.getByTestId("step-index")).toHaveTextContent("2");

      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);

      expect(screen.getByTestId("step-index")).toHaveTextContent("1");
    });
  });

  describe("back hidden when isFirstStep", () => {
    test("back button is hidden on first step", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 0); // First step

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      expect(
        screen.queryByRole("button", { name: /back/i })
      ).not.toBeInTheDocument();
    });

    test("back button is visible when not on first step", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 1); // Second step

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });
  });

  describe("shows Complete when isLastStep", () => {
    test("shows Complete button on last step", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 2); // Last step

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      expect(
        screen.getByRole("button", { name: /complete/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /continue/i })
      ).not.toBeInTheDocument();
    });

    test("shows Continue button when not on last step", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 0); // First step

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      expect(
        screen.getByRole("button", { name: /continue/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /complete/i })
      ).not.toBeInTheDocument();
    });

    test("Complete button triggers onComplete callback", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config, 2); // Last step

      render(
        <Wrapper>
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      const completeButton = screen.getByRole("button", { name: /complete/i });
      fireEvent.click(completeButton);

      expect(onNavigate).toHaveBeenCalledWith("complete");
    });
  });

  describe("next disabled when canAdvance=false", () => {
    test("next button is disabled when required step not completed", () => {
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: true }),
          createStep({ id: "step-2" }),
        ],
      });
      const Wrapper = createWrapper(config, 0);

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      const nextButton = screen.getByRole("button", { name: /continue/i });
      expect(nextButton).toBeDisabled();
    });

    test("next button is enabled when non-required step", () => {
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: false }),
          createStep({ id: "step-2" }),
        ],
      });
      const Wrapper = createWrapper(config, 0);

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      const nextButton = screen.getByRole("button", { name: /continue/i });
      expect(nextButton).not.toBeDisabled();
    });

    test("next button enabled after completing required step", async () => {
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: true }),
          createStep({ id: "step-2" }),
        ],
      });
      const Wrapper = createWrapper(config, 0);

      function TestComponent() {
        const { useJourney } = require("../JourneyContext");
        const { markComplete } = useJourney();
        return (
          <>
            <button onClick={() => markComplete("step-1")}>Mark Complete</button>
            <StepNavigation />
          </>
        );
      }

      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );

      // Initially disabled
      expect(
        screen.getByRole("button", { name: /continue/i })
      ).toBeDisabled();

      // Mark step complete
      fireEvent.click(screen.getByText("Mark Complete"));

      // Now enabled
      expect(
        screen.getByRole("button", { name: /continue/i })
      ).not.toBeDisabled();
    });
  });

  describe("Enter key triggers next", () => {
    test("Enter key advances to next step when canAdvance is true", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config, 0);

      render(
        <Wrapper>
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      await act(async () => {
        fireEvent.keyDown(window, { key: "Enter" });
      });

      expect(onNavigate).toHaveBeenCalledWith("next");
    });

    test("Enter key does not advance when canAdvance is false", async () => {
      const onNavigate = jest.fn();
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: true }),
          createStep({ id: "step-2" }),
        ],
      });
      const Wrapper = createWrapper(config, 0);

      render(
        <Wrapper>
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      await act(async () => {
        fireEvent.keyDown(window, { key: "Enter" });
      });

      expect(onNavigate).not.toHaveBeenCalled();
    });

    test("Enter key does not trigger when typing in input", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config, 0);

      render(
        <Wrapper>
          <input data-testid="test-input" />
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      const input = screen.getByTestId("test-input");
      input.focus();

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Escape key triggers prev", () => {
    test("Escape key goes to previous step", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config, 1); // Start at step 2

      render(
        <Wrapper>
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(onNavigate).toHaveBeenCalledWith("prev");
    });

    test("Escape key does not trigger on first step", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config, 0); // First step

      render(
        <Wrapper>
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(onNavigate).not.toHaveBeenCalled();
    });

    test("Escape key does not trigger when typing in textarea", async () => {
      const onNavigate = jest.fn();
      const config = createConfig();
      const Wrapper = createWrapper(config, 1);

      render(
        <Wrapper>
          <textarea data-testid="test-textarea" />
          <StepNavigation onNavigate={onNavigate} />
        </Wrapper>
      );

      const textarea = screen.getByTestId("test-textarea");
      textarea.focus();

      await act(async () => {
        fireEvent.keyDown(textarea, { key: "Escape" });
      });

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    test("navigation has aria-label", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 0);

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      expect(
        screen.getByRole("navigation", { name: /journey navigation/i })
      ).toBeInTheDocument();
    });

    test("buttons have appropriate aria-labels", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 1); // Middle step so both buttons show

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      expect(
        screen.getByRole("button", { name: /go back to previous step/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /continue to next step/i })
      ).toBeInTheDocument();
    });

    test("buttons meet minimum touch target size", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 1);

      render(
        <Wrapper>
          <StepNavigation />
        </Wrapper>
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      const nextButton = screen.getByRole("button", { name: /continue/i });

      // Check that buttons have the min-h-[44px] and min-w-[44px] classes
      expect(backButton).toHaveClass("min-h-[44px]");
      expect(backButton).toHaveClass("min-w-[44px]");
      expect(nextButton).toHaveClass("min-h-[44px]");
      expect(nextButton).toHaveClass("min-w-[44px]");
    });
  });

  describe("custom className", () => {
    test("applies custom className to container", () => {
      const config = createConfig();
      const Wrapper = createWrapper(config, 0);

      render(
        <Wrapper>
          <StepNavigation className="custom-class" />
        </Wrapper>
      );

      expect(screen.getByRole("navigation")).toHaveClass("custom-class");
    });
  });
});
