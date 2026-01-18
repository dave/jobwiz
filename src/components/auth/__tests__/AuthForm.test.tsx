import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthForm } from "../AuthForm";

// Mock the Supabase client
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe("AuthForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("login mode", () => {
    it("renders login form with email and password fields", () => {
      render(<AuthForm mode="login" />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(document.getElementById("password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("renders forgot password link", () => {
      render(<AuthForm mode="login" />);
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it("renders remember email checkbox", () => {
      render(<AuthForm mode="login" />);
      expect(screen.getByLabelText(/remember email/i)).toBeInTheDocument();
    });

    it("validates email format", async () => {
      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it("validates password minimum length", async () => {
      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "short" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("calls signInWithPassword on successful login submission", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("shows loading state while signing in", async () => {
      mockSignInWithPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      expect(screen.getByRole("button", { name: /signing in/i })).toBeInTheDocument();
    });

    it("displays error message on login failure", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });

      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      });
    });

    it("redirects to home after successful login", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("redirects to custom URL after successful login", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      render(<AuthForm mode="login" redirectTo="/dashboard" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("signup mode", () => {
    it("renders signup form with email and password fields", () => {
      render(<AuthForm mode="signup" />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(document.getElementById("password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("does not render forgot password link", () => {
      render(<AuthForm mode="signup" />);
      expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
    });

    it("does not render remember email checkbox", () => {
      render(<AuthForm mode="signup" />);
      expect(screen.queryByLabelText(/remember email/i)).not.toBeInTheDocument();
    });

    it("validates email format", async () => {
      render(<AuthForm mode="signup" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "not-an-email" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it("validates password minimum length", async () => {
      render(<AuthForm mode="signup" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "123" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("calls signUp on successful signup submission", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthForm mode="signup" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
      const submitButton = screen.getByRole("button", { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
          options: {
            emailRedirectTo: expect.any(String),
          },
        });
      });
    });

    it("shows loading state while creating account", async () => {
      mockSignUp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<AuthForm mode="signup" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
      const submitButton = screen.getByRole("button", { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      expect(screen.getByRole("button", { name: /creating account/i })).toBeInTheDocument();
    });

    it("displays error message on signup failure", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "User already registered" },
      });

      render(<AuthForm mode="signup" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
      const submitButton = screen.getByRole("button", { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/user already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe("mode switching", () => {
    it("calls onModeChange when switching to signup", () => {
      const onModeChange = jest.fn();
      render(<AuthForm mode="login" onModeChange={onModeChange} />);

      const signUpLink = screen.getByRole("button", { name: /sign up/i });
      fireEvent.click(signUpLink);

      expect(onModeChange).toHaveBeenCalledWith("signup");
    });

    it("calls onModeChange when switching to login", () => {
      const onModeChange = jest.fn();
      render(<AuthForm mode="signup" onModeChange={onModeChange} />);

      const signInLink = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(signInLink);

      expect(onModeChange).toHaveBeenCalledWith("login");
    });

    it("does not show mode switch links when onModeChange is not provided", () => {
      render(<AuthForm mode="login" />);
      expect(screen.queryByText(/don't have an account/i)).not.toBeInTheDocument();
    });
  });

  describe("form field error clearing", () => {
    it("clears email error when user starts typing", async () => {
      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "invalid" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("shows error messages with role=alert", async () => {
      render(<AuthForm mode="login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "invalid" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.submit(form);

      await waitFor(() => {
        const errorMessage = screen.getByRole("alert");
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });
});
