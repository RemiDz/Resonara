"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";

interface SpatialWalkProps {
  onComplete: () => void;
  onBack: () => void;
}

/**
 * Placeholder for the Spatial Walk phase.
 * Will use device motion sensors to map acoustic variations
 * as the practitioner walks around the room.
 */
export function SpatialWalk({ onComplete, onBack }: SpatialWalkProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
      <GlassPanel className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/20 bg-gold/5">
            <svg
              className="h-10 w-10 text-gold/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-xl font-bold text-gold">Spatial Walk</h2>
        <p className="mb-4 text-foreground-muted leading-relaxed">
          This feature is coming soon. The Spatial Walk will map how sound
          behaves in different areas of your room as you move through the space.
        </p>
        <p className="mb-8 text-sm text-foreground-muted/60">
          Uses device motion sensors and continuous acoustic analysis to build
          a spatial map of your room&apos;s acoustic character.
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
