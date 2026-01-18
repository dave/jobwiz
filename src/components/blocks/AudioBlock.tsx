"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { AudioBlock as AudioBlockType } from "@/types/module";
import type { BlockBaseProps } from "./types";

type AudioBlockProps = BlockBaseProps & {
  block: AudioBlockType;
};

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const PlayIcon = () => (
  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

export function AudioBlock({ block, onComplete }: AudioBlockProps) {
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
      audio.play().catch((e) => {
        setError("Unable to play audio");
        console.error("Audio play error:", e);
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

  if (error) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-gray-500 text-center">
        <p>{error}</p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <audio ref={audioRef} src={url} preload="metadata" />

      {title && <h4 className="font-medium text-gray-900 mb-3">{title}</h4>}

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handlePlayPause}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "bg-indigo-600 text-white hover:bg-indigo-700",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
            "transition-colors"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Seek Bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-gray-500 w-12 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
            aria-label="Seek audio"
            style={{
              background: `linear-gradient(to right, #4f46e5 ${progress}%, #e5e7eb ${progress}%)`,
            }}
          />
          <span className="text-sm text-gray-500 w-12 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Speed */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className={cn(
            "px-2 py-1 text-sm font-medium rounded",
            "bg-gray-200 text-gray-700 hover:bg-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
            "transition-colors min-w-[3rem]"
          )}
          aria-label={`Playback speed: ${playbackSpeed}x. Click to change.`}
        >
          {playbackSpeed}x
        </button>
      </div>
    </div>
  );
}
