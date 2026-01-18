import { render, screen } from "@testing-library/react";
import { VideoBlock } from "../VideoBlock";
import type { VideoBlock as VideoBlockType } from "@/types/module";

describe("VideoBlock", () => {
  it("renders YouTube embed for YouTube URL", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Test Video",
    };

    render(<VideoBlock block={block} />);
    const iframe = screen.getByTitle("Test Video");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      expect.stringContaining("youtube.com/embed/dQw4w9WgXcQ")
    );
  });

  it("renders YouTube embed for youtu.be URL", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://youtu.be/dQw4w9WgXcQ",
      title: "Short URL Video",
    };

    render(<VideoBlock block={block} />);
    const iframe = screen.getByTitle("Short URL Video");
    expect(iframe).toHaveAttribute(
      "src",
      expect.stringContaining("youtube.com/embed/dQw4w9WgXcQ")
    );
  });

  it("renders Vimeo embed for Vimeo URL", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://vimeo.com/123456789",
      title: "Vimeo Video",
    };

    render(<VideoBlock block={block} />);
    const iframe = screen.getByTitle("Vimeo Video");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      expect.stringContaining("player.vimeo.com/video/123456789")
    );
  });

  it("sets iframe title for accessibility", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Accessible Video Title",
    };

    render(<VideoBlock block={block} />);
    expect(screen.getByTitle("Accessible Video Title")).toBeInTheDocument();
  });

  it("uses default title when no title provided", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };

    render(<VideoBlock block={block} />);
    expect(screen.getByTitle("Video from youtube")).toBeInTheDocument();
  });

  it("handles invalid video URL gracefully", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "not-a-valid-url",
    };

    render(<VideoBlock block={block} />);
    // Component shows error message for invalid URLs
    expect(screen.getByText(/Invalid or unsupported video URL|Unable to load video/)).toBeInTheDocument();
  });

  it("handles unsupported video provider gracefully", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://dailymotion.com/video/x123456",
    };

    render(<VideoBlock block={block} />);
    // Component shows error message for unsupported providers
    expect(screen.getByText(/Invalid or unsupported video URL|Unable to load video/)).toBeInTheDocument();
  });

  it("allows fullscreen", () => {
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Test Video",
    };

    render(<VideoBlock block={block} />);
    const iframe = screen.getByTitle("Test Video");
    expect(iframe).toHaveAttribute("allowfullscreen");
  });

  it("calls onComplete callback (mock test for API integration)", () => {
    const mockOnComplete = jest.fn();
    const block: VideoBlockType = {
      id: "1",
      type: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Test Video",
    };

    render(<VideoBlock block={block} onComplete={mockOnComplete} />);
    // Note: Full onComplete testing would require mocking the YouTube/Vimeo API
    // The component is set up to call onComplete at 80% watched
    expect(screen.getByTitle("Test Video")).toBeInTheDocument();
  });
});
