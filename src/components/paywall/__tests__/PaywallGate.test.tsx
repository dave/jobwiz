import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PaywallGate, type PaywallTrackEvent } from "../PaywallGate";
import * as unlockState from "../unlock-state";

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

describe("PaywallGate", () => {
  const defaultProps = {
    journeyId: "test-journey",
    price: 199,
    children: <div data-testid="protected-content">Protected Content</div>,
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders gate with CTA", () => {
      render(<PaywallGate {...defaultProps} />);

      expect(screen.getByRole("button", { name: /unlock now/i })).toBeInTheDocument();
      expect(screen.getByText("Unlock Premium Content")).toBeInTheDocument();
    });

    it("shows price", () => {
      render(<PaywallGate {...defaultProps} />);

      expect(screen.getByTestId("price")).toHaveTextContent("$199");
    });

    it("shows custom heading and description", () => {
      render(
        <PaywallGate
          {...defaultProps}
          heading="Get Full Access"
          description="Premium content awaits"
        />
      );

      expect(screen.getByText("Get Full Access")).toBeInTheDocument();
      expect(screen.getByText("Premium content awaits")).toBeInTheDocument();
    });

    it("shows custom CTA text", () => {
      render(<PaywallGate {...defaultProps} ctaText="Buy Now" />);

      expect(screen.getByRole("button")).toHaveTextContent("Buy Now - $199");
    });

    it("hides protected content by default (hard variant)", () => {
      render(<PaywallGate {...defaultProps} variant="hard" />);

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("shows demo mode indicator in mock mode", () => {
      render(<PaywallGate {...defaultProps} mockMode={true} />);

      expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    });

    it("hides demo mode indicator when not in mock mode", () => {
      render(<PaywallGate {...defaultProps} mockMode={false} />);

      expect(screen.queryByText(/demo mode/i)).not.toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("soft variant shows blurred preview", () => {
      render(<PaywallGate {...defaultProps} variant="soft" />);

      expect(screen.getByTestId("blurred-preview")).toBeInTheDocument();
    });

    it("hard variant does not show blurred preview", () => {
      render(<PaywallGate {...defaultProps} variant="hard" />);

      expect(screen.queryByTestId("blurred-preview")).not.toBeInTheDocument();
    });

    it("teaser variant shows teaser content", () => {
      render(
        <PaywallGate
          {...defaultProps}
          variant="teaser"
          teaserContent={<p data-testid="teaser">This is a teaser...</p>}
        />
      );

      expect(screen.getByTestId("teaser")).toBeInTheDocument();
    });
  });

  describe("mock mode", () => {
    it("clicking CTA calls onUnlock in mock mode", async () => {
      const mockOnUnlock = jest.fn();
      render(<PaywallGate {...defaultProps} mockMode={true} onUnlock={mockOnUnlock} />);

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(mockOnUnlock).toHaveBeenCalledTimes(1);
      });
    });

    it("stores unlock state in localStorage in mock mode", async () => {
      render(<PaywallGate {...defaultProps} mockMode={true} />);

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "paywall-unlock-test-journey",
          "true"
        );
      });
    });

    it("shows content after mock purchase", async () => {
      render(<PaywallGate {...defaultProps} mockMode={true} />);

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
    });

    it("shows loading state during mock purchase", async () => {
      render(<PaywallGate {...defaultProps} mockMode={true} />);

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      expect(screen.getByText("Processing...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
      });
    });
  });

  describe("real purchase mode", () => {
    it("does not call onPurchase in mock mode", async () => {
      const mockOnPurchase = jest.fn().mockResolvedValue(true);
      render(
        <PaywallGate {...defaultProps} mockMode={true} onPurchase={mockOnPurchase} />
      );

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });

      expect(mockOnPurchase).not.toHaveBeenCalled();
    });

    it("calls onPurchase when not in mock mode", async () => {
      const mockOnPurchase = jest.fn().mockResolvedValue(true);
      render(
        <PaywallGate {...defaultProps} mockMode={false} onPurchase={mockOnPurchase} />
      );

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(mockOnPurchase).toHaveBeenCalledTimes(1);
      });
    });

    it("unlocks content when onPurchase returns true", async () => {
      const mockOnPurchase = jest.fn().mockResolvedValue(true);
      render(
        <PaywallGate {...defaultProps} mockMode={false} onPurchase={mockOnPurchase} />
      );

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
    });

    it("does not unlock content when onPurchase returns false", async () => {
      const mockOnPurchase = jest.fn().mockResolvedValue(false);
      render(
        <PaywallGate {...defaultProps} mockMode={false} onPurchase={mockOnPurchase} />
      );

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(mockOnPurchase).toHaveBeenCalled();
      });

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("analytics tracking", () => {
    it("tracks paywall impression on mount", () => {
      const mockOnTrack = jest.fn();
      render(<PaywallGate {...defaultProps} onTrack={mockOnTrack} />);

      expect(mockOnTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "paywall_impression",
          journeyId: "test-journey",
          variant: "hard",
          price: 199,
        })
      );
    });

    it("tracks CTA click", async () => {
      const mockOnTrack = jest.fn();
      render(<PaywallGate {...defaultProps} onTrack={mockOnTrack} />);

      mockOnTrack.mockClear(); // Clear the impression tracking

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      expect(mockOnTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "paywall_cta_click",
          journeyId: "test-journey",
          variant: "hard",
          price: 199,
        })
      );
    });

    it("tracks unlock event", async () => {
      const mockOnTrack = jest.fn();
      render(<PaywallGate {...defaultProps} mockMode={true} onTrack={mockOnTrack} />);

      const ctaButton = screen.getByRole("button", { name: /unlock now/i });
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(mockOnTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: "paywall_unlock",
          })
        );
      });
    });

    it("tracks variant in analytics events", () => {
      const mockOnTrack = jest.fn();
      render(<PaywallGate {...defaultProps} variant="soft" onTrack={mockOnTrack} />);

      expect(mockOnTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "paywall_impression",
          variant: "soft",
        })
      );
    });

    it("only tracks impression once", () => {
      const mockOnTrack = jest.fn();
      const { rerender } = render(
        <PaywallGate {...defaultProps} onTrack={mockOnTrack} />
      );

      const impressionCalls = mockOnTrack.mock.calls.filter(
        (call) => call[0].eventType === "paywall_impression"
      );
      expect(impressionCalls).toHaveLength(1);

      // Rerender with same props
      rerender(<PaywallGate {...defaultProps} onTrack={mockOnTrack} />);

      const impressionCallsAfter = mockOnTrack.mock.calls.filter(
        (call) => call[0].eventType === "paywall_impression"
      );
      expect(impressionCallsAfter).toHaveLength(1);
    });
  });

  describe("persistence", () => {
    beforeEach(() => {
      // Reset to ensure clean state
      localStorageMock.clear();
      localStorageMock.getItem.mockReset();
    });

    it("shows content if already unlocked in localStorage", () => {
      localStorageMock.getItem.mockReturnValue("true");

      render(<PaywallGate {...defaultProps} />);

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    it("shows paywall if not unlocked in localStorage", () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(<PaywallGate {...defaultProps} />);

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
      expect(screen.getByText("Unlock Premium Content")).toBeInTheDocument();
    });

    it("does not track impression if already unlocked", () => {
      localStorageMock.getItem.mockReturnValue("true");
      const mockOnTrack = jest.fn();

      render(<PaywallGate {...defaultProps} onTrack={mockOnTrack} />);

      expect(mockOnTrack).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      // Ensure content is not unlocked for accessibility tests
      localStorageMock.getItem.mockReturnValue(null);
    });

    it("has accessible button label", () => {
      render(<PaywallGate {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAccessibleName(/unlock now for \$199/i);
    });

    it("has dialog role on paywall overlay", () => {
      render(<PaywallGate {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has labeled heading", () => {
      render(<PaywallGate {...defaultProps} />);

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "Unlock Premium Content"
      );
    });
  });
});

describe("unlock-state", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it("returns correct storage key", () => {
    expect(unlockState.getUnlockStorageKey("my-journey")).toBe(
      "paywall-unlock-my-journey"
    );
  });

  it("isUnlocked returns false when not set", () => {
    localStorageMock.getItem.mockReturnValue(null);
    expect(unlockState.isUnlocked("test-journey")).toBe(false);
  });

  it("isUnlocked returns true when set to true", () => {
    localStorageMock.getItem.mockReturnValue("true");
    expect(unlockState.isUnlocked("test-journey")).toBe(true);
  });

  it("setUnlocked stores true in localStorage", () => {
    unlockState.setUnlocked("test-journey", true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "paywall-unlock-test-journey",
      "true"
    );
  });

  it("setUnlocked removes from localStorage when false", () => {
    unlockState.setUnlocked("test-journey", false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "paywall-unlock-test-journey"
    );
  });

  it("clearUnlock removes unlock state", () => {
    unlockState.clearUnlock("test-journey");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "paywall-unlock-test-journey"
    );
  });
});
