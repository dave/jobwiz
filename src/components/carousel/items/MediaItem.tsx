"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  ContentBlock,
  VideoBlock,
  AudioBlock,
  ImageBlock,
  InfographicBlock,
} from "@/types/module";

/** MediaItem display variant */
export type MediaItemVariant = "default" | "big-question";

export interface MediaItemProps {
  /** The media block to render */
  block: ContentBlock;
  /** Called when media is considered complete (80% video, 90% audio, or viewed image) */
  onComplete?: () => void;
  /** Custom class name */
  className?: string;
  /** Display variant (default: "default") */
  variant?: MediaItemVariant;
}

// Video provider types
type VideoProvider = "youtube" | "vimeo" | "unknown";

interface ParsedVideo {
  provider: VideoProvider;
  id: string | null;
}

function parseVideoUrl(url: string): ParsedVideo {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return { provider: "youtube", id: match[1] };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [/vimeo\.com\/(\d+)/, /player\.vimeo\.com\/video\/(\d+)/];

  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return { provider: "vimeo", id: match[1] };
    }
  }

  return { provider: "unknown", id: null };
}

function getEmbedUrl(provider: VideoProvider, id: string): string {
  switch (provider) {
    case "youtube":
      return `https://www.youtube.com/embed/${id}?enablejsapi=1`;
    case "vimeo":
      return `https://player.vimeo.com/video/${id}?api=1`;
    default:
      return "";
  }
}

