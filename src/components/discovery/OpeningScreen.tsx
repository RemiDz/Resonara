"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";

interface OpeningScreenProps {
  onBegin: () => void;
}

export function OpeningScreen({ onBegin }: OpeningScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
      <div className="relative mb-8">
        <MandalaCanvas width={280} height={280} active className="opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gold/20 to-violet/20 animate-breathe" />
        </div>
      </div>

      <GlassPanel className="max-w-md text-center">
        <h1 className="mb-3 text-2xl font-bold text-gold">
          Discover Your Space
        </h1>
        <p className="mb-6 text-foreground-muted leading-relaxed">
          Resonara will listen to your room and reveal its acoustic character.
          The process takes a few minutes and involves ambient listening,
          a clap test, and optional instrument profiling.
        </p>
        <p className="mb-8 text-sm text-foreground-muted/70">
          Find a quiet moment. Close doors and windows if possible.
          Your microphone will be needed — no audio leaves your device.
        </p>
        <GoldButton onClick={onBegin} size="lg" className="w-full">
          Begin Discovery
        </GoldButton>
      </GlassPanel>
    </div>
  );
}
