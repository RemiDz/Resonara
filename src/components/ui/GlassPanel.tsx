"use client";

import { type ReactNode } from "react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function GlassPanel({ children, className = "", glow = false }: GlassPanelProps) {
  return (
    <div
      className={`
        glass rounded-2xl p-6
        ${glow ? "animate-pulse-glow" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