// Icons
const PlayIcon = () => (
  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const ZoomIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Playback speeds
const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * VideoItem - Carousel video player
 */
function VideoItem({
  block,
  onComplete,
  className,
  variant = "default",
}: {
  block: VideoBlock;
  onComplete?: () => void;
  className?: string;
  variant?: MediaItemVariant;
}) {
  const { url, title } = block;
  const [error, setError] = useState<string | null>(null);
  const hasCompletedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const parsed = parseVideoUrl(url);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // YouTube API messages
      if (event.origin === "https://www.youtube.com") {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data.event === "infoDelivery" && data.info?.currentTime && data.info?.duration) {
            const progress = data.info.currentTime / data.info.duration;
            if (progress >= 0.8 && !hasCompletedRef.current) {
              hasCompletedRef.current = true;
              onComplete?.();
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Vimeo API messages
      if (event.origin === "https://player.vimeo.com") {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data.event === "playProgress" && data.data?.percent) {
            if (data.data.percent >= 0.8 && !hasCompletedRef.current) {
              hasCompletedRef.current = true;
              onComplete?.();
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    },
    [onComplete]
  );

  useEffect(() => {
    if (parsed.provider === "unknown" || !parsed.id) {
      setError("Invalid or unsupported video URL");
      return;
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [parsed.provider, parsed.id, handleMessage]);

  // Initialize YouTube/Vimeo API listeners
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !parsed.id) return;

    const initPlayer = () => {
      if (parsed.provider === "youtube") {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "listening" }),
          "https://www.youtube.com"
        );
      } else if (parsed.provider === "vimeo") {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ method: "addEventListener", value: "playProgress" }),
          "https://player.vimeo.com"
        );
      }
    };

    iframe.addEventListener("load", initPlayer);
    return () => iframe.removeEventListener("load", initPlayer);
  }, [parsed.provider, parsed.id]);

  const isBigQuestion = variant === "big-question";

  if (error || parsed.provider === "unknown" || !parsed.id) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          isBigQuestion ? "min-h-[60vh]" : "min-h-[50vh]",
          "px-4",
          className
        )}
      >
        <div className={cn(
          "w-full aspect-video bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500",
          isBigQuestion ? "max-w-5xl text-xl" : "max-w-4xl text-lg"
        )}>
          <p>{error || "Unable to load video"}</p>
        </div>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(parsed.provider, parsed.id);
  const accessibleTitle = title || `Video from ${parsed.provider}`;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        isBigQuestion ? "min-h-[60vh] px-6 py-12" : "min-h-[50vh] px-4 py-8",
        className
      )}
      data-variant={variant}
    >
      <div className={cn(
        "w-full space-y-4",
        isBigQuestion ? "max-w-5xl space-y-6" : "max-w-4xl"
      )}>
        {title && (
          <h2 className={cn(
            "font-semibold text-gray-900 text-center",
            isBigQuestion ? "text-2xl sm:text-3xl lg:text-4xl" : "text-xl sm:text-2xl"
          )}>
            {title}
          </h2>
        )}
        <div className={cn(
          "relative aspect-video overflow-hidden bg-black",
          isBigQuestion ? "rounded-3xl shadow-2xl" : "rounded-2xl shadow-2xl"
        )}>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={accessibleTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * AudioItem - Carousel audio player
 */
function AudioItem({
  block,
  onComplete,
  className,
  variant = "default",
}: {
  block: AudioBlock;
  onComplete?: () => void;
  className?: string;
  variant?: MediaItemVariant;
}) {
  const { url, title } = block;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [error, setError] = useState<string | null>(null);
  const hasCompletedRef = useRef(false);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setError("Unable to play audio");
      });
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const handleSpeedChange = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex] ?? 1;

    audio.playbackRate = newSpeed;
    setPlaybackSpeed(newSpeed as PlaybackSpeed);
  }, [playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Check for 90% completion
      if (audio.duration > 0) {
        const progress = audio.currentTime / audio.duration;
        if (progress >= 0.9 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
      }
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleError = () => setError("Unable to load audio");

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
    };
  }, [onComplete]);

  const isBigQuestion = variant === "big-question";

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          isBigQuestion ? "min-h-[60vh]" : "min-h-[50vh]",
          "px-4",
          className
        )}
      >
        <div className={cn(
          "w-full bg-gray-100 rounded-2xl p-8 text-center text-gray-500",
          isBigQuestion ? "max-w-3xl text-xl" : "max-w-2xl text-lg"
        )}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        isBigQuestion ? "min-h-[60vh] px-6 py-12" : "min-h-[50vh] px-4 py-8",
        className
      )}
      data-variant={variant}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className={cn(
        "w-full",
        isBigQuestion ? "max-w-3xl space-y-12" : "max-w-2xl space-y-8"
      )}>
        {title && (
          <h2 className={cn(
            "font-semibold text-gray-900 text-center",
            isBigQuestion ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl"
          )}>
            {title}
          </h2>
        )}

        {/* Large centered play button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handlePlayPause}
            className={cn(
              "flex items-center justify-center rounded-full",
              "bg-blue-600 text-white hover:bg-blue-700",
              "focus:outline-none focus:ring-4 focus:ring-blue-300",
              "transition-all duration-200 shadow-lg hover:shadow-xl",
              "transform hover:scale-105",
              isBigQuestion ? "w-28 h-28" : "w-20 h-20"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className={cn(isBigQuestion ? "h-12 w-12" : "h-8 w-8")} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className={cn(isBigQuestion ? "h-12 w-12" : "h-8 w-8")} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Progress and controls */}
        <div className={cn(
          "bg-gray-50 border border-gray-200 rounded-2xl space-y-4",
          isBigQuestion ? "p-8" : "p-6"
        )}>
          {/* Seek Bar */}
          <div className={cn("flex items-center", isBigQuestion ? "gap-6" : "gap-4")}>
            <span className={cn(
              "text-gray-600 text-right tabular-nums font-medium",
              isBigQuestion ? "text-lg w-16" : "text-base w-14"
            )}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className={cn(
                "flex-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600",
                isBigQuestion ? "h-4" : "h-3"
              )}
              aria-label="Seek audio"
              style={{
                background: `linear-gradient(to right, #2563eb ${progress}%, #e5e7eb ${progress}%)`,
              }}
            />
            <span className={cn(
              "text-gray-600 tabular-nums font-medium",
              isBigQuestion ? "text-lg w-16" : "text-base w-14"
            )}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Playback Speed */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSpeedChange}
              className={cn(
                "font-semibold rounded-lg",
                "bg-gray-200 text-gray-700 hover:bg-gray-300",
                "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
                "transition-colors",
                isBigQuestion ? "px-6 py-3 text-lg min-w-[5rem]" : "px-4 py-2 text-base min-w-[4rem]"
              )}
              aria-label={`Playback speed: ${playbackSpeed}x. Click to change.`}
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ImageItem - Carousel image display with zoom
 */
