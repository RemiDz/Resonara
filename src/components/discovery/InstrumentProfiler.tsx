"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";

interface InstrumentProfilerProps {
  onComplete: () => void;
  onBack: () => void;
}

/**
 * Placeholder for the Instrument Profiler phase.
 * Will analyse how specific instruments resonate in the room
 * by having the practitioner play each one briefly.
 */
export function InstrumentProfiler({ onComplete, onBack }: InstrumentProfilerProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
      <GlassPanel className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-violet/20 bg-violet/5">
            <svg
              className="h-10 w-10 text-violet/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-xl font-bold text-gold">Instrument Profiler</h2>
        <p className="mb-4 text-foreground-muted leading-relaxed">
          This feature is coming soon. The Instrument Profiler will analyse how
          your singing bowls, tuning forks, gongs, and other instruments
          resonate within this specific room.
        </p>
        <p className="mb-8 text-sm text-foreground-muted/60">
          You&apos;ll be able to build a personalised instrument shelf showing
          compatibility scores for each instrument in your space.
        </p>

        <div className="flex gap-3">
          <GoldButton variant="ghost" onClick={onBack}>
            Back
          </GoldButton>
          <GoldButton onClick={onComplete} variant="secondary" className="flex-1">
            Skip for Now
          </GoldButton>
        </div>
      </GlassPanel>
    </div>
  );
}
