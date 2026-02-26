"use client";

interface ProgressRingProps {
  /** Progress value from 0 to 1. */
  progress: number;
  /** Size of the ring in pixels. */
  size?: number;
  /** Stroke width in pixels. */
  strokeWidth?: number;
  /** Colour of the progress arc. */
  colour?: string;
  /** Optional label shown in the centre. */
  label?: string;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 4,
  colour = "#D4A843",
  label,
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(212, 168, 67, 0.15)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {label && (
        <span className="absolute text-sm font-medium text-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
