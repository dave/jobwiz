import { render, screen, fireEvent } from "@testing-library/react";
import { ChecklistBlock } from "../ChecklistBlock";
import type { ChecklistBlock as ChecklistBlockType } from "@/types/module";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("ChecklistBlock", () => {
  const defaultBlock: ChecklistBlockType = {
    id: "checklist-1",
    type: "checklist",
    title: "Interview Prep Checklist",
    items: [
      { id: "1", text: "Research the company", required: true },
      { id: "2", text: "Practice common questions", required: true },
      { id: "3", text: "Prepare your outfit", required: false },
    ],
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders all items as checkboxes", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3);
    });

    it("renders title when provided", () => {
      render(<ChecklistBlock block={defaultBlock} />);
      expect(screen.getByText("Interview Prep Checklist")).toBeInTheDocument();
    });

    it("renders item text", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      expect(screen.getByText("Research the company")).toBeInTheDocument();
      expect(screen.getByText("Practice common questions")).toBeInTheDocument();
      expect(screen.getByText("Prepare your outfit")).toBeInTheDocument();
    });

    it("shows progress count", () => {
      render(<ChecklistBlock block={defaultBlock} />);
      expect(screen.getByText("0 of 3 complete")).toBeInTheDocument();
    });

    it("marks required items visually", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      // Required items should have asterisk indicator
      const requiredIndicators = screen.getAllByText("*");
      expect(requiredIndicators.length).toBeGreaterThanOrEqual(2); // At least 2 required items
    });
  });

  describe("interaction", () => {
    it("toggles checked state on click", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const firstItem = screen.getByText("Research the company");
      fireEvent.click(firstItem);

      const checkbox = screen.getAllByRole("checkbox")[0];
      expect(checkbox).toHaveAttribute("aria-checked", "true");
    });

    it("updates progress count when items are checked", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const firstItem = screen.getByText("Research the company");
      fireEvent.click(firstItem);

      expect(screen.getByText("1 of 3 complete")).toBeInTheDocument();
    });

    it("allows unchecking items", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const firstItem = screen.getByText("Research the company");
      fireEvent.click(firstItem); // Check
      fireEvent.click(firstItem); // Uncheck

      expect(screen.getByText("0 of 3 complete")).toBeInTheDocument();
    });
  });

  describe("persistence", () => {
    it("persists to localStorage on check", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const firstItem = screen.getByText("Research the company");
      fireEvent.click(firstItem);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("loads persisted state on mount", () => {
      // Pre-populate localStorage
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(["1", "2"]));

      render(<ChecklistBlock block={defaultBlock} />);

      expect(screen.getByText("2 of 3 complete")).toBeInTheDocument();
    });

    it("uses custom storage key when provided", () => {
      render(<ChecklistBlock block={defaultBlock} storageKey="custom-key" />);

      const firstItem = screen.getByText("Research the company");
      fireEvent.click(firstItem);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "custom-key",
        expect.any(String)
      );
    });

    it("uses block id for default storage key", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const firstItem = screen.getByText("Research the company");
      fireEvent.click(firstItem);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "checklist-checklist-1",
        expect.any(String)
      );
    });
  });

  describe("onComplete callback", () => {
    it("calls onComplete when all required items checked", () => {
      const mockOnComplete = jest.fn();
      render(<ChecklistBlock block={defaultBlock} onComplete={mockOnComplete} />);

      // Check both required items
      const firstItem = screen.getByText("Research the company");
      const secondItem = screen.getByText("Practice common questions");

      fireEvent.click(firstItem);
      expect(mockOnComplete).not.toHaveBeenCalled();

      fireEvent.click(secondItem);
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it("does not call onComplete if optional items unchecked", () => {
      const mockOnComplete = jest.fn();
      render(<ChecklistBlock block={defaultBlock} onComplete={mockOnComplete} />);

      // Check both required items (not the optional one)
      const firstItem = screen.getByText("Research the company");
      const secondItem = screen.getByText("Practice common questions");

      fireEvent.click(firstItem);
      fireEvent.click(secondItem);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it("does not call onComplete twice", () => {
      const mockOnComplete = jest.fn();
      render(<ChecklistBlock block={defaultBlock} onComplete={mockOnComplete} />);

      // Check all items
      const firstItem = screen.getByText("Research the company");
      const secondItem = screen.getByText("Practice common questions");
      const thirdItem = screen.getByText("Prepare your outfit");

      fireEvent.click(firstItem);
      fireEvent.click(secondItem);
      fireEvent.click(thirdItem);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it("shows completion message when all required items done", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const firstItem = screen.getByText("Research the company");
      const secondItem = screen.getByText("Practice common questions");

      fireEvent.click(firstItem);
      fireEvent.click(secondItem);

      expect(screen.getByText("(All required items done!)")).toBeInTheDocument();
    });
  });

  describe("all items required by default", () => {
    it("treats items without required flag as required", () => {
      const blockWithImplicitRequired: ChecklistBlockType = {
        id: "checklist-2",
        type: "checklist",
        items: [
          { id: "1", text: "Item without required flag" },
          { id: "2", text: "Another item" },
        ],
      };

      const mockOnComplete = jest.fn();
      render(
        <ChecklistBlock block={blockWithImplicitRequired} onComplete={mockOnComplete} />
      );

      const firstItem = screen.getByText("Item without required flag");
      const secondItem = screen.getByText("Another item");

      fireEvent.click(firstItem);
      expect(mockOnComplete).not.toHaveBeenCalled();

      fireEvent.click(secondItem);
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe("visual feedback", () => {
    it("shows strikethrough on checked items", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const firstItem = screen.getByText("Research the company");
      fireEvent.click(firstItem);

      expect(firstItem).toHaveClass("line-through");
    });

    it("has progress bar", () => {
      render(<ChecklistBlock block={defaultBlock} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });
  });
});
