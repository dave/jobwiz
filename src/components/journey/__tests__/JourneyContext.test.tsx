import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { JourneyProvider, useJourney } from "../JourneyContext";
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

// Wrapper component for testing hooks
function createWrapper(config: JourneyConfig, initialStepIndex?: number) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <JourneyProvider config={config} initialStepIndex={initialStepIndex}>
        {children}
      </JourneyProvider>
    );
  };
}

describe("JourneyProvider", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    test("initializes at step 0", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    test("initializes with initialStepIndex prop", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 2),
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    test("initializes completedSteps as empty Set", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.completedSteps.size).toBe(0);
    });

    test("initializes answers as empty Map", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.answers.size).toBe(0);
    });

    test("provides currentStep object", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.currentStep).toEqual(config.steps[0]);
    });
  });

  describe("nextStep", () => {
    test("nextStep increments currentStepIndex", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.currentStepIndex).toBe(0);

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });

    test("nextStep does not exceed last step", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 2), // Start at last step
      });

      expect(result.current.currentStepIndex).toBe(2);
      expect(result.current.isLastStep).toBe(true);

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(2); // Should not change
    });

    test("nextStep blocked when canAdvance is false", () => {
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: true }),
          createStep({ id: "step-2" }),
        ],
      });
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.canAdvance).toBe(false);

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(0); // Should not advance
    });
  });

  describe("prevStep", () => {
    test("prevStep decrements currentStepIndex", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 2),
      });

      expect(result.current.currentStepIndex).toBe(2);

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });

    test("prevStep does not go below 0", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.isFirstStep).toBe(true);

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.currentStepIndex).toBe(0); // Should not change
    });
  });

  describe("goToStep", () => {
    test("goToStep navigates to specific index", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    test("goToStep ignores invalid negative index", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 1),
      });

      act(() => {
        result.current.goToStep(-1);
      });

      expect(result.current.currentStepIndex).toBe(1); // Unchanged
    });

    test("goToStep ignores index beyond steps length", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 1),
      });

      act(() => {
        result.current.goToStep(10);
      });

      expect(result.current.currentStepIndex).toBe(1); // Unchanged
    });
  });

  describe("markComplete", () => {
    test("markComplete adds step to completedSteps Set", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.completedSteps.has("step-1")).toBe(false);

      act(() => {
        result.current.markComplete("step-1");
      });

      expect(result.current.completedSteps.has("step-1")).toBe(true);
    });

    test("markComplete allows advancing on required step", () => {
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: true }),
          createStep({ id: "step-2" }),
        ],
      });
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.canAdvance).toBe(false);

      act(() => {
        result.current.markComplete("step-1");
      });

      expect(result.current.canAdvance).toBe(true);
    });

    test("markComplete is idempotent", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      act(() => {
        result.current.markComplete("step-1");
        result.current.markComplete("step-1");
        result.current.markComplete("step-1");
      });

      expect(result.current.completedSteps.size).toBe(1);
    });
  });

  describe("setAnswer", () => {
    test("setAnswer stores answer by questionId", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      act(() => {
        result.current.setAnswer("question-1", "answer-value");
      });

      expect(result.current.answers.get("question-1")).toBe("answer-value");
    });

    test("setAnswer overwrites previous answer", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      act(() => {
        result.current.setAnswer("question-1", "first-answer");
        result.current.setAnswer("question-1", "second-answer");
      });

      expect(result.current.answers.get("question-1")).toBe("second-answer");
    });

    test("setAnswer supports complex values", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      const complexValue = { selected: ["a", "b"], timestamp: 123 };

      act(() => {
        result.current.setAnswer("question-1", complexValue);
      });

      expect(result.current.answers.get("question-1")).toEqual(complexValue);
    });
  });

  describe("progress", () => {
    test("progress returns correct percentage", () => {
      const config = createConfig(); // 3 steps
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.progress).toBe(0);

      act(() => {
        result.current.markComplete("step-1");
      });

      expect(result.current.progress).toBe(33); // 1/3 ≈ 33%

      act(() => {
        result.current.markComplete("step-2");
      });

      expect(result.current.progress).toBe(67); // 2/3 ≈ 67%

      act(() => {
        result.current.markComplete("step-3");
      });

      expect(result.current.progress).toBe(100); // 3/3 = 100%
    });

    test("progress handles empty steps", () => {
      const config = createConfig({ steps: [] });
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      // With empty steps, avoid division by zero
      expect(typeof result.current.progress).toBe("number");
    });
  });

  describe("canAdvance", () => {
    test("canAdvance true when non-required step", () => {
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: false }),
          createStep({ id: "step-2" }),
        ],
      });
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.canAdvance).toBe(true);
    });

    test("canAdvance false when required step not completed", () => {
      const config = createConfig({
        steps: [
          createStep({ id: "step-1", required: true }),
          createStep({ id: "step-2" }),
        ],
      });
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.canAdvance).toBe(false);
    });

    test("canAdvance false on last step", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 2), // Last step
      });

      expect(result.current.isLastStep).toBe(true);
      expect(result.current.canAdvance).toBe(false);
    });
  });

  describe("isFirstStep and isLastStep", () => {
    test("isFirstStep true on step 0", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.isFirstStep).toBe(true);
    });

    test("isFirstStep false when not on step 0", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 1),
      });

      expect(result.current.isFirstStep).toBe(false);
    });

    test("isLastStep true on last step", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config, 2),
      });

      expect(result.current.isLastStep).toBe(true);
    });

    test("isLastStep false when not on last step", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.isLastStep).toBe(false);
    });
  });

  describe("localStorage persistence", () => {
    test("persists to localStorage on change", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      act(() => {
        result.current.nextStep();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const storedKey = "journey-test-journey";
      const stored = JSON.parse(mockLocalStorage.store[storedKey]!);
      expect(stored.currentStepIndex).toBe(1);
    });

    test("persists completedSteps to localStorage", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      act(() => {
        result.current.markComplete("step-1");
      });

      const storedKey = "journey-test-journey";
      const stored = JSON.parse(mockLocalStorage.store[storedKey]!);
      expect(stored.completedSteps).toContain("step-1");
    });

    test("persists answers to localStorage", () => {
      const config = createConfig();
      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      act(() => {
        result.current.setAnswer("q1", "answer");
      });

      const storedKey = "journey-test-journey";
      const stored = JSON.parse(mockLocalStorage.store[storedKey]!);
      expect(stored.answers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            questionId: "q1",
            answer: "answer",
          }),
        ])
      );
    });

    test("loads persisted state on mount", () => {
      const config = createConfig();
      const storedState = {
        journeyId: "test-journey",
        currentStepIndex: 2,
        completedSteps: ["step-1", "step-2"],
        answers: [{ questionId: "q1", answer: "saved-answer", timestamp: 123 }],
        lastUpdated: Date.now(),
      };
      mockLocalStorage.store["journey-test-journey"] =
        JSON.stringify(storedState);

      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      expect(result.current.currentStepIndex).toBe(2);
      expect(result.current.completedSteps.has("step-1")).toBe(true);
      expect(result.current.completedSteps.has("step-2")).toBe(true);
      expect(result.current.answers.get("q1")).toBe("saved-answer");
    });

    test("handles invalid localStorage data gracefully", () => {
      const config = createConfig();
      mockLocalStorage.store["journey-test-journey"] = "invalid-json";

      const { result } = renderHook(() => useJourney(), {
        wrapper: createWrapper(config),
      });

      // Should fall back to defaults
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.completedSteps.size).toBe(0);
    });
  });

  describe("useJourney outside provider", () => {
    test("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useJourney());
      }).toThrow("useJourney must be used within a JourneyProvider");

      consoleSpy.mockRestore();
    });
  });
});

describe("JourneyProvider rendering", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test("renders children", () => {
    const config = createConfig();
    render(
      <JourneyProvider config={config}>
        <div data-testid="child">Child content</div>
      </JourneyProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  test("provides context to nested components", () => {
    const config = createConfig();

    function NestedComponent() {
      const { currentStepIndex, config: journeyConfig } = useJourney();
      return (
        <div data-testid="nested">
          Step {currentStepIndex + 1} of {journeyConfig.steps.length}
        </div>
      );
    }

    render(
      <JourneyProvider config={config}>
        <NestedComponent />
      </JourneyProvider>
    );

    expect(screen.getByTestId("nested")).toHaveTextContent("Step 1 of 3");
  });
});
