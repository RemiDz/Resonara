"use client";

import { useRef, useEffect, useCallback } from "react";
import type { EnergyCentreKey } from "@/hooks/useFFT";

interface RoomMandalaProps {
  /** Energy centre response levels (0–1 normalised). */
  energyCentres: Record<EnergyCentreKey, number>;
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
 * Static room frequency profile mandala for the dashboard.
 * 7 concentric rings whose radius scales by the room's response in that band.
 * Slow breathing rotation, reduced-saturation chakra colours.
 */
export function RoomMandala({
  energyCentres,
  width = 300,
  height = 300,
  className = "",
}: RoomMandalaProps) {
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

      phaseRef.current = time * 0.00015;

      // Central glow gradient
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.35);
      glow.addColorStop(0, "rgba(212, 168, 67, 0.12)");
      glow.addColorStop(1, "rgba(212, 168, 67, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Draw each energy centre ring — radius scaled by response level
      CENTRE_ORDER.forEach((key, i) => {
        const level = Math.max(0, Math.min(1, energyCentres[key] ?? 0));

        // Base spacing + level-driven expansion
        const baseRadius = maxRadius * 0.15;
        const ringSpacing = (maxRadius - baseRadius) / CENTRE_ORDER.length;
        const ringRadius = baseRadius + ringSpacing * (i + 1) * (0.5 + level * 0.5);

        const colour = CENTRE_COLOURS[key];
        const petals = 6 + i * 2;
        const petalSize = ringRadius * 0.12 * (0.4 + level * 0.6);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(phaseRef.current * (i % 2 === 0 ? 1 : -1));

        // Ring outline — reduced saturation via lower alpha
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = colour;
        ctx.globalAlpha = 0.08 + level * 0.22;
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();

        // Petal arcs
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2;
          const px = Math.cos(angle) * ringRadius;
          const py = Math.sin(angle) * ringRadius;

          ctx.beginPath();
          ctx.arc(px, py, petalSize, 0, Math.PI * 2);
          ctx.fillStyle = colour;
          ctx.globalAlpha = 0.04 + level * 0.15;
          ctx.fill();
        }

        // Connecting radial lines
        if (i < CENTRE_ORDER.length - 1) {
          const nextLevel = Math.max(0, Math.min(1, energyCentres[CENTRE_ORDER[i + 1]] ?? 0));
          const nextRadius =
            baseRadius + ringSpacing * (i + 2) * (0.5 + nextLevel * 0.5);

          for (let r = 0; r < petals; r++) {
            const angle = (r / petals) * Math.PI * 2 + phaseRef.current * 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius);
            ctx.lineTo(Math.cos(angle) * nextRadius, Math.sin(angle) * nextRadius);
            ctx.strokeStyle = colour;
            ctx.globalAlpha = 0.02 + level * 0.06;
            ctx.lineWidth = 0.5 * dpr;
            ctx.stroke();
          }
        }

        ctx.restore();
      });
    },
    [energyCentres, width, height],
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
  }, [draw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`block ${className}`}
      style={{ width, height }}
    />
  );
}
