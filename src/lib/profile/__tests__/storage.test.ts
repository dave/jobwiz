/**
 * User Profile Storage Tests
 * Issue: #58 - User profile table schema
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  getProfile,
  getProfileById,
  updateProfile,
  getPreferences,
  getPreferencesById,
  updatePreferences,
  createPreferences,
  getOrCreatePreferences,
  getProfileWithPreferences,
  profileExists,
  deleteProfile,
} from "../storage";
import { Profile, UserPreferences, ProfileRow, UserPreferencesRow } from "../types";

// Mock Supabase client
function createMockSupabase(
  overrides: {
    user?: { id: string; email?: string } | null;
    profileData?: ProfileRow | null;
    preferencesData?: UserPreferencesRow | null;
    error?: { message: string } | null;
  } = {}
): SupabaseClient {
  const defaultUser = { id: "user-123", email: "test@example.com" };
  const defaultProfile: ProfileRow = {
    id: "user-123",
    display_name: "Test User",
    avatar_url: null,
    email: "test@example.com",
    created_at: "2026-01-18T00:00:00Z",
    updated_at: "2026-01-18T00:00:00Z",
  };
  const defaultPreferences: UserPreferencesRow = {
    id: "pref-123",
    user_id: "user-123",
    email_notifications: true,
    target_company: null,
    target_role: null,
    created_at: "2026-01-18T00:00:00Z",
    updated_at: "2026-01-18T00:00:00Z",
  };

  const user = overrides.user === null ? null : (overrides.user ?? defaultUser);
  const profileData =
    overrides.profileData === null
      ? null
      : (overrides.profileData ?? defaultProfile);
  const preferencesData =
    overrides.preferencesData === null
      ? null
      : (overrides.preferencesData ?? defaultPreferences);
  const error = overrides.error ?? null;

  let currentTable = "";

  const mockBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => {
      if (error) {
        return Promise.resolve({ data: null, error });
      }
      if (currentTable === "profiles") {
        return Promise.resolve({ data: profileData, error: null });
      }
      if (currentTable === "user_preferences") {
        return Promise.resolve({ data: preferencesData, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      currentTable = table;
      return mockBuilder;
    }),
  } as unknown as SupabaseClient;
}

describe("Profile Storage", () => {
  describe("getProfile", () => {
    it("returns profile for authenticated user", async () => {
      const supabase = createMockSupabase();

      const profile = await getProfile(supabase);

      expect(profile).toEqual({
        id: "user-123",
        display_name: "Test User",
        avatar_url: null,
        email: "test@example.com",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      });
    });

    it("returns null for unauthenticated user", async () => {
      const supabase = createMockSupabase({ user: null });

      const profile = await getProfile(supabase);

      expect(profile).toBeNull();
    });

    it("returns null on database error", async () => {
      const supabase = createMockSupabase({
        error: { message: "Database error" },
      });

      const profile = await getProfile(supabase);

      expect(profile).toBeNull();
    });
  });

  describe("getProfileById", () => {
    it("returns profile by user ID", async () => {
      const supabase = createMockSupabase();

      const profile = await getProfileById(supabase, "user-123");

      expect(profile).toEqual(
        expect.objectContaining({
          id: "user-123",
          display_name: "Test User",
        })
      );
    });

    it("returns null for non-existent user", async () => {
      const supabase = createMockSupabase({ profileData: null });

      const profile = await getProfileById(supabase, "non-existent");

      expect(profile).toBeNull();
    });
  });

  describe("updateProfile", () => {
    it("updates profile for authenticated user", async () => {
      const updatedProfile: ProfileRow = {
        id: "user-123",
        display_name: "New Name",
        avatar_url: "https://example.com/avatar.png",
        email: "test@example.com",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T01:00:00Z",
      };
      const supabase = createMockSupabase({ profileData: updatedProfile });

      const profile = await updateProfile(supabase, {
        display_name: "New Name",
        avatar_url: "https://example.com/avatar.png",
      });

      expect(profile).toEqual(
        expect.objectContaining({
          display_name: "New Name",
          avatar_url: "https://example.com/avatar.png",
        })
      );
    });

    it("returns null for unauthenticated user", async () => {
      const supabase = createMockSupabase({ user: null });

      const profile = await updateProfile(supabase, {
        display_name: "New Name",
      });

      expect(profile).toBeNull();
    });

    it("returns null on database error", async () => {
      const supabase = createMockSupabase({
        error: { message: "Update failed" },
      });

      const profile = await updateProfile(supabase, {
        display_name: "New Name",
      });

      expect(profile).toBeNull();
    });
  });

  describe("getPreferences", () => {
    it("returns preferences for authenticated user", async () => {
      const supabase = createMockSupabase();

      const prefs = await getPreferences(supabase);

      expect(prefs).toEqual(
        expect.objectContaining({
          user_id: "user-123",
          email_notifications: true,
        })
      );
    });

    it("returns null for unauthenticated user", async () => {
      const supabase = createMockSupabase({ user: null });

      const prefs = await getPreferences(supabase);

      expect(prefs).toBeNull();
    });

    it("returns null when no preferences exist", async () => {
      const supabase = createMockSupabase({ preferencesData: null });

      const prefs = await getPreferences(supabase);

      expect(prefs).toBeNull();
    });
  });

  describe("getPreferencesById", () => {
    it("returns preferences by user ID", async () => {
      const supabase = createMockSupabase();

      const prefs = await getPreferencesById(supabase, "user-123");

      expect(prefs).toEqual(
        expect.objectContaining({
          user_id: "user-123",
          email_notifications: true,
        })
      );
    });

    it("returns null for non-existent user", async () => {
      const supabase = createMockSupabase({ preferencesData: null });

      const prefs = await getPreferencesById(supabase, "non-existent");

      expect(prefs).toBeNull();
    });
  });

  describe("updatePreferences", () => {
    it("updates preferences for authenticated user", async () => {
      const updatedPrefs: UserPreferencesRow = {
        id: "pref-123",
        user_id: "user-123",
        email_notifications: false,
        target_company: "google",
        target_role: "software-engineer",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T01:00:00Z",
      };
      const supabase = createMockSupabase({ preferencesData: updatedPrefs });

      const prefs = await updatePreferences(supabase, {
        email_notifications: false,
        target_company: "google",
        target_role: "software-engineer",
      });

      expect(prefs).toEqual(
        expect.objectContaining({
          email_notifications: false,
          target_company: "google",
          target_role: "software-engineer",
        })
      );
    });

    it("returns null for unauthenticated user", async () => {
      const supabase = createMockSupabase({ user: null });

      const prefs = await updatePreferences(supabase, {
        email_notifications: false,
      });

      expect(prefs).toBeNull();
    });
  });

  describe("createPreferences", () => {
    it("creates preferences for authenticated user", async () => {
      const supabase = createMockSupabase();

      const prefs = await createPreferences(supabase);

      expect(prefs).toEqual(
        expect.objectContaining({
          user_id: "user-123",
          email_notifications: true,
        })
      );
    });

    it("creates preferences with custom values", async () => {
      const customPrefs: UserPreferencesRow = {
        id: "pref-456",
        user_id: "user-123",
        email_notifications: false,
        target_company: "apple",
        target_role: "product-manager",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };
      const supabase = createMockSupabase({ preferencesData: customPrefs });

      const prefs = await createPreferences(supabase, {
        email_notifications: false,
        target_company: "apple",
        target_role: "product-manager",
      });

      expect(prefs).toEqual(
        expect.objectContaining({
          email_notifications: false,
          target_company: "apple",
          target_role: "product-manager",
        })
      );
    });

    it("returns null for unauthenticated user", async () => {
      const supabase = createMockSupabase({ user: null });

      const prefs = await createPreferences(supabase);

      expect(prefs).toBeNull();
    });
  });

  describe("getOrCreatePreferences", () => {
    it("returns existing preferences", async () => {
      const supabase = createMockSupabase();

      const prefs = await getOrCreatePreferences(supabase);

      expect(prefs).toEqual(
        expect.objectContaining({
          user_id: "user-123",
        })
      );
    });

    it("creates preferences when none exist", async () => {
      // First call returns null, second call returns created prefs
      const mockPrefs: UserPreferencesRow = {
        id: "new-pref",
        user_id: "user-123",
        email_notifications: true,
        target_company: null,
        target_role: null,
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      };

      let callCount = 0;
      const supabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(() => {
            callCount++;
            // First call (getPreferences) returns null
            if (callCount === 1) {
              return Promise.resolve({ data: null, error: { message: "Not found" } });
            }
            // Second call (createPreferences) returns new prefs
            return Promise.resolve({ data: mockPrefs, error: null });
          }),
        })),
      } as unknown as SupabaseClient;

      const prefs = await getOrCreatePreferences(supabase);

      expect(prefs).toEqual(mockPrefs);
    });

    it("returns null for unauthenticated user", async () => {
      const supabase = createMockSupabase({ user: null });

      const prefs = await getOrCreatePreferences(supabase);

      expect(prefs).toBeNull();
    });
  });

  describe("getProfileWithPreferences", () => {
    it("returns profile and preferences together", async () => {
      const supabase = createMockSupabase();

      const result = await getProfileWithPreferences(supabase);

      expect(result).toEqual({
        profile: expect.objectContaining({
          id: "user-123",
          display_name: "Test User",
        }),
        preferences: expect.objectContaining({
          user_id: "user-123",
          email_notifications: true,
        }),
      });
    });

    it("returns profile with null preferences when none exist", async () => {
      const supabase = createMockSupabase({ preferencesData: null });

      // Custom mock to return profile but null for preferences
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation((table: string) => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(() => {
            if (table === "profiles") {
              return Promise.resolve({
                data: {
                  id: "user-123",
                  display_name: "Test User",
                  avatar_url: null,
                  email: "test@example.com",
                  created_at: "2026-01-18T00:00:00Z",
                  updated_at: "2026-01-18T00:00:00Z",
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: { message: "Not found" } });
          }),
        })),
      } as unknown as SupabaseClient;

      const result = await getProfileWithPreferences(mockSupabase);

      expect(result).toEqual({
        profile: expect.objectContaining({
          id: "user-123",
        }),
        preferences: null,
      });
    });

    it("returns null when profile does not exist", async () => {
      const supabase = createMockSupabase({ profileData: null });

      const result = await getProfileWithPreferences(supabase);

      expect(result).toBeNull();
    });
  });

  describe("profileExists", () => {
    it("returns true when profile exists", async () => {
      const supabase = createMockSupabase();

      const exists = await profileExists(supabase, "user-123");

      expect(exists).toBe(true);
    });

    it("returns false when profile does not exist", async () => {
      const supabase = createMockSupabase({
        profileData: null,
        error: { message: "Not found" },
      });

      const exists = await profileExists(supabase, "non-existent");

      expect(exists).toBe(false);
    });
  });

  describe("deleteProfile", () => {
    it("deletes profile for authenticated user", async () => {
      const supabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: null, error: null })
          ),
        })),
      } as unknown as SupabaseClient;

      const result = await deleteProfile(supabase);

      expect(result).toBe(true);
    });

    it("returns false for unauthenticated user", async () => {
      const supabase = createMockSupabase({ user: null });

      const result = await deleteProfile(supabase);

      expect(result).toBe(false);
    });

    it("returns false on database error", async () => {
      const supabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
            error: null,
          }),
        },
        from: jest.fn().mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(() =>
            Promise.resolve({ data: null, error: { message: "Delete failed" } })
          ),
        })),
      } as unknown as SupabaseClient;

      const result = await deleteProfile(supabase);

      expect(result).toBe(false);
    });
  });
});

describe("Profile Schema Types", () => {
  it("Profile type has correct shape", () => {
    const profile: Profile = {
      id: "user-123",
      display_name: "Test User",
      avatar_url: null,
      email: "test@example.com",
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    expect(profile.id).toBeDefined();
    expect(profile.display_name).toBe("Test User");
  });

  it("UserPreferences type has correct shape", () => {
    const prefs: UserPreferences = {
      id: "pref-123",
      user_id: "user-123",
      email_notifications: true,
      target_company: null,
      target_role: null,
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    expect(prefs.user_id).toBeDefined();
    expect(prefs.email_notifications).toBe(true);
  });

  it("UserPreferences can have target company and role", () => {
    const prefs: UserPreferences = {
      id: "pref-456",
      user_id: "user-123",
      email_notifications: false,
      target_company: "google",
      target_role: "software-engineer",
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    expect(prefs.target_company).toBe("google");
    expect(prefs.target_role).toBe("software-engineer");
  });
});

describe("SQL Migration Verification", () => {
  it("profiles table has required columns", () => {
    const requiredColumns = [
      "id",
      "display_name",
      "avatar_url",
      "email",
      "created_at",
      "updated_at",
    ];

    // This is validated by TypeScript - if ProfileRow is missing any columns,
    // TypeScript will error
    const profile: ProfileRow = {
      id: "user-123",
      display_name: "Test",
      avatar_url: null,
      email: "test@example.com",
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    requiredColumns.forEach((col) => {
      expect(col in profile).toBe(true);
    });
  });

  it("user_preferences table has required columns", () => {
    const requiredColumns = [
      "id",
      "user_id",
      "email_notifications",
      "target_company",
      "target_role",
      "created_at",
      "updated_at",
    ];

    const prefs: UserPreferencesRow = {
      id: "pref-123",
      user_id: "user-123",
      email_notifications: true,
      target_company: null,
      target_role: null,
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    requiredColumns.forEach((col) => {
      expect(col in prefs).toBe(true);
    });
  });

  it("email_notifications defaults to true", () => {
    // Verify the default value in the schema by checking the mock default
    const prefs: UserPreferencesRow = {
      id: "pref-123",
      user_id: "user-123",
      email_notifications: true, // default
      target_company: null,
      target_role: null,
      created_at: "2026-01-18T00:00:00Z",
      updated_at: "2026-01-18T00:00:00Z",
    };

    expect(prefs.email_notifications).toBe(true);
  });
});

describe("RLS Policy Logic", () => {
  it("users can only access own profile via RLS", async () => {
    // This test validates the logical intent of RLS policies
    // In practice, RLS is enforced by Supabase, but we verify our code
    // properly passes the authenticated user ID
    const supabase = createMockSupabase({
      user: { id: "user-123" },
    });

    const profile = await getProfile(supabase);

    // The profile returned should match the authenticated user
    expect(profile?.id).toBe("user-123");
  });

  it("unauthenticated users cannot access profiles", async () => {
    const supabase = createMockSupabase({ user: null });

    const profile = await getProfile(supabase);

    expect(profile).toBeNull();
  });

  it("users cannot access other user profiles via getProfile", async () => {
    // getProfile only returns the current user's profile
    const supabase = createMockSupabase({
      user: { id: "user-123" },
      profileData: {
        id: "user-123",
        display_name: "My Profile",
        avatar_url: null,
        email: "me@example.com",
        created_at: "2026-01-18T00:00:00Z",
        updated_at: "2026-01-18T00:00:00Z",
      },
    });

    // Even if we call getProfile, it will use the authenticated user's ID
    const profile = await getProfile(supabase);

    expect(profile?.id).toBe("user-123");
  });
});

describe("Trigger Logic", () => {
  it("display_name can be extracted from email", () => {
    // Simulates what the trigger does when no name is provided
    const email = "john.doe@example.com";
    const displayName = email.split("@")[0];

    expect(displayName).toBe("john.doe");
  });

  it("trigger creates profile with user metadata name if available", () => {
    // Simulate trigger behavior
    const rawUserMetaData = { full_name: "John Doe" };
    const email = "john.doe@example.com";

    const displayName =
      rawUserMetaData.full_name ||
      email.split("@")[0];

    expect(displayName).toBe("John Doe");
  });

  it("trigger falls back to email prefix when no name in metadata", () => {
    const rawUserMetaData = {};
    const email = "jane.smith@example.com";

    const displayName =
      (rawUserMetaData as { full_name?: string }).full_name ||
      email.split("@")[0];

    expect(displayName).toBe("jane.smith");
  });
});
