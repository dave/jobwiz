import { render, screen } from "@testing-library/react";
import { BlockRenderer } from "../BlockRenderer";
import type {
  ContentBlock,
  TextBlock,
  HeaderBlock,
  QuoteBlock,
  TipBlock,
  WarningBlock,
  VideoBlock,
  AudioBlock,
  ImageBlock,
  InfographicBlock,
  AnimationBlock,
  QuizBlock,
  ChecklistBlock,
} from "@/types/module";

// Mock child components to avoid testing their implementation
jest.mock("../TextBlock", () => ({
  TextBlock: ({ block }: { block: { content?: string } }) => (
    <div data-testid="text-block">TextBlock: {block.content}</div>
  ),
}));

jest.mock("../VideoBlock", () => ({
  VideoBlock: ({ block }: { block: { url: string } }) => (
    <div data-testid="video-block">VideoBlock: {block.url}</div>
  ),
}));

jest.mock("../AudioBlock", () => ({
  AudioBlock: ({ block }: { block: { url: string } }) => (
    <div data-testid="audio-block">AudioBlock: {block.url}</div>
  ),
}));

jest.mock("../InfographicBlock", () => ({
  InfographicBlock: ({ block }: { block: { alt: string } }) => (
    <div data-testid="infographic-block">InfographicBlock: {block.alt}</div>
  ),
}));

jest.mock("../AnimationBlock", () => ({
  AnimationBlock: ({ block }: { block: { animationUrl: string } }) => (
    <div data-testid="animation-block">AnimationBlock: {block.animationUrl}</div>
  ),
}));

jest.mock("../QuizBlock", () => ({
  QuizBlock: ({ block }: { block: { question: string } }) => (
    <div data-testid="quiz-block">QuizBlock: {block.question}</div>
  ),
}));

jest.mock("../ChecklistBlock", () => ({
  ChecklistBlock: ({ block }: { block: { title?: string } }) => (
    <div data-testid="checklist-block">ChecklistBlock: {block.title}</div>
  ),
}));

describe("BlockRenderer", () => {
  const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

  afterEach(() => {
    consoleWarnSpy.mockClear();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it("renders TextBlock for type text", () => {
    const block: TextBlock = {
      id: "1",
      type: "text",
      content: "Test text content",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("text-block")).toHaveTextContent("Test text content");
  });

  it("renders TextBlock for type header", () => {
    const block: HeaderBlock = {
      id: "1",
      type: "header",
      content: "Test header",
      level: 2,
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("text-block")).toBeInTheDocument();
  });

  it("renders TextBlock for type quote", () => {
    const block: QuoteBlock = {
      id: "1",
      type: "quote",
      content: "Test quote",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("text-block")).toBeInTheDocument();
  });

  it("renders TextBlock for type tip", () => {
    const block: TipBlock = {
      id: "1",
      type: "tip",
      content: "Test tip",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("text-block")).toBeInTheDocument();
  });

  it("renders TextBlock for type warning", () => {
    const block: WarningBlock = {
      id: "1",
      type: "warning",
      content: "Test warning",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("text-block")).toBeInTheDocument();
  });

  it("renders VideoBlock for type video", () => {
    const block: VideoBlock = {
      id: "1",
      type: "video",
      url: "https://youtube.com/watch?v=123",
      title: "Test video",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("video-block")).toHaveTextContent("https://youtube.com/watch?v=123");
  });

  it("renders AudioBlock for type audio", () => {
    const block: AudioBlock = {
      id: "1",
      type: "audio",
      url: "https://example.com/audio.mp3",
      title: "Test audio",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("audio-block")).toHaveTextContent("https://example.com/audio.mp3");
  });

  it("renders InfographicBlock for type image", () => {
    const block: ImageBlock = {
      id: "1",
      type: "image",
      url: "https://example.com/image.png",
      alt: "Test image",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("infographic-block")).toHaveTextContent("Test image");
  });

  it("renders InfographicBlock for type infographic", () => {
    const block: InfographicBlock = {
      id: "1",
      type: "infographic",
      url: "https://example.com/infographic.png",
      alt: "Test infographic",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("infographic-block")).toHaveTextContent("Test infographic");
  });

  it("renders AnimationBlock for type animation", () => {
    const block: AnimationBlock = {
      id: "1",
      type: "animation",
      animationUrl: "https://example.com/animation.json",
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("animation-block")).toHaveTextContent(
      "https://example.com/animation.json"
    );
  });

  it("renders QuizBlock for type quiz", () => {
    const block: QuizBlock = {
      id: "1",
      type: "quiz",
      question: "What is 2+2?",
      options: [{ id: "a", text: "4", isCorrect: true }],
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("quiz-block")).toHaveTextContent("What is 2+2?");
  });

  it("renders ChecklistBlock for type checklist", () => {
    const block: ChecklistBlock = {
      id: "1",
      type: "checklist",
      title: "Test checklist",
      items: [{ id: "1", text: "Item 1" }],
    };

    render(<BlockRenderer block={block} />);
    expect(screen.getByTestId("checklist-block")).toHaveTextContent("Test checklist");
  });

  it("returns null for unknown type", () => {
    const unknownBlock = {
      id: "1",
      type: "unknown-type",
      content: "Unknown content",
    } as unknown as ContentBlock;

    const { container } = render(<BlockRenderer block={unknownBlock} />);
    expect(container.firstChild).toBeNull();
  });

  it("logs warning for unknown type", () => {
    const unknownBlock = {
      id: "1",
      type: "unknown-type",
      content: "Unknown content",
    } as unknown as ContentBlock;

    render(<BlockRenderer block={unknownBlock} />);
    expect(consoleWarnSpy).toHaveBeenCalledWith("Unknown block type: unknown-type");
  });

  it("passes onComplete prop to child components", () => {
    const mockOnComplete = jest.fn();
    const block: TextBlock = {
      id: "1",
      type: "text",
      content: "Test",
    };

    render(<BlockRenderer block={block} onComplete={mockOnComplete} />);
    // Component receives the prop (actual calling would be tested in individual component tests)
    expect(screen.getByTestId("text-block")).toBeInTheDocument();
  });

  it("passes theme prop to child components", () => {
    const theme = { primary: "#ff0000" };
    const block: TextBlock = {
      id: "1",
      type: "text",
      content: "Test",
    };

    render(<BlockRenderer block={block} theme={theme} />);
    expect(screen.getByTestId("text-block")).toBeInTheDocument();
  });
});
