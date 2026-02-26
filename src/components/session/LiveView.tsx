"use client";

import { useRef, useEffect, useCallback } from "react";
import { INTENTIONS, type Intention } from "@/lib/analysis/intentionEngine";
import type { FFTData, EnergyCentreKey } from "@/hooks/useFFT";

interface LiveViewProps {
  intention: Intention;
  fftData: FFTData | null;
  isPaused: boolean;
  elapsedSeconds: number;
}

const CENTRE_ORDER: EnergyCentreKey[] = [
  "root", "sacral", "solarPlexus", "heart", "throat", "thirdEye", "crown",
];

const CENTRE_COLOURS: Record<EnergyCentreKey, string> = {
  root: "#FF4444",
  sacral: "#FF8844",
  solarPlexus: "#FFDD44",
  heart: "#44DD88",
  throat: "#44BBFF",
  thirdEye: "#7B2FBE",
  crown: "#D4A843",
};

/** Number of aurora wave layers. */
const LAYER_COUNT = 7;

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/**
 * Full-viewport Canvas 2D aurora visualisation driven by real-time FFT data.
 * Each wave layer maps to a frequency sub-band (energy centre).
 */
export function LiveView({ intention, fftData, isPaused, elapsedSeconds }: LiveViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const levelsRef = useRef<number[]>(new Array(LAYER_COUNT).fill(0));

  const config = INTENTIONS[intention];
  const baseHue = config.colourHue;

  // Smooth levels toward targets
  const updateLevels = useCallback(() => {
    if (!fftData) return;

    const centres = fftData.energyCentres;
    for (let i = 0; i < LAYER_COUNT; i++) {
      const key = CENTRE_ORDER[i];
      const rawDb = centres[key] ?? -80;
      // Normalise dB [-80, 0] → [0, 1]
      const target = Math.max(0, Math.min(1, (rawDb + 80) / 80));
      // Smooth with exponential moving average
      levelsRef.current[i] += (target - levelsRef.current[i]) * 0.12;
    }
  }, [fftData]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, time: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;

      // Dark background
      ctx.fillStyle = "#0D0519";
      ctx.fillRect(0, 0, w, h);

      if (!isPaused) {
        phaseRef.current = time * 0.0004;
        updateLevels();
      }

      const phase = phaseRef.current;

      // Draw aurora wave layers from bottom to top
      for (let i = 0; i < LAYER_COUNT; i++) {
        const level = levelsRef.current[i];
        const layerY = h * (0.85 - (i / LAYER_COUNT) * 0.6);
        const amplitude = h * 0.04 * (1 + level * 2);
        const speed = 0.3 + i * 0.15 + level * 0.5;
        const layerPhase = phase * speed;

        // Hue shifts per layer: bottom warm, top cool, tinted by intention
        const hueShift = -20 + (i / LAYER_COUNT) * 60;
        const hue = (baseHue + hueShift + 360) % 360;
        const alpha = 0.05 + level * 0.55;

        ctx.beginPath();
        ctx.moveTo(0, h);

        // Build wave with bezier curves
        const segments = 6;
        const segW = w / segments;

        ctx.lineTo(0, layerY);
        for (let s = 0; s < segments; s++) {
          const x0 = s * segW;
          const x1 = (s + 0.5) * segW;
          const x2 = (s + 1) * segW;

          const y0 = layerY + Math.sin(layerPhase + s * 0.8 + i * 0.5) * amplitude;
          const y1 = layerY + Math.sin(layerPhase + (s + 0.5) * 0.8 + i * 0.5) * amplitude * 1.2;
          const y2 = layerY + Math.sin(layerPhase + (s + 1) * 0.8 + i * 0.5) * amplitude;

          ctx.bezierCurveTo(
            x0 + segW * 0.3, y0,
            x1, y1,
            x2, y2,
          );
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        ctx.fillStyle = `hsla(${hue}, 70%, ${40 + level * 20}%, ${alpha})`;
        ctx.fill();
      }

      // Central vertical gradient overlay for depth
      const depthGrad = ctx.createLinearGradient(w * 0.3, 0, w * 0.7, 0);
      depthGrad.addColorStop(0, "rgba(13, 5, 25, 0)");
      depthGrad.addColorStop(0.5, "rgba(13, 5, 25, 0.15)");
      depthGrad.addColorStop(1, "rgba(13, 5, 25, 0)");
      ctx.fillStyle = depthGrad;
      ctx.fillRect(0, 0, w, h);

      // Energy centre indicator dots along right edge
      const dotX = w - 20 * dpr;
      const dotStartY = h * 0.15;
      const dotEndY = h * 0.85;
      const dotSpacing = (dotEndY - dotStartY) / (CENTRE_ORDER.length - 1);

      for (let i = 0; i < CENTRE_ORDER.length; i++) {
        const key = CENTRE_ORDER[CENTRE_ORDER.length - 1 - i]; // crown at top
        const level = levelsRef.current[CENTRE_ORDER.length - 1 - i];
        const cy = dotStartY + i * dotSpacing;
        const radius = (3 + level * 4) * dpr;
        const colour = CENTRE_COLOURS[key];

        ctx.beginPath();
        ctx.arc(dotX, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = colour;
        ctx.globalAlpha = 0.2 + level * 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Elapsed time at top-centre
      const timeStr = formatTime(elapsedSeconds);
      ctx.font = `${16 * dpr}px monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(232, 224, 240, 0.3)";
      ctx.fillText(timeStr, w / 2, 40 * dpr);
    },
    [isPaused, updateLevels, baseHue, elapsedSeconds],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = (time: number) => {
      draw(ctx, time);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 block"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
