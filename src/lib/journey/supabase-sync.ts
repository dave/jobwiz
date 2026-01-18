/**
 * Supabase sync for journey progress
 * Syncs journey state to Supabase for logged-in users
 */

import { useEffect, useRef, useCallback } from "react";
import type { JourneyState } from "@/types";
import { createBrowserClient } from "@/lib/supabase/client";

/**
 * Supabase journey_progress table row type
 */
export interface JourneyProgressRow {
  id: string;
  user_id: string;
  journey_id: string;
  current_step_index: number;
  completed_steps: string[];
  answers: Array<{
    questionId: string;
    answer: unknown;
    timestamp: number;
  }>;
  last_updated: string;
  created_at: string;
}

/**
 * Load journey progress from Supabase
 * Returns null if no saved progress or not authenticated
 */
export async function loadFromSupabase(
  journeyId: string
): Promise<JourneyState | null> {
  try {
    const supabase = createBrowserClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("journey_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("journey_id", journeyId)
      .single();

    if (error || !data) return null;

    // Convert Supabase row to JourneyState
    return {
      journeyId: data.journey_id,
      currentStepIndex: data.current_step_index,
      completedSteps: data.completed_steps,
      answers: data.answers,
      lastUpdated: new Date(data.last_updated).getTime(),
    };
  } catch {
    return null;
  }
}

/**
 * Save journey progress to Supabase
 * No-op if user is not authenticated
 */
export async function saveToSupabase(state: JourneyState): Promise<boolean> {
  try {
    const supabase = createBrowserClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("journey_progress")
      .upsert(
        {
          user_id: user.id,
          journey_id: state.journeyId,
          current_step_index: state.currentStepIndex,
          completed_steps: state.completedSteps,
          answers: state.answers,
          last_updated: new Date(state.lastUpdated).toISOString(),
        },
        {
          onConflict: "user_id,journey_id",
        }
      );

    return !error;
  } catch {
    return false;
  }
}

/**
 * Hook to sync journey state with Supabase
 * Loads state on mount and saves on changes (debounced)
 */
export function useSupabaseSync(
  journeyId: string,
  state: JourneyState,
  onRemoteStateLoaded: (state: JourneyState) => void
): void {
  const initialLoadDone = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // Load from Supabase on mount (once)
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    loadFromSupabase(journeyId).then((remoteState) => {
      if (remoteState && remoteState.lastUpdated > state.lastUpdated) {
        onRemoteStateLoaded(remoteState);
      }
    });
  }, [journeyId, state.lastUpdated, onRemoteStateLoaded]);

  // Save to Supabase on state changes (debounced)
  useEffect(() => {
    const stateKey = JSON.stringify({
      currentStepIndex: state.currentStepIndex,
      completedSteps: state.completedSteps,
      answers: state.answers,
    });

    // Skip if state hasn't changed
    if (stateKey === lastSavedRef.current) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
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
  }, [state]);
}

/**
 * Hook to check if user is authenticated
 * Returns user ID if authenticated, null otherwise
 */
export function useAuthUser(): string | null {
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id ?? null;
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        userIdRef.current = session?.user?.id ?? null;
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return userIdRef.current;
}
