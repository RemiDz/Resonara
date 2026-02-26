"use client";

interface ScoreDisplayProps {
  /** Score from 0 to 100. */
  score: number;
  /** Label shown below the score. */
  label: string;
  /** Optional sublabel for additional context. */
  sublabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getScoreColour(score: number): string {
  if (score >= 80) return "#D4A843"; // Gold — excellent
  if (score >= 60) return "#9B5BD4"; // Violet — good
  if (score >= 40) return "#7B2FBE"; // Deeper violet — fair
  return "#5A1F8E"; // Dark violet — needs improvement
}

export function ScoreDisplay({
  score,
  label,
  sublabel,
  size = "md",
  className = "",
}: ScoreDisplayProps) {
  const colour = getScoreColour(score);
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const sizeClasses = {
    sm: { ring: 80, stroke: 3, text: "text-xl", label: "text-xs" },
    md: { ring: 120, stroke: 4, text: "text-3xl", label: "text-sm" },
    lg: { ring: 160, stroke: 5, text: "text-5xl", label: "text-base" },
  };

  const s = sizeClasses[size];
  const radius = (s.ring - s.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference * (1 - clampedScore / 100);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg width={s.ring} height={s.ring} className="-rotate-90">
          <circle
            cx={s.ring / 2}
            cy={s.ring / 2}
            r={radius}
            fill="none"
            stroke="rgba(212, 168, 67, 0.1)"
            strokeWidth={s.stroke}
          />
          <circle
            cx={s.ring / 2}
            cy={s.ring / 2}
            r={radius}
            fill="none"
            stroke={colour}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span
          className={`absolute font-bold ${s.text}`}
          style={{ color: colour }}
        >
          {clampedScore}
        </span>
      </div>
      <span className={`${s.label} text-foreground-muted font-medium`}>{label}</span>
      {sublabel && (
        <span className={`${s.label} text-foreground-muted/60`}>{sublabel}</span>
      )}
    </div>
  );
}
