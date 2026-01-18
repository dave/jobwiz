"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { InfographicBlock as InfographicBlockType, ImageBlock as ImageBlockType } from "@/types/module";
import type { BlockBaseProps } from "./types";

type InfographicBlockProps = BlockBaseProps & {
  block: InfographicBlockType | ImageBlockType;
};

const CloseIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ZoomIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
    />
  </svg>
);

export function InfographicBlock({ block }: InfographicBlockProps) {
  const { url, alt, caption } = block;
  const [isZoomed, setIsZoomed] = useState(false);
  const [error, setError] = useState(false);

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
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isZoomed, closeZoom]);

  if (error) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
        <p>Unable to load image</p>
      </div>
    );
  }

  return (
    <>
      {/* Main Image */}
      <figure className="relative group">
        <button
          type="button"
          onClick={openZoom}
          className={cn(
            "relative w-full rounded-lg overflow-hidden",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
            "cursor-zoom-in"
          )}
          aria-label={`View ${alt} in full size`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="w-full h-auto object-contain"
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
                "p-2 rounded-full bg-white/90 text-gray-700",
                "opacity-0 group-hover:opacity-100",
                "transition-opacity duration-200"
              )}
            >
              <ZoomIcon />
            </span>
          </div>
        </button>

        {caption && (
          <figcaption className="mt-2 text-sm text-gray-500 text-center">
            {caption}
          </figcaption>
        )}
      </figure>

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
              "absolute top-4 right-4 p-2 rounded-full",
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
