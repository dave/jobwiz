/**
 * Tests for auth context
 * Issue: #57 - Protected route middleware
 */

import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuthContext } from "../context";

// Mock the Supabase client
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSignOut.mockResolvedValue({ error: null });

    mockOnAuthStateChange.mockImplementation((callback) => {
      // Immediately fire INITIAL_SESSION event
      setTimeout(() => {
        callback("INITIAL_SESSION", null);
      }, 0);

      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("provides initial loading state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("uses initial session when provided", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: { full_name: "Initial User" },
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    // Should not be loading since we have initial session
    expect(result.current.loading).toBe(false);
    expect(result.current.user?.displayName).toBe("Initial User");
  });

  it("provides signOut function", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(typeof result.current.signOut).toBe("function");
  });

  it("provides refreshSession function", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(typeof result.current.refreshSession).toBe("function");
  });

  it("subscribes to auth state changes on mount", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    renderHook(() => useAuthContext(), { wrapper });

    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it("throws error when used outside provider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow("useAuthContext must be used within an AuthProvider");

    consoleError.mockRestore();
  });

  it("transforms user data correctly from session", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {
          full_name: "Test User",
          avatar_url: "https://example.com/avatar.jpg",
        },
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(result.current.user).toEqual({
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("provides session object when logged in", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "test-token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.access_token).toBe("test-token");
  });

  it("has null session when not logged in", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={null}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    // With null initial session, loading should be true until session is fetched
    expect(result.current.session).toBeNull();
  });
});
