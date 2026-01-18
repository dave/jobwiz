/**
 * User Profile Types
 * Issue: #58 - User profile table schema
 */

/**
 * Profile from database
 */
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Profile input for creating/updating
 */
export interface ProfileInput {
  display_name?: string | null;
  avatar_url?: string | null;
}

/**
 * User preferences from database
 */
export interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  target_company: string | null;
  target_role: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User preferences input for creating/updating
 */
export interface UserPreferencesInput {
  email_notifications?: boolean;
  target_company?: string | null;
  target_role?: string | null;
}

/**
 * Combined profile with preferences
 */
export interface ProfileWithPreferences {
  profile: Profile;
  preferences: UserPreferences | null;
}

/**
 * Database row types (matching Supabase schema)
 */
export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRow {
  id: string;
  user_id: string;
  email_notifications: boolean;
  target_company: string | null;
  target_role: string | null;
  created_at: string;
  updated_at: string;
}
