import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SocialLoginButtons } from "../SocialLoginButtons";

// Mock the Supabase client
const mockSignInWithOAuth = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe("SocialLoginButtons", () => {
  // Mock window.location
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        origin: "http://localhost:3000",
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders Google login button", () => {
      render(<SocialLoginButtons />);
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    });

    it("renders Google icon", () => {
      render(<SocialLoginButtons />);
      const button = screen.getByRole("button", { name: /continue with google/i });
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Google OAuth", () => {
    it("calls signInWithOAuth with google provider when clicked", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<SocialLoginButtons />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: {
            redirectTo: "http://localhost:3000/auth/callback",
          },
        });
      });
    });

    it("uses custom redirectTo when provided", async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(<SocialLoginButtons redirectTo="http://localhost:3000/dashboard" />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: {
            redirectTo: "http://localhost:3000/dashboard",
          },
        });
      });
    });

    it("shows loading state while OAuth is in progress", async () => {
      mockSignInWithOAuth.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<SocialLoginButtons />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      fireEvent.click(googleButton);

      // Button should be disabled during loading
      await waitFor(() => {
        expect(googleButton).toBeDisabled();
      });
    });

    it("displays error message on OAuth failure", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "OAuth failed" },
      });

      render(<SocialLoginButtons />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/oauth failed/i)).toBeInTheDocument();
      });
    });

    it("re-enables button after error", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "OAuth failed" },
      });

      render(<SocialLoginButtons />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(googleButton).not.toBeDisabled();
      });
    });
  });

  describe("disabled state", () => {
    it("disables all buttons when disabled prop is true", () => {
      render(<SocialLoginButtons disabled={true} />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      expect(googleButton).toBeDisabled();
    });

    it("enables buttons when disabled prop is false", () => {
      render(<SocialLoginButtons disabled={false} />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });
      expect(googleButton).not.toBeDisabled();
    });

    it("prevents OAuth call when disabled", () => {
      render(<SocialLoginButtons disabled={true} />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      fireEvent.click(googleButton);

      expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("displays error with role=alert", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "OAuth error" },
      });

      render(<SocialLoginButtons />);
      const googleButton = screen.getByRole("button", { name: /continue with google/i });

      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });
});
