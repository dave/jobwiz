"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  JourneyConfig,
  JourneyContextValue,
  JourneyAnswer,
  JourneyState,
} from "@/types";
import {
  loadFromSupabase,
  saveToSupabase,
} from "@/lib/journey/supabase-sync";

const JourneyContext = createContext<JourneyContextValue | null>(null);

/** Get localStorage key for a journey */
function getStorageKey(journeyId: string): string {
  return `journey-${journeyId}`;
}

/** Load journey state from localStorage */
function loadPersistedState(journeyId: string): JourneyState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(journeyId));
    if (!stored) return null;

    const state = JSON.parse(stored) as JourneyState;
    return state;
  } catch {
    return null;
  }
}

/** Save journey state to localStorage */
function persistState(state: JourneyState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getStorageKey(state.journeyId), JSON.stringify(state));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

interface JourneyProviderProps {
  config: JourneyConfig;
  children: ReactNode;
  /** Initial step index (useful for testing) */
  initialStepIndex?: number;
  /** Enable Supabase sync for logged-in users (default: true) */
  enableSupabaseSync?: boolean;
}

export function JourneyProvider({
  config,
  children,
  initialStepIndex = 0,
  enableSupabaseSync = true,
}: JourneyProviderProps) {
  // Track if Supabase state has been loaded
  const supabaseLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // Load persisted state or use defaults
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const persisted = loadPersistedState(config.id);
    if (persisted) return persisted.currentStepIndex;
    return initialStepIndex;
  });

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const persisted = loadPersistedState(config.id);
    if (persisted) return new Set(persisted.completedSteps);
    return new Set<string>();
  });

  const [answers, setAnswers] = useState<Map<string, unknown>>(() => {
    const persisted = loadPersistedState(config.id);
    if (persisted) {
      const answerMap = new Map<string, unknown>();
      for (const answer of persisted.answers) {
        answerMap.set(answer.questionId, answer.answer);
      }
      return answerMap;
    }
    return new Map<string, unknown>();
  });

  // Persist state whenever it changes
  useEffect(() => {
    const answersArray: JourneyAnswer[] = Array.from(answers.entries()).map(
      ([questionId, answer]) => ({
        questionId,
        answer,
        timestamp: Date.now(),
      })
    );

    const state: JourneyState = {
      journeyId: config.id,
      currentStepIndex,
      completedSteps: Array.from(completedSteps),
      answers: answersArray,
      lastUpdated: Date.now(),
    };

    persistState(state);
  }, [config.id, currentStepIndex, completedSteps, answers]);

  // Supabase sync: Load from Supabase on mount (once)
  useEffect(() => {
    if (!enableSupabaseSync || supabaseLoadedRef.current) return;
    supabaseLoadedRef.current = true;

    const localState = loadPersistedState(config.id);
    const localTimestamp = localState?.lastUpdated ?? 0;

    loadFromSupabase(config.id).then((remoteState) => {
      if (remoteState && remoteState.lastUpdated > localTimestamp) {
        // Remote state is newer, apply it
        setCurrentStepIndex(remoteState.currentStepIndex);
        setCompletedSteps(new Set(remoteState.completedSteps));
        const answerMap = new Map<string, unknown>();
        for (const answer of remoteState.answers) {
          answerMap.set(answer.questionId, answer.answer);
        }
        setAnswers(answerMap);
      }
    });
  }, [config.id, enableSupabaseSync]);

  // Supabase sync: Save to Supabase on state changes (debounced)
  useEffect(() => {
    if (!enableSupabaseSync) return;

    const stateKey = JSON.stringify({
      currentStepIndex,
      completedSteps: Array.from(completedSteps),
      answers: Array.from(answers.entries()),
    });

    // Skip if state hasn't changed
    if (stateKey === lastSavedRef.current) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      const answersArray: JourneyAnswer[] = Array.from(answers.entries()).map(
        ([questionId, answer]) => ({
          questionId,
          answer,
          timestamp: Date.now(),
        })
      );

      const state: JourneyState = {
        journeyId: config.id,
        currentStepIndex,
        completedSteps: Array.from(completedSteps),
        answers: answersArray,
        lastUpdated: Date.now(),
      };

      saveToSupabase(state).then((success) => {
        if (success) {
          lastSavedRef.current = stateKey;
        }
      });
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config.id, currentStepIndex, completedSteps, answers, enableSupabaseSync]);

  // Calculate derived values
  // Ensure we have a valid step index
  const safeStepIndex = Math.max(
    0,
    Math.min(currentStepIndex, config.steps.length - 1)
  );
  const currentStep = config.steps[safeStepIndex]!;
  const isFirstStep = safeStepIndex === 0;
  const isLastStep = safeStepIndex === config.steps.length - 1;
  const progress = Math.round(
    (completedSteps.size / config.steps.length) * 100
  );

  // Check if current step is complete (required for advancement)
  const canAdvance = useMemo(() => {
    if (!currentStep) return false;
    if (isLastStep) return false;

    // If current step is required and not completed, can't advance
    if (currentStep.required && !completedSteps.has(currentStep.id)) {
      return false;
    }

    return true;
  }, [currentStep, isLastStep, completedSteps]);

  // Actions
  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= config.steps.length) return;
      setCurrentStepIndex(index);
    },
    [config.steps.length]
  );

  const nextStep = useCallback(() => {
    if (!canAdvance) return;
    setCurrentStepIndex((prev) => Math.min(prev + 1, config.steps.length - 1));
  }, [canAdvance, config.steps.length]);

  const prevStep = useCallback(() => {
    if (isFirstStep) return;
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, [isFirstStep]);

  const markComplete = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  }, []);

  const setAnswer = useCallback((questionId: string, answer: unknown) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, answer);
      return next;
    });
  }, []);

  const value = useMemo<JourneyContextValue>(
    () => ({
      config,
      currentStepIndex,
      completedSteps,
      answers,
      progress,
      canAdvance,
      isFirstStep,
      isLastStep,
      currentStep,
      goToStep,
      nextStep,
      prevStep,
      markComplete,
      setAnswer,
    }),
    [
      config,
      currentStepIndex,
      completedSteps,
      answers,
      progress,
      canAdvance,
      isFirstStep,
      isLastStep,
      currentStep,
      goToStep,
      nextStep,
      prevStep,
      markComplete,
      setAnswer,
    ]
  );

  return (
    <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
  );
}

/**
 * Hook to access journey state and actions
 * Must be used within a JourneyProvider
 */
export function useJourney(): JourneyContextValue {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error("useJourney must be used within a JourneyProvider");
  }
  return context;
}
