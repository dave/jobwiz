"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { VideoBlock as VideoBlockType } from "@/types/module";
import type { BlockBaseProps } from "./types";

type VideoBlockProps = BlockBaseProps & {
  block: VideoBlockType;
};

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
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

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

export function VideoBlock({ block, onComplete }: VideoBlockProps) {
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
        // Request YouTube to send state updates
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "listening" }),
          "https://www.youtube.com"
        );
      } else if (parsed.provider === "vimeo") {
        // Request Vimeo to send playProgress events
        iframe.contentWindow?.postMessage(
          JSON.stringify({ method: "addEventListener", value: "playProgress" }),
          "https://player.vimeo.com"
        );
      }
    };

    iframe.addEventListener("load", initPlayer);
    return () => iframe.removeEventListener("load", initPlayer);
  }, [parsed.provider, parsed.id]);

  if (error || parsed.provider === "unknown" || !parsed.id) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
        <p>{error || "Unable to load video"}</p>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(parsed.provider, parsed.id);
  const accessibleTitle = title || `Video from ${parsed.provider}`;

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={accessibleTitle}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
