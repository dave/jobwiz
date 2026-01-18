import { render, screen, fireEvent, act } from "@testing-library/react";
import { AudioBlock } from "../AudioBlock";
import type { AudioBlock as AudioBlockType } from "@/types/module";

// Mock HTMLMediaElement methods
beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: jest.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: jest.fn(),
  });
});

describe("AudioBlock", () => {
  const defaultBlock: AudioBlockType = {
    id: "1",
    type: "audio",
    url: "https://example.com/audio.mp3",
    title: "Test Audio",
  };

  it("renders play button initially", () => {
    render(<AudioBlock block={defaultBlock} />);
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
  });

  it("renders audio title when provided", () => {
    render(<AudioBlock block={defaultBlock} />);
    expect(screen.getByText("Test Audio")).toBeInTheDocument();
  });

  it("displays time in mm:ss format", () => {
    render(<AudioBlock block={defaultBlock} />);
    // Initial time should be 0:00 (appears twice: current and total)
    const timeDisplays = screen.getAllByText("0:00");
    expect(timeDisplays.length).toBeGreaterThanOrEqual(1);
  });

  it("toggles to pause when playing", async () => {
    render(<AudioBlock block={defaultBlock} />);
    const playButton = screen.getByLabelText("Play");

    await act(async () => {
      fireEvent.click(playButton);
    });

    // After click, should trigger play (audio element's play event would toggle state)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("has seek bar with correct attributes", () => {
    render(<AudioBlock block={defaultBlock} />);
    const seekBar = screen.getByLabelText("Seek audio");
    expect(seekBar).toBeInTheDocument();
    expect(seekBar).toHaveAttribute("type", "range");
    expect(seekBar).toHaveAttribute("min", "0");
  });

  it("shows playback speed button", () => {
    render(<AudioBlock block={defaultBlock} />);
    expect(screen.getByText("1x")).toBeInTheDocument();
  });

  it("cycles playback speed on click", () => {
    render(<AudioBlock block={defaultBlock} />);
    const speedButton = screen.getByText("1x");

    fireEvent.click(speedButton);
    expect(screen.getByText("1.5x")).toBeInTheDocument();

    fireEvent.click(speedButton);
    expect(screen.getByText("2x")).toBeInTheDocument();

    fireEvent.click(speedButton);
    expect(screen.getByText("0.5x")).toBeInTheDocument();

    fireEvent.click(speedButton);
    expect(screen.getByText("1x")).toBeInTheDocument();
  });

  it("renders without title", () => {
    const blockNoTitle: AudioBlockType = {
      id: "1",
      type: "audio",
      url: "https://example.com/audio.mp3",
    };

    render(<AudioBlock block={blockNoTitle} />);
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
  });

  it("seek bar updates on change", () => {
    render(<AudioBlock block={defaultBlock} />);
    const seekBar = screen.getByLabelText("Seek audio") as HTMLInputElement;

    fireEvent.change(seekBar, { target: { value: "30" } });
    expect(seekBar.value).toBe("30");
  });

  it("provides accessible speed button label", () => {
    render(<AudioBlock block={defaultBlock} />);
    const speedButton = screen.getByLabelText(
      "Playback speed: 1x. Click to change."
    );
    expect(speedButton).toBeInTheDocument();
  });
});