function ImageItem({
  block,
  onComplete,
  className,
  variant = "default",
}: {
  block: ImageBlock | InfographicBlock;
  onComplete?: () => void;
  className?: string;
  variant?: MediaItemVariant;
}) {
  const { url, alt, caption } = block;
  const [isZoomed, setIsZoomed] = useState(false);
  const [error, setError] = useState(false);
  const hasCompletedRef = useRef(false);

  // Mark complete when image is viewed
  useEffect(() => {
    if (!error && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.();
    }
  }, [error, onComplete]);

  const openZoom = useCallback(() => {
    setIsZoomed(true);
  }, []);

  const closeZoom = useCallback(() => {
    setIsZoomed(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isZoomed) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeZoom();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isZoomed, closeZoom]);

  const isBigQuestion = variant === "big-question";

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          isBigQuestion ? "min-h-[60vh]" : "min-h-[50vh]",
          "px-4",
          className
        )}
      >
        <div className={cn(
          "w-full bg-gray-100 rounded-2xl p-12 text-center text-gray-500",
          isBigQuestion ? "max-w-5xl text-xl" : "max-w-4xl text-lg"
        )}>
          <p>Unable to load image</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col items-center justify-center",
          isBigQuestion ? "min-h-[60vh] px-6 py-12" : "min-h-[50vh] px-4 py-8",
          className
        )}
        data-variant={variant}
      >
        <figure className={cn(
          "w-full",
          isBigQuestion ? "max-w-5xl" : "max-w-4xl"
        )}>
          <button
            type="button"
            onClick={openZoom}
            className={cn(
              "relative w-full overflow-hidden",
              "focus:outline-none focus:ring-4 focus:ring-blue-300",
              "cursor-zoom-in group",
              "transition-shadow duration-200",
              isBigQuestion
                ? "rounded-3xl shadow-2xl hover:shadow-[0_25px_50px_-12px_rgb(0,0,0,0.25)]"
                : "rounded-2xl shadow-lg hover:shadow-xl"
            )}
            aria-label={`View ${alt} in full size`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className={cn(
                "w-full h-auto object-contain",
                isBigQuestion && "max-h-[60vh]"
              )}
              onError={() => setError(true)}
            />
            {/* Zoom overlay indicator */}
            <div
              className={cn(
                "absolute inset-0 bg-black/0 group-hover:bg-black/10",
                "flex items-center justify-center",
                "transition-colors duration-200"
              )}
            >
              <span
                className={cn(
                  "rounded-full bg-white/90 text-gray-700",
                  "opacity-0 group-hover:opacity-100",
                  "transition-opacity duration-200 shadow-lg",
                  isBigQuestion ? "p-4" : "p-3"
                )}
              >
                {isBigQuestion ? (
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                ) : (
                  <ZoomIcon />
                )}
              </span>
            </div>
          </button>

          {caption && (
            <figcaption className={cn(
              "text-gray-600 text-center",
              isBigQuestion ? "mt-6 text-xl" : "mt-4 text-lg"
            )}>
              {caption}
            </figcaption>
          )}
        </figure>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeZoom}
          role="dialog"
          aria-modal="true"
          aria-label={`Zoomed view of ${alt}`}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeZoom}
            className={cn(
              "absolute top-4 right-4 p-3 rounded-full z-10",
              "bg-white/10 text-white hover:bg-white/20",
              "focus:outline-none focus:ring-2 focus:ring-white",
              "transition-colors"
            )}
            aria-label="Close zoom view"
          >
            <CloseIcon />
          </button>

          {/* Zoomed image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-full object-contain cursor-zoom-out"
            onClick={(e) => {
              e.stopPropagation();
              closeZoom();
            }}
          />
        </div>
      )}
    </>
  );
}

/**
 * MediaItem - Carousel-optimized media block renderer
 *
 * Renders media content blocks (video, audio, image, infographic)
 * with centered layout, large display, and minimal UI for carousel display.
 *
 * Supports two display variants:
 * - "default": Standard carousel layout with medium controls
 * - "big-question": Full-screen dramatic layout with larger controls and more spacing
 */
export function MediaItem({ block, onComplete, className, variant = "default" }: MediaItemProps) {
  const { type } = block;
  const isBigQuestion = variant === "big-question";

  if (type === "video") {
    return (
      <VideoItem
        block={block as VideoBlock}
        onComplete={onComplete}
        className={className}
        variant={variant}
      />
    );
  }

  if (type === "audio") {
    return (
      <AudioItem
        block={block as AudioBlock}
        onComplete={onComplete}
        className={className}
        variant={variant}
      />
    );
  }

  if (type === "image" || type === "infographic") {
    return (
      <ImageItem
        block={block as ImageBlock | InfographicBlock}
        onComplete={onComplete}
        className={className}
        variant={variant}
      />
    );
  }

  // Unsupported media type
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        isBigQuestion ? "min-h-[60vh]" : "min-h-[50vh]",
        "px-4",
        className
      )}
    >
      <div className={cn(
        "w-full bg-gray-100 rounded-2xl p-8 text-center text-gray-500",
        isBigQuestion ? "max-w-3xl text-xl" : "max-w-2xl text-lg"
      )}>
        <p>Unsupported media type: {type}</p>
      </div>
    </div>
  );
}
