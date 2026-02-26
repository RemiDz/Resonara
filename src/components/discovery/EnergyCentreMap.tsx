"use client";

import type { EnergyCentreKey } from "@/hooks/useFFT";

interface EnergyCentreMapProps {
  /** Coverage values 0–1 per energy centre. */
  coverage: Record<EnergyCentreKey, number>;
  /** Compact mode shows initials only. */
  compact?: boolean;
  className?: string;
}

const CENTRES: Array<{
  key: EnergyCentreKey;
  label: string;
  initial: string;
  colour: string;
}> = [
  { key: "root",        label: "Root",         initial: "R", colour: "#FF4444" },
  { key: "sacral",      label: "Sacral",       initial: "S", colour: "#FF8844" },
  { key: "solarPlexus", label: "Solar Plexus", initial: "SP", colour: "#FFDD44" },
  { key: "heart",       label: "Heart",        initial: "H", colour: "#44DD88" },
  { key: "throat",      label: "Throat",       initial: "T", colour: "#44BBFF" },
  { key: "thirdEye",    label: "Third Eye",    initial: "TE", colour: "#7B2FBE" },
  { key: "crown",       label: "Crown",        initial: "C", colour: "#D4A843" },
];

/**
 * Horizontal row of 7 coloured circles showing which energy centres
 * an instrument activates. Coverage 0–1 maps to opacity + scale.
 */
export function EnergyCentreMap({
  coverage,
  compact = false,
  className = "",
}: EnergyCentreMapProps) {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {CENTRES.map(({ key, label, initial, colour }) => {
        const value = coverage[key] ?? 0;
        const opacity = 0.15 + value * 0.85;
        const scale = 0.7 + value * 0.3;

        return (
          <div
            key={key}
            className="flex flex-col items-center gap-0.5"
            title={`${label}: ${Math.round(value * 100)}%`}
          >
            <div
              className="flex items-center justify-center rounded-full transition-all duration-500"
              style={{
                width: compact ? 24 : 32,
                height: compact ? 24 : 32,
                backgroundColor: colour,
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              <span
                className="font-bold text-white"
                style={{ fontSize: compact ? 8 : 10 }}
              >
                {compact ? initial : initial}
              </span>
            </div>
            {!compact && (
              <span className="text-[8px] text-foreground-muted/60 leading-none">
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
