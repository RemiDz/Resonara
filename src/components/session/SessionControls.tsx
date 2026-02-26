"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SessionControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
}

/**
 * Floating glass pill controls for the live session view.
 * Auto-fades after 5 seconds of inactivity, reappears on touch/move.
 */
export function SessionControls({ isPaused, onTogglePause, onEnd }: SessionControlsProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetFade = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 5000);
  }, []);

  useEffect(() => {
    resetFade();

    const handleActivity = () => resetFade();
    window.addEventListener("pointermove", handleActivity);
    window.addEventListener("pointerdown", handleActivity);

    return () => {
      window.removeEventListener("pointermove", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetFade]);

  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-50
        glass rounded-full px-6 py-3 flex items-center gap-6
        transition-opacity duration-500
        ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
      onPointerDown={(e) => {
        e.stopPropagation();
        resetFade();
      }}
    >
      {/* Pause / Resume */}
      <button
        onClick={onTogglePause}
        className="text-gold hover:text-gold-light transition-colors p-1"
        aria-label={isPaused ? "Resume session" : "Pause session"}
      >
        {isPaused ? (
          // Play icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          // Pause icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        )}
      </button>

      {/* Divider */}
      <div className="h-6 w-px bg-gold/20" />

      {/* End session */}
      <button
        onClick={onEnd}
        className="text-gold hover:text-gold-light transition-colors p-1"
        aria-label="End session"
      >
        {/* Stop icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
    </div>
  );
}
