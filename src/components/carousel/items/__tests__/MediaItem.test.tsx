import { render, screen, fireEvent, act } from "@testing-library/react";
import { MediaItem, type MediaItemVariant } from "../MediaItem";
import type { VideoBlock, AudioBlock, ImageBlock, InfographicBlock, TextBlock } from "@/types/module";

// Mock window.postMessage for video APIs
const mockPostMessage = jest.fn();

describe("MediaItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Video Block", () => {
    const youtubeVideo: VideoBlock = {
      id: "video-1",
      type: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Test Video",
    };

    const vimeoVideo: VideoBlock = {
      id: "video-2",
      type: "video",
      url: "https://vimeo.com/123456789",
      title: "Vimeo Video",
    };

    const youtubeEmbed: VideoBlock = {
      id: "video-3",
      type: "video",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    };

    const shortYoutubeUrl: VideoBlock = {
      id: "video-4",
      type: "video",
      url: "https://youtu.be/dQw4w9WgXcQ",
    };

    it("renders YouTube video with iframe", () => {
      render(<MediaItem block={youtubeVideo} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1"
      );
    });

    it("renders Vimeo video with iframe", () => {
      render(<MediaItem block={vimeoVideo} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "https://player.vimeo.com/video/123456789?api=1"
      );
    });

    it("parses YouTube embed URL correctly", () => {
      render(<MediaItem block={youtubeEmbed} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute(
        "src",
        "https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1"
      );
    });

    it("parses short YouTube URL correctly", () => {
      render(<MediaItem block={shortYoutubeUrl} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute(
        "src",
        "https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1"
      );
    });

    it("renders video title", () => {
      render(<MediaItem block={youtubeVideo} />);
      expect(screen.getByText("Test Video")).toBeInTheDocument();
    });

    it("uses title for accessibility", () => {
      render(<MediaItem block={youtubeVideo} />);
      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("title", "Test Video");
    });

    it("shows error for invalid video URL", () => {
      const invalidVideo: VideoBlock = {
        id: "video-invalid",
        type: "video",
        url: "https://invalid-url.com/video",
      };
      render(<MediaItem block={invalidVideo} />);
      expect(screen.getByText("Invalid or unsupported video URL")).toBeInTheDocument();
    });

    it("has rounded styling", () => {
      render(<MediaItem block={youtubeVideo} />);
      const container = document.querySelector(".rounded-2xl");
      expect(container).toBeInTheDocument();
    });

    it("maintains aspect ratio", () => {
      render(<MediaItem block={youtubeVideo} />);
      const container = document.querySelector(".aspect-video");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Audio Block", () => {
    const audioBlock: AudioBlock = {
      id: "audio-1",
      type: "audio",
      url: "https://example.com/audio.mp3",
      title: "Test Audio",
    };

    it("renders audio element", () => {
      render(<MediaItem block={audioBlock} />);
      const audio = document.querySelector("audio");
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute("src", "https://example.com/audio.mp3");
    });

    it("renders audio title", () => {
      render(<MediaItem block={audioBlock} />);
      expect(screen.getByText("Test Audio")).toBeInTheDocument();
    });

    it("renders play/pause button", () => {
      render(<MediaItem block={audioBlock} />);
      expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    });

    it("renders playback speed button", () => {
      render(<MediaItem block={audioBlock} />);
      expect(screen.getByRole("button", { name: /Playback speed: 1x/i })).toBeInTheDocument();
    });

    it("renders seek slider", () => {
      render(<MediaItem block={audioBlock} />);
      expect(screen.getByRole("slider", { name: "Seek audio" })).toBeInTheDocument();
    });

    it("displays time as 0:00 initially", () => {
      render(<MediaItem block={audioBlock} />);
      expect(screen.getAllByText("0:00")).toHaveLength(2); // Current and duration
    });

    it("cycles through playback speeds", () => {
      render(<MediaItem block={audioBlock} />);
      const speedButton = screen.getByRole("button", { name: /Playback speed: 1x/i });

      fireEvent.click(speedButton);
      expect(screen.getByText("1.5x")).toBeInTheDocument();

      fireEvent.click(speedButton);
      expect(screen.getByText("2x")).toBeInTheDocument();

      fireEvent.click(speedButton);
      expect(screen.getByText("0.5x")).toBeInTheDocument();

      fireEvent.click(speedButton);
      expect(screen.getByText("1x")).toBeInTheDocument();
    });

    it("has large centered play button", () => {
      const { container } = render(<MediaItem block={audioBlock} />);
      const playButton = screen.getByRole("button", { name: "Play" });
      expect(playButton).toHaveClass("w-20", "h-20", "rounded-full");
    });
  });

  describe("Image Block", () => {
    const imageBlock: ImageBlock = {
      id: "image-1",
      type: "image",
      url: "https://example.com/image.jpg",
      alt: "Test Image",
      caption: "This is a test image",
    };

    it("renders image", () => {
      render(<MediaItem block={imageBlock} />);
      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
      expect(img).toHaveAttribute("alt", "Test Image");
    });

    it("renders caption", () => {
      render(<MediaItem block={imageBlock} />);
      expect(screen.getByText("This is a test image")).toBeInTheDocument();
    });

    it("has zoom button", () => {
      render(<MediaItem block={imageBlock} />);
      expect(
        screen.getByRole("button", { name: "View Test Image in full size" })
      ).toBeInTheDocument();
    });

    it("opens zoom modal on click", () => {
      render(<MediaItem block={imageBlock} />);
      const zoomButton = screen.getByRole("button", {
        name: "View Test Image in full size",
      });
      fireEvent.click(zoomButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("closes zoom modal on close button click", () => {
      render(<MediaItem block={imageBlock} />);
      const zoomButton = screen.getByRole("button", {
        name: "View Test Image in full size",
      });
      fireEvent.click(zoomButton);

      const closeButton = screen.getByRole("button", { name: "Close zoom view" });
      fireEvent.click(closeButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes zoom modal on Escape key", () => {
      render(<MediaItem block={imageBlock} />);
      const zoomButton = screen.getByRole("button", {
        name: "View Test Image in full size",
      });
      fireEvent.click(zoomButton);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("calls onComplete when rendered", () => {
      const onComplete = jest.fn();
      render(<MediaItem block={imageBlock} onComplete={onComplete} />);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("renders without caption", () => {
      const imageWithoutCaption: ImageBlock = {
        id: "image-2",
        type: "image",
        url: "https://example.com/image.jpg",
        alt: "Test Image",
      };
      render(<MediaItem block={imageWithoutCaption} />);
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  describe("Infographic Block", () => {
    const infographicBlock: InfographicBlock = {
      id: "infographic-1",
      type: "infographic",
      url: "https://example.com/infographic.png",
      alt: "Process Infographic",
      caption: "Our process explained",
    };

    it("renders like an image", () => {
      render(<MediaItem block={infographicBlock} />);
      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("alt", "Process Infographic");
    });

    it("has zoom capability", () => {
      render(<MediaItem block={infographicBlock} />);
      expect(
        screen.getByRole("button", { name: /View Process Infographic/i })
      ).toBeInTheDocument();
    });

    it("renders caption", () => {
      render(<MediaItem block={infographicBlock} />);
      expect(screen.getByText("Our process explained")).toBeInTheDocument();
    });
  });

  describe("Unsupported Media", () => {
    it("shows error for unsupported type", () => {
      // Using a text block to simulate unsupported type
      const unsupportedBlock: TextBlock = {
        id: "unsupported-1",
        type: "text",
        content: "This is text",
      };
      render(<MediaItem block={unsupportedBlock as unknown as VideoBlock} />);
      expect(screen.getByText(/Unsupported media type/)).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    const videoBlock: VideoBlock = {
      id: "video-1",
      type: "video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };

    it("uses min-height for vertical centering", () => {
      const { container } = render(<MediaItem block={videoBlock} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("min-h-[50vh]");
    });

    it("centers content", () => {
      const { container } = render(<MediaItem block={videoBlock} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <MediaItem block={videoBlock} className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("limits max width", () => {
      const { container } = render(<MediaItem block={videoBlock} />);
      const innerWrapper = container.querySelector(".max-w-4xl");
      expect(innerWrapper).toBeInTheDocument();
    });
  });

  describe("Image Error Handling", () => {
    it("shows error state when image fails to load", () => {
      const imageBlock: ImageBlock = {
        id: "image-error",
        type: "image",
        url: "https://example.com/broken.jpg",
        alt: "Broken Image",
      };

      render(<MediaItem block={imageBlock} />);
      const img = screen.getByRole("img");

      // Simulate error
      fireEvent.error(img);

      expect(screen.getByText("Unable to load image")).toBeInTheDocument();
    });
  });

  describe("Big Question Variant", () => {
    describe("Video - big-question", () => {
      const youtubeVideo: VideoBlock = {
        id: "video-bq-1",
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Big Question Video",
      };

      it("adds data-variant attribute", () => {
        const { container } = render(
          <MediaItem block={youtubeVideo} variant="big-question" />
        );
        const wrapper = container.querySelector('[data-variant="big-question"]');
        expect(wrapper).toBeInTheDocument();
      });

      it("uses larger minimum height", () => {
        const { container } = render(
          <MediaItem block={youtubeVideo} variant="big-question" />
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass("min-h-[60vh]");
      });

      it("uses larger max-width", () => {
        const { container } = render(
          <MediaItem block={youtubeVideo} variant="big-question" />
        );
        const innerWrapper = container.querySelector(".max-w-5xl");
        expect(innerWrapper).toBeInTheDocument();
      });

      it("has larger title text", () => {
        render(<MediaItem block={youtubeVideo} variant="big-question" />);
        const title = screen.getByText("Big Question Video");
        expect(title).toHaveClass("lg:text-4xl");
      });

      it("has larger border radius", () => {
        const { container } = render(
          <MediaItem block={youtubeVideo} variant="big-question" />
        );
        const videoContainer = container.querySelector(".rounded-3xl");
        expect(videoContainer).toBeInTheDocument();
      });

      it("still renders iframe correctly", () => {
        render(<MediaItem block={youtubeVideo} variant="big-question" />);
        const iframe = document.querySelector("iframe");
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute(
          "src",
          "https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1"
        );
      });
    });

    describe("Audio - big-question", () => {
      const audioBlock: AudioBlock = {
        id: "audio-bq-1",
        type: "audio",
        url: "https://example.com/audio.mp3",
        title: "Big Question Audio",
      };

      it("adds data-variant attribute", () => {
        const { container } = render(
          <MediaItem block={audioBlock} variant="big-question" />
        );
        const wrapper = container.querySelector('[data-variant="big-question"]');
        expect(wrapper).toBeInTheDocument();
      });

      it("uses larger minimum height", () => {
        const { container } = render(
          <MediaItem block={audioBlock} variant="big-question" />
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass("min-h-[60vh]");
      });

      it("has larger play button", () => {
        render(<MediaItem block={audioBlock} variant="big-question" />);
        const playButton = screen.getByRole("button", { name: "Play" });
        expect(playButton).toHaveClass("w-28", "h-28");
      });

      it("has larger title text", () => {
        render(<MediaItem block={audioBlock} variant="big-question" />);
        const title = screen.getByText("Big Question Audio");
        expect(title).toHaveClass("lg:text-5xl");
      });

      it("has thicker seek bar", () => {
        const { container } = render(
          <MediaItem block={audioBlock} variant="big-question" />
        );
        const seekBar = screen.getByRole("slider", { name: "Seek audio" });
        expect(seekBar).toHaveClass("h-4");
      });

      it("has larger playback speed button", () => {
        render(<MediaItem block={audioBlock} variant="big-question" />);
        const speedButton = screen.getByRole("button", { name: /Playback speed: 1x/i });
        expect(speedButton).toHaveClass("px-6", "py-3", "text-lg");
      });

      it("still plays audio correctly", () => {
        render(<MediaItem block={audioBlock} variant="big-question" />);
        const audio = document.querySelector("audio");
        expect(audio).toBeInTheDocument();
        expect(audio).toHaveAttribute("src", "https://example.com/audio.mp3");
      });
    });

    describe("Image - big-question", () => {
      const imageBlock: ImageBlock = {
        id: "image-bq-1",
        type: "image",
        url: "https://example.com/image.jpg",
        alt: "Big Question Image",
        caption: "A dramatic image",
      };

      it("adds data-variant attribute", () => {
        const { container } = render(
          <MediaItem block={imageBlock} variant="big-question" />
        );
        const wrapper = container.querySelector('[data-variant="big-question"]');
        expect(wrapper).toBeInTheDocument();
      });

      it("uses larger minimum height", () => {
        const { container } = render(
          <MediaItem block={imageBlock} variant="big-question" />
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass("min-h-[60vh]");
      });

      it("uses larger max-width", () => {
        const { container } = render(
          <MediaItem block={imageBlock} variant="big-question" />
        );
        const figure = container.querySelector(".max-w-5xl");
        expect(figure).toBeInTheDocument();
      });

      it("has larger border radius", () => {
        const { container } = render(
          <MediaItem block={imageBlock} variant="big-question" />
        );
        const imageButton = container.querySelector(".rounded-3xl");
        expect(imageButton).toBeInTheDocument();
      });

      it("has larger zoom icon", () => {
        const { container } = render(
          <MediaItem block={imageBlock} variant="big-question" />
        );
        const zoomIcon = container.querySelector(".h-8.w-8");
        expect(zoomIcon).toBeInTheDocument();
      });

      it("has larger caption text", () => {
        render(<MediaItem block={imageBlock} variant="big-question" />);
        const caption = screen.getByText("A dramatic image");
        expect(caption).toHaveClass("text-xl");
      });

      it("constrains image height", () => {
        render(<MediaItem block={imageBlock} variant="big-question" />);
        const img = screen.getByRole("img");
        expect(img).toHaveClass("max-h-[60vh]");
      });

      it("still opens zoom modal on click", () => {
        render(<MediaItem block={imageBlock} variant="big-question" />);
        const zoomButton = screen.getByRole("button", {
          name: "View Big Question Image in full size",
        });
        fireEvent.click(zoomButton);

        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    describe("Infographic - big-question", () => {
      const infographicBlock: InfographicBlock = {
        id: "infographic-bq-1",
        type: "infographic",
        url: "https://example.com/infographic.png",
        alt: "Big Question Infographic",
        caption: "Process diagram",
      };

      it("applies big-question styles like image", () => {
        const { container } = render(
          <MediaItem block={infographicBlock} variant="big-question" />
        );
        const wrapper = container.querySelector('[data-variant="big-question"]');
        expect(wrapper).toBeInTheDocument();
      });

      it("uses larger max-width", () => {
        const { container } = render(
          <MediaItem block={infographicBlock} variant="big-question" />
        );
        const figure = container.querySelector(".max-w-5xl");
        expect(figure).toBeInTheDocument();
      });
    });

    describe("Unsupported - big-question", () => {
      it("applies big-question styles to error state", () => {
        const unsupportedBlock: TextBlock = {
          id: "unsupported-bq-1",
          type: "text",
          content: "This is text",
        };
        const { container } = render(
          <MediaItem block={unsupportedBlock as unknown as VideoBlock} variant="big-question" />
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass("min-h-[60vh]");
      });
    });

    describe("Default variant unchanged", () => {
      const videoBlock: VideoBlock = {
        id: "video-default-1",
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      };

      it("uses default min-height without variant", () => {
        const { container } = render(<MediaItem block={videoBlock} />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass("min-h-[50vh]");
      });

      it("uses default max-width without variant", () => {
        const { container } = render(<MediaItem block={videoBlock} />);
        const innerWrapper = container.querySelector(".max-w-4xl");
        expect(innerWrapper).toBeInTheDocument();
      });

      it("uses default min-height with explicit default variant", () => {
        const { container } = render(
          <MediaItem block={videoBlock} variant="default" />
        );
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass("min-h-[50vh]");
      });
    });
  });
});
