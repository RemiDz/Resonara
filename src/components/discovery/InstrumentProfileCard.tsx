"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { SpectrumCanvas } from "@/components/visualisations/SpectrumCanvas";
import { EnergyCentreMap } from "./EnergyCentreMap";
import { getInstrumentById } from "@/lib/data/instruments";
import { frequencyToNote } from "@/lib/audio/noteMapper";
import type { InstrumentProfile } from "@/lib/analysis/compatibilityScorer";

interface InstrumentProfileCardProps {
  profile: InstrumentProfile;
  /** Show a remove button. */
  onRemove?: () => void;
  className?: string;
}

/**
 * Results card for a single profiled instrument.
 * Shows instrument info, fundamental, score, mini spectrum,
 * energy centre map, and practitioner-friendly summary.
 */
export function InstrumentProfileCard({
  profile,
  onRemove,
  className = "",
}: InstrumentProfileCardProps) {
  const instrument = getInstrumentById(profile.instrumentId);
  const note = frequencyToNote(profile.fundamental);

  return (
    <GlassPanel className={`${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{instrument?.icon ?? "🎵"}</span>
          <h3 className="text-lg font-bold text-gold">
            {instrument?.name ?? "Unknown Instrument"}
          </h3>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-foreground-muted/40 hover:text-foreground-muted transition-colors"
            aria-label="Remove profile"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Metrics row */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-foreground-muted/60">Fundamental</p>
          <p className="text-sm font-bold text-foreground-muted">
            {Math.round(profile.fundamental)} Hz
            <span className="ml-1.5 text-gold">{note.name}</span>
            {note.cents !== 0 && (
              <span className="ml-1 text-xs text-foreground-muted/40">
                {note.cents > 0 ? "+" : ""}{note.cents}¢
              </span>
            )}
          </p>
        </div>
        <ScoreDisplay
          score={profile.compatibilityScore}
          label="Compatibility"
          size="sm"
        />
      </div>

      {/* Mini spectrum */}
      <div className="mb-4 overflow-hidden rounded-lg bg-black/20">
        <SpectrumCanvas
          frequencyData={profile.averagedSpectrum}
          width={300}
          height={80}
          showBands
          animated={false}
          className="w-full"
        />
      </div>

      {/* Energy centre map */}
      <div className="mb-4">
        <EnergyCentreMap coverage={profile.centreCoverage} compact />
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed text-foreground-muted/80 italic">
        {profile.summary}
      </p>
    </GlassPanel>
  );
}
