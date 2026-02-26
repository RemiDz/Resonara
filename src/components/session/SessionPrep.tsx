"use client";

import { useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";
import {
  INTENTION_LIST,
  recommendInstruments,
  positioningAdvice,
  type Intention,
} from "@/lib/analysis/intentionEngine";

interface SessionPrepProps {
  roomId: string;
  onStart: (intention: Intention) => void;
  onBack: () => void;
}

export function SessionPrep({ roomId, onStart, onBack }: SessionPrepProps) {
  const { room, isLoading, error } = useRoom(roomId);
  const [selected, setSelected] = useState<Intention | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <MandalaCanvas width={200} height={200} active />
        <p className="mt-6 text-sm text-foreground-muted/60 animate-pulse">
          Preparing session&hellip;
        </p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <GlassPanel className="max-w-md w-full text-center">
          <p className="mb-4 text-foreground-muted/80">{error ?? "Room not found."}</p>
          <GoldButton variant="secondary" onClick={onBack}>
            Go Back
          </GoldButton>
        </GlassPanel>
      </div>
    );
  }

  const recommendations = selected
    ? recommendInstruments(selected, room.instrumentProfiles)
    : [];
  const advice = selected ? positioningAdvice(selected) : "";

  return (
    <div className="min-h-screen px-4 py-8 animate-fade-in">
      <div className="mx-auto max-w-md flex flex-col gap-6">
        {/* Room header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gold">{room.name}</h1>
          <p className="mt-1 text-xs text-foreground-muted/50">
            Session Preparation
          </p>
        </div>

        {/* Intention selector */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground-muted/70 text-center">
            Choose your intention
          </h2>
          {INTENTION_LIST.map(({ key, label, description }) => {
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`
                  glass rounded-xl px-5 py-4 text-left transition-all duration-300
                  ${isSelected
                    ? "ring-2 ring-gold shadow-[0_0_20px_rgba(212,168,67,0.2)]"
                    : "hover:bg-gold/5"
                  }
                `}
              >
                <p className={`font-medium ${isSelected ? "text-gold" : "text-foreground"}`}>
                  {label}
                </p>
                <p className="mt-1 text-xs text-foreground-muted/60">{description}</p>
              </button>
            );
          })}
        </div>

        {/* Recommendations — shown once an intention is selected */}
        {selected && recommendations.length > 0 && (
          <GlassPanel className="animate-fade-in">
            <h3 className="text-sm font-medium text-gold mb-3">
              Recommended Instruments
            </h3>
            <div className="flex flex-col gap-2">
              {recommendations.slice(0, 5).map(({ profile, reason }) => (
                <div key={profile.instrumentId} className="flex items-start gap-3">
                  <span className="mt-0.5 block h-2 w-2 rounded-full bg-gold/60 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground/90">
                      {profile.instrumentId}
                    </p>
                    <p className="text-xs text-foreground-muted/50">{reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}

        {/* Positioning advice */}
        {selected && (
          <GlassPanel className="animate-fade-in">
            <h3 className="text-sm font-medium text-gold mb-2">
              Positioning Advice
            </h3>
            <p className="text-xs text-foreground-muted/70 leading-relaxed">
              {advice}
            </p>
          </GlassPanel>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-8">
          <GoldButton
            disabled={!selected}
            onClick={() => selected && onStart(selected)}
          >
            Begin Session
          </GoldButton>
          <GoldButton variant="ghost" onClick={onBack}>
            Back to Dashboard
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
