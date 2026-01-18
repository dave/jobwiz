/**
 * Tests for auth types
 * Issue: #57 - Protected route middleware
 */

import { transformUser } from "../types";
import type { User } from "@supabase/supabase-js";

describe("transformUser", () => {
  it("returns null for null user", () => {
    expect(transformUser(null)).toBeNull();
  });

  it("transforms user with all fields", () => {
    const mockUser: User = {
      id: "user-123",
      email: "test@example.com",
      user_metadata: {
        full_name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
      },
      app_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01",
    };

    const result = transformUser(mockUser);

    expect(result).toEqual({
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("uses email prefix as display name when full_name not set", () => {
    const mockUser: User = {
      id: "user-123",
      email: "john.doe@example.com",
      user_metadata: {},
      app_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01",
    };

    const result = transformUser(mockUser);

    expect(result?.displayName).toBe("john.doe");
  });

  it("handles missing email gracefully", () => {
    const mockUser: User = {
      id: "user-123",
      email: undefined,
      user_metadata: {
        full_name: "Test User",
      },
      app_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01",
    };

    const result = transformUser(mockUser);

    expect(result).toEqual({
      id: "user-123",
      email: null,
      displayName: "Test User",
      avatarUrl: null,
    });
  });

  it("handles missing metadata gracefully", () => {
    const mockUser: User = {
      id: "user-123",
      email: "test@example.com",
      user_metadata: {},
      app_metadata: {},
      aud: "authenticated",
      created_at: "2024-01-01",
    };

    const result = transformUser(mockUser);

    expect(result?.avatarUrl).toBeNull();
  });
});
