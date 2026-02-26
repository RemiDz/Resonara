"use client";

import { useRef, useEffect, useCallback } from "react";
import type { EnergyCentreKey } from "@/hooks/useFFT";

interface MandalaCanvasProps {
  /** Energy centre levels (dB) — drives the visual. */
  energyCentres?: Partial<Record<EnergyCentreKey, number>>;
  /** Canvas width in CSS pixels. */
  width?: number;
  /** Canvas height in CSS pixels. */
  height?: number;
  /** Whether the animation is active. */
  active?: boolean;
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

const CENTRE_ORDER: EnergyCentreKey[] = [
  "root",
  "sacral",
  "solarPlexus",
  "heart",
  "throat",
  "thirdEye",
  "crown",
];

/**
 * Canvas-based Mandala visualisation responding to audio frequency data.
 * Renders sacred geometry patterns — concentric rings, petal arcs, and
 * radial lines — whose size and opacity map to energy centre levels.
 */
export function MandalaCanvas({
  energyCentres,
  width = 400,
  height = 400,
  active = true,
  className = "",
}: MandalaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = width * dpr;
      const h = height * dpr;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(cx, cy) * 0.9;

      ctx.clearRect(0, 0, w, h);

      // Slow global rotation
      phaseRef.current = time * 0.0002;

      // Draw each energy centre as a ring of sacred geometry
      CENTRE_ORDER.forEach((key, i) => {
        const rawLevel = energyCentres?.[key] ?? -80;
        // Normalise from dB range [-80, 0] to [0, 1]
        const level = Math.max(0, Math.min(1, (rawLevel + 80) / 80));

        const ringRadius = maxRadius * ((i + 1) / (CENTRE_ORDER.length + 1));
        const colour = CENTRE_COLOURS[key];
        const petals = 6 + i * 2; // More petals for higher centres
        const petalSize = ringRadius * 0.15 * (0.3 + level * 0.7);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(phaseRef.current * (i % 2 === 0 ? 1 : -1));

        // Ring outline
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = colour;
        ctx.globalAlpha = 0.1 + level * 0.3;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();

        // Petal arcs
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2;
          const px = Math.cos(angle) * ringRadius;
          const py = Math.sin(angle) * ringRadius;

          ctx.beginPath();
          ctx.arc(px, py, petalSize, 0, Math.PI * 2);
          ctx.fillStyle = colour;
          ctx.globalAlpha = 0.05 + level * 0.2;
          ctx.fill();
        }

        // Radial lines connecting to next ring
        if (i < CENTRE_ORDER.length - 1) {
          const nextRadius = maxRadius * ((i + 2) / (CENTRE_ORDER.length + 1));
          for (let r = 0; r < petals; r++) {
            const angle = (r / petals) * Math.PI * 2 + phaseRef.current * 0.5;
            ctx.beginPath();
            ctx.moveTo(
              Math.cos(angle) * ringRadius,
              Math.sin(angle) * ringRadius
            );
            ctx.lineTo(
              Math.cos(angle) * nextRadius,
              Math.sin(angle) * nextRadius
            );
            ctx.strokeStyle = colour;
            ctx.globalAlpha = 0.03 + level * 0.08;
            ctx.lineWidth = 0.5 * dpr;
            ctx.stroke();
          }
        }

        ctx.restore();
      });

      // Central glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.2);
      gradient.addColorStop(0, "rgba(212, 168, 67, 0.15)");
      gradient.addColorStop(1, "rgba(212, 168, 67, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - maxRadius * 0.2, cy - maxRadius * 0.2, maxRadius * 0.4, maxRadius * 0.4);
    },
    [energyCentres, width, height]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (!active) {
      // Draw once in idle state
      draw(ctx, 0);
      return;
    }

    const loop = (time: number) => {
      draw(ctx, time);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, draw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`block ${className}`}
      style={{ width, height }}
    />
  );
}
