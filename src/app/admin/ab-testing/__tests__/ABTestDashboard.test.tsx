/**
 * AB Test Dashboard Component Tests
 * Issue: #44 - AB test dashboard
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock dependencies
jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn(() =>
        Promise.resolve({
          data: [],
          error: null,
        })
      ),
    })),
  })),
}));

// Import component after mocking
import { ABTestDashboard } from "../ABTestDashboard";

describe("ABTestDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders dashboard header", () => {
    render(<ABTestDashboard />);
    expect(
      screen.getByRole("heading", { name: "AB Test Dashboard" })
    ).toBeInTheDocument();
  });

  test("renders experiment selector", () => {
    render(<ABTestDashboard />);
    expect(
      screen.getByRole("combobox", { name: "Experiment" })
    ).toBeInTheDocument();
  });

  test("renders date range selector", () => {
    render(<ABTestDashboard />);
    expect(
      screen.getByRole("combobox", { name: "Date Range" })
    ).toBeInTheDocument();
  });

  test("renders date range presets", () => {
    render(<ABTestDashboard />);
    const dateSelect = screen.getByRole("combobox", { name: "Date Range" });
    expect(dateSelect).toBeInTheDocument();

    // Check for preset options
    expect(screen.getByRole("option", { name: "Last 7 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 14 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 30 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Last 90 days" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All time" })).toBeInTheDocument();
  });

  test("renders refresh button", () => {
    render(<ABTestDashboard />);
    expect(
      screen.getByRole("button", { name: /loading|refresh/i })
    ).toBeInTheDocument();
  });

  test("renders export CSV button", () => {
    render(<ABTestDashboard />);
    expect(
      screen.getByRole("button", { name: /export csv/i })
    ).toBeInTheDocument();
  });

  test("renders auto-refresh checkbox", () => {
    render(<ABTestDashboard />);
    expect(
      screen.getByRole("checkbox", { name: /auto-refresh/i })
    ).toBeInTheDocument();
  });

  test("export button is disabled when no metrics loaded", () => {
    render(<ABTestDashboard />);
    const exportButton = screen.getByRole("button", { name: /export csv/i });
    expect(exportButton).toBeDisabled();
  });

  test("shows loading state or empty state", async () => {
    render(<ABTestDashboard />);
    // Either shows loading or no experiments message
    const hasLoading = screen.queryByText(/loading/i);
    const hasNoExperiments = screen.queryByText(/no experiments/i);
    expect(hasLoading || hasNoExperiments).toBeTruthy();
  });

  test("auto-refresh checkbox is unchecked by default", () => {
    render(<ABTestDashboard />);
    const checkbox = screen.getByRole("checkbox", { name: /auto-refresh/i });
    expect(checkbox).not.toBeChecked();
  });

  test("date range has default selection", () => {
    render(<ABTestDashboard />);
    const dateSelect = screen.getByRole("combobox", {
      name: "Date Range",
    }) as HTMLSelectElement;

    // Find the selected option - should have some default value
    const options = screen.getAllByRole("option");
    const selectedOption = options.find((opt) => (opt as HTMLOptionElement).selected);
    expect(selectedOption).toBeInTheDocument();
    // Should be one of the presets
    expect(selectedOption?.textContent).toMatch(/last \d+ days|all time/i);
  });
});

describe("ABTestDashboard accessibility", () => {
  test("has accessible form controls", () => {
    render(<ABTestDashboard />);

    // All form controls should have labels
    expect(screen.getByLabelText(/experiment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auto-refresh/i)).toBeInTheDocument();
  });

  test("buttons have accessible names", () => {
    render(<ABTestDashboard />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });
});
