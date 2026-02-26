"use client";

import type { EnergyCentreKey } from "@/hooks/useFFT";

interface BodyMapProps {
  /** Coverage values 0–1 per energy centre. */
  coverage: Record<EnergyCentreKey, number>;
  /** Currently highlighted zone. */
  activeZone?: EnergyCentreKey | null;
  /** Callback when a zone is tapped. */
  onZoneTap?: (key: EnergyCentreKey) => void;
  width?: number;
  height?: number;
  className?: string;
}

const CENTRE_COLOURS: Record<EnergyCentreKey, string> = {
  root: "#FF4444",
  sacral: "#FF8844",
  solarPlexus: "#FFDD44",
  heart: "#44DD88",
  throat: "#44BBFF",
  thirdEye: "#7B2FBE",
  crown: "#D4A843",
};

const CENTRE_LABELS: Record<EnergyCentreKey, string> = {
  root: "Root",
  sacral: "Sacral",
  solarPlexus: "Solar Plexus",
  heart: "Heart",
  throat: "Throat",
  thirdEye: "Third Eye",
  crown: "Crown",
};

/** Positioned zones on the body silhouette (% of viewBox 200×440). */
const ZONE_POSITIONS: Array<{
  key: EnergyCentreKey;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}> = [
  { key: "crown",       cx: 100, cy: 38,  rx: 18, ry: 14 },
  { key: "thirdEye",    cx: 100, cy: 62,  rx: 14, ry: 10 },
  { key: "throat",      cx: 100, cy: 100, rx: 14, ry: 10 },
  { key: "heart",       cx: 100, cy: 148, rx: 20, ry: 16 },
  { key: "solarPlexus", cx: 100, cy: 190, rx: 18, ry: 14 },
  { key: "sacral",      cx: 100, cy: 226, rx: 18, ry: 14 },
  { key: "root",        cx: 100, cy: 264, rx: 16, ry: 12 },
];

/**
 * SVG human body silhouette with 7 energy centre overlay zones.
 * Zone opacity/glow scales with coverage. Tappable for detail view.
 */
export function BodyMap({
  coverage,
  activeZone = null,
  onZoneTap,
  width = 250,
  height = 400,
  className = "",
}: BodyMapProps) {
  return (
    <svg
      viewBox="0 0 200 440"
      width={width}
      height={height}
      className={`block ${className}`}
      role="img"
      aria-label="Body energy centre map"
    >
      <defs>
        {/* Glow filters for each centre */}
        {ZONE_POSITIONS.map(({ key }) => (
          <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* Abstract gender-neutral body silhouette */}
      <path
        d={[
          // Head
          "M 100 20 C 78 20 70 40 70 55 C 70 72 82 82 100 82 C 118 82 130 72 130 55 C 130 40 122 20 100 20 Z",
          // Neck
          "M 90 82 L 90 100 L 110 100 L 110 82",
          // Torso
          "M 90 100 C 60 105 55 120 55 150 L 55 240 C 55 260 65 270 80 275 L 80 330",
          "M 110 100 C 140 105 145 120 145 150 L 145 240 C 145 260 135 270 120 275 L 120 330",
          // Hips to legs
          "M 80 275 L 75 330 L 70 400 L 65 430 L 85 430 L 90 370 L 100 330",
          "M 120 275 L 125 330 L 130 400 L 135 430 L 115 430 L 110 370 L 100 330",
          // Arms
          "M 55 120 C 40 125 32 145 30 175 L 28 220 L 38 220 L 42 180 L 55 150",
          "M 145 120 C 160 125 168 145 170 175 L 172 220 L 162 220 L 158 180 L 145 150",
        ].join(" ")}
        fill="none"
        stroke="rgba(212, 168, 67, 0.12)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Energy centre zones */}
      {ZONE_POSITIONS.map(({ key, cx, cy, rx, ry }) => {
        const value = coverage[key] ?? 0;
        const isActive = activeZone === key;
        const opacity = 0.1 + value * 0.7;
        const colour = CENTRE_COLOURS[key];

        return (
          <g key={key}>
            {/* Glow ellipse */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx * (1 + value * 0.4)}
              ry={ry * (1 + value * 0.4)}
              fill={colour}
              opacity={opacity * 0.5}
              filter={value > 0.3 ? `url(#glow-${key})` : undefined}
            />
            {/* Core ellipse */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={colour}
              opacity={opacity}
              stroke={isActive ? "#D4A843" : "transparent"}
              strokeWidth={isActive ? 2 : 0}
              className="cursor-pointer transition-opacity duration-300"
              onClick={() => onZoneTap?.(key)}
              role="button"
              aria-label={`${CENTRE_LABELS[key]}: ${Math.round(value * 100)}%`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onZoneTap?.(key);
              }}
            />
            {/* Label */}
            {isActive && (
              <text
                x={cx + rx + 8}
                y={cy + 4}
                fill="#D4A843"
                fontSize="10"
                fontFamily="sans-serif"
              >
                {CENTRE_LABELS[key]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
