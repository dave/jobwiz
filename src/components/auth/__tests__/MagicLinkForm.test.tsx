import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MagicLinkForm } from "../MagicLinkForm";

// Mock the Supabase client
const mockSignInWithOtp = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  }),
}));

describe("MagicLinkForm", () => {
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
    it("renders email input field", () => {
      render(<MagicLinkForm />);
      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<MagicLinkForm />);
      expect(screen.getByRole("button", { name: /send magic link/i })).toBeInTheDocument();
    });

    it("has screen reader label for email input", () => {
      render(<MagicLinkForm />);
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });

  describe("email validation", () => {
    it("shows error for invalid email format", async () => {
      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "not-an-email" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it("does not call API for invalid email", async () => {
      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const form = emailInput.closest("form") as HTMLFormElement;

      fireEvent.change(emailInput, { target: { value: "invalid" } });
      fireEvent.submit(form);

      expect(mockSignInWithOtp).not.toHaveBeenCalled();
    });

    it("accepts valid email addresses", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });
    });
  });

  describe("magic link submission", () => {
    it("calls signInWithOtp with email", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          email: "test@example.com",
          options: {
            emailRedirectTo: "http://localhost:3000/auth/callback",
          },
        });
      });
    });

    it("uses custom redirectTo when provided", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(<MagicLinkForm redirectTo="http://localhost:3000/dashboard" />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          email: "test@example.com",
          options: {
            emailRedirectTo: "http://localhost:3000/dashboard",
          },
        });
      });
    });

    it("shows loading state while sending", async () => {
      mockSignInWithOtp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      expect(screen.getByRole("button", { name: /sending/i })).toBeInTheDocument();
    });

    it("disables input and button while loading", async () => {
      mockSignInWithOtp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe("success state", () => {
    it("shows success message after sending", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email for a magic link/i)).toBeInTheDocument();
      });
    });

    it("hides the form after success", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter your email/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /send magic link/i })).not.toBeInTheDocument();
      });
    });

    it("calls onSuccess callback after successful submission", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const onSuccess = jest.fn();

      render(<MagicLinkForm onSuccess={onSuccess} />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("displays error message on API failure", async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: "Rate limit exceeded" },
      });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      });
    });

    it("keeps form visible after error", async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: "Error" },
      });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      });
    });

    it("re-enables form after error", async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: "Error" },
      });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe("accessibility", () => {
    it("displays error with role=alert", async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: "Error" },
      });

      render(<MagicLinkForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole("button", { name: /send magic link/i });

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });
});
