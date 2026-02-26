"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { InstrumentProfileCard } from "@/components/discovery/InstrumentProfileCard";
import { getInstrumentById } from "@/lib/data/instruments";
import { frequencyToNote } from "@/lib/audio/noteMapper";
import type { InstrumentProfile } from "@/lib/analysis/compatibilityScorer";

interface InstrumentShelfProps {
  profiles: InstrumentProfile[];
}

/**
 * Horizontal scrollable row of compact instrument cards.
 * Tap a card to expand the full InstrumentProfileCard below.
 */
export function InstrumentShelf({ profiles }: InstrumentShelfProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (profiles.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground-muted/60 uppercase tracking-wider">
        Instrument Profiles
      </h3>

      {/* Scrollable shelf */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scroll-pl-1">
        {profiles.map((profile, i) => {
          const instrument = getInstrumentById(profile.instrumentId);
          const note = frequencyToNote(profile.fundamental);
          const isExpanded = expandedIndex === i;

          return (
            <button
              key={`${profile.instrumentId}-${profile.timestamp}`}
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
              className={`
                snap-start flex-shrink-0 glass rounded-xl px-4 py-3
                flex items-center gap-3 transition-all duration-300
                ${isExpanded ? "ring-1 ring-gold/40" : "hover:ring-1 hover:ring-gold/20"}
              `}
              style={{ minWidth: 160 }}
            >
              <span className="text-2xl">{instrument?.icon ?? "🎵"}</span>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground-muted">
                  {instrument?.name ?? "Unknown"}
                </p>
                <p className="text-xs text-gold">{note.name}</p>
              </div>
              <ScoreDisplay
                score={profile.compatibilityScore}
                label=""
                size="sm"
                className="ml-auto"
              />
            </button>
          );
        })}
      </div>

      {/* Expanded detail card */}
      {expandedIndex !== null && profiles[expandedIndex] && (
        <div className="mt-4 animate-fade-in">
          <InstrumentProfileCard profile={profiles[expandedIndex]} />
        </div>
      )}
    </div>
  );
}
