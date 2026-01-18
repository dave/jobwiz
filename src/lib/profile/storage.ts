/**
 * User Profile Storage Operations
 * Issue: #58 - User profile table schema
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Profile,
  ProfileInput,
  ProfileRow,
  UserPreferences,
  UserPreferencesInput,
  UserPreferencesRow,
  ProfileWithPreferences,
} from "./types";

/**
 * Get current user's profile
 */
export async function getProfile(
  supabase: SupabaseClient
): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get profile by user ID (requires service role or matching user)
 */
export async function getProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<ProfileRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update current user's profile
 */
export async function updateProfile(
  supabase: SupabaseClient,
  input: ProfileInput
): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name,
      avatar_url: input.avatar_url,
    })
    .eq("id", user.id)
    .select()
    .single<ProfileRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get current user's preferences
 */
export async function getPreferences(
  supabase: SupabaseClient
): Promise<UserPreferences | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single<UserPreferencesRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get preferences by user ID (requires service role or matching user)
 */
export async function getPreferencesById(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single<UserPreferencesRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update current user's preferences
 */
export async function updatePreferences(
  supabase: SupabaseClient,
  input: UserPreferencesInput
): Promise<UserPreferences | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .update({
      email_notifications: input.email_notifications,
      target_company: input.target_company,
      target_role: input.target_role,
    })
    .eq("user_id", user.id)
    .select()
    .single<UserPreferencesRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Create preferences for user (fallback if trigger didn't run)
 */
export async function createPreferences(
  supabase: SupabaseClient,
  input?: UserPreferencesInput
): Promise<UserPreferences | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .insert({
      user_id: user.id,
      email_notifications: input?.email_notifications ?? true,
      target_company: input?.target_company ?? null,
      target_role: input?.target_role ?? null,
    })
    .select()
    .single<UserPreferencesRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get or create preferences for current user
 */
export async function getOrCreatePreferences(
  supabase: SupabaseClient
): Promise<UserPreferences | null> {
  const existing = await getPreferences(supabase);
  if (existing) {
    return existing;
  }

  return createPreferences(supabase);
}

/**
 * Get profile with preferences for current user
 */
export async function getProfileWithPreferences(
  supabase: SupabaseClient
): Promise<ProfileWithPreferences | null> {
  const profile = await getProfile(supabase);
  if (!profile) {
    return null;
  }

  const preferences = await getPreferences(supabase);

  return {
    profile,
    preferences,
  };
}

/**
 * Check if profile exists for user
 */
export async function profileExists(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  return !error && !!data;
}

/**
 * Delete profile and all associated data (cascades to preferences)
 * Typically used when user deletes their account
 */
export async function deleteProfile(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase.from("profiles").delete().eq("id", user.id);

  return !error;
}
