import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "../PasswordInput";

describe("PasswordInput", () => {
  const defaultProps = {
    id: "password",
    name: "password",
    value: "",
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders an input field", () => {
      render(<PasswordInput {...defaultProps} />);
      const input = document.getElementById("password");
      expect(input).toBeInTheDocument();
      expect(input?.tagName).toBe("INPUT");
    });

    it("renders with password type by default", () => {
      render(<PasswordInput {...defaultProps} />);
      const input = document.getElementById("password");
      expect(input).toHaveAttribute("type", "password");
    });

    it("renders with placeholder text", () => {
      render(<PasswordInput {...defaultProps} placeholder="Enter password" />);
      expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    });

    it("renders with default placeholder when not specified", () => {
      render(<PasswordInput {...defaultProps} />);
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    });

    it("renders show/hide password toggle button", () => {
      render(<PasswordInput {...defaultProps} />);
      expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
    });
  });

  describe("show/hide password toggle", () => {
    it("toggles input type from password to text when show button is clicked", () => {
      render(<PasswordInput {...defaultProps} />);
      const input = document.getElementById("password");
      const toggleButton = screen.getByRole("button", { name: /show password/i });

      expect(input).toHaveAttribute("type", "password");

      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute("type", "text");
    });

    it("toggles input type back to password when hide button is clicked", () => {
      render(<PasswordInput {...defaultProps} />);
      const input = document.getElementById("password");
      const toggleButton = screen.getByRole("button", { name: /show password/i });

      fireEvent.click(toggleButton); // Show
      expect(input).toHaveAttribute("type", "text");

      const hideButton = screen.getByRole("button", { name: /hide password/i });
      fireEvent.click(hideButton); // Hide
      expect(input).toHaveAttribute("type", "password");
    });

    it("updates button aria-label when toggled", () => {
      render(<PasswordInput {...defaultProps} />);
      const toggleButton = screen.getByRole("button", { name: /show password/i });

      fireEvent.click(toggleButton);
      expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
      expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
    });
  });

  describe("input handling", () => {
    it("calls onChange when input value changes", () => {
      const onChange = jest.fn();
      render(<PasswordInput {...defaultProps} onChange={onChange} />);
      const input = document.getElementById("password") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "newpassword" } });
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("displays the provided value", () => {
      render(<PasswordInput {...defaultProps} value="testpassword" />);
      const input = document.getElementById("password") as HTMLInputElement;
      expect(input.value).toBe("testpassword");
    });
  });

  describe("disabled state", () => {
    it("disables the input when disabled prop is true", () => {
      render(<PasswordInput {...defaultProps} disabled={true} />);
      const input = document.getElementById("password");
      expect(input).toBeDisabled();
    });

    it("enables the input when disabled prop is false", () => {
      render(<PasswordInput {...defaultProps} disabled={false} />);
      const input = document.getElementById("password");
      expect(input).not.toBeDisabled();
    });
  });

  describe("required attribute", () => {
    it("sets required attribute when required prop is true", () => {
      render(<PasswordInput {...defaultProps} required={true} />);
      const input = document.getElementById("password");
      expect(input).toHaveAttribute("required");
    });

    it("does not set required attribute when required prop is false", () => {
      render(<PasswordInput {...defaultProps} required={false} />);
      const input = document.getElementById("password");
      expect(input).not.toHaveAttribute("required");
    });
  });

  describe("minLength attribute", () => {
    it("sets minLength to 8 by default", () => {
      render(<PasswordInput {...defaultProps} />);
      const input = document.getElementById("password");
      expect(input).toHaveAttribute("minLength", "8");
    });

    it("allows custom minLength value", () => {
      render(<PasswordInput {...defaultProps} minLength={12} />);
      const input = document.getElementById("password");
      expect(input).toHaveAttribute("minLength", "12");
    });
  });

  describe("autoComplete attribute", () => {
    it("sets current-password autocomplete by default", () => {
      render(<PasswordInput {...defaultProps} />);
      const input = document.getElementById("password");
      expect(input).toHaveAttribute("autocomplete", "current-password");
    });

    it("allows custom autocomplete value", () => {
      render(<PasswordInput {...defaultProps} autoComplete="new-password" />);
      const input = document.getElementById("password");
      expect(input).toHaveAttribute("autocomplete", "new-password");
    });
  });

  describe("accessibility", () => {
    it("sets aria-describedby when provided", () => {
      render(
        <PasswordInput {...defaultProps} aria-describedby="password-help" />
      );
      const input = document.getElementById("password");
      expect(input).toHaveAttribute("aria-describedby", "password-help");
    });

    it("does not set aria-describedby when not provided", () => {
      render(<PasswordInput {...defaultProps} />);
      const input = document.getElementById("password");
      expect(input).not.toHaveAttribute("aria-describedby");
    });
  });
});
