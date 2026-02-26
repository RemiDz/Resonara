"use client";

import { useRef, useEffect, useCallback } from "react";
import type { EnergyCentreKey } from "@/hooks/useFFT";

interface SpectrumCanvasProps {
  /** Float32Array of frequency-domain data (dB values). */
  frequencyData: Float32Array | null;
  /** Canvas width in CSS pixels. */
  width?: number;
  /** Canvas height in CSS pixels. */
  height?: number;
  /** Show energy centre band overlays. */
  showBands?: boolean;
  /** Rendering mode. */
  mode?: "bars" | "curve";
  /** Whether to animate (true) or draw a single static frame (false). */
  animated?: boolean;
  className?: string;
}

const CENTRE_BANDS: Record<EnergyCentreKey, { range: [number, number]; colour: string }> = {
  root:        { range: [32, 128],    colour: "rgba(255, 68, 68, 0.08)" },
  sacral:      { range: [128, 256],   colour: "rgba(255, 136, 68, 0.08)" },
  solarPlexus: { range: [256, 384],   colour: "rgba(255, 221, 68, 0.08)" },
  heart:       { range: [384, 512],   colour: "rgba(68, 221, 136, 0.08)" },
  throat:      { range: [512, 768],   colour: "rgba(68, 187, 255, 0.08)" },
  thirdEye:    { range: [768, 1024],  colour: "rgba(123, 47, 190, 0.08)" },
  crown:       { range: [1024, 4000], colour: "rgba(212, 168, 67, 0.08)" },
};

/** Map a frequency to a logarithmic x position (20 Hz – 4000 Hz). */
function freqToX(freq: number, width: number): number {
  const minLog = Math.log10(20);
  const maxLog = Math.log10(4000);
  return ((Math.log10(Math.max(freq, 20)) - minLog) / (maxLog - minLog)) * width;
}

/**
 * Canvas 2D real-time frequency spectrum visualisation.
 * Logarithmic x-axis (20 Hz – 4000 Hz), dB-normalised y-axis.
 * Gold-to-violet gradient bars with optional energy centre band overlays.
 */
export function SpectrumCanvas({
  frequencyData,
  width = 400,
  height = 200,
  showBands = true,
  mode = "bars",
  animated = true,
  className = "",
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Float32Array | null>(null);

  // Keep ref in sync for animation loop access
  dataRef.current = frequencyData;

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const dpr = window.devicePixelRatio || 1;
      const w = width * dpr;
      const h = height * dpr;

      ctx.clearRect(0, 0, w, h);

      // Energy centre band overlays
      if (showBands) {
        for (const band of Object.values(CENTRE_BANDS)) {
          const x0 = freqToX(band.range[0], w);
          const x1 = freqToX(band.range[1], w);
          ctx.fillStyle = band.colour;
          ctx.fillRect(x0, 0, x1 - x0, h);
        }
      }

      const data = dataRef.current;
      if (!data || data.length === 0) return;

      // Assume standard sample rate and fftSize
      const sampleRate = 44100;
      const fftSize = data.length * 2;
      const binWidth = sampleRate / fftSize;

      if (mode === "bars") {
        // Group bins into visual buckets on log scale
        const numBuckets = Math.min(128, Math.floor(w / (2 * dpr)));
        const minLog = Math.log10(20);
        const maxLog = Math.log10(4000);

        for (let i = 0; i < numBuckets; i++) {
          const logLow = minLog + (i / numBuckets) * (maxLog - minLog);
          const logHigh = minLog + ((i + 1) / numBuckets) * (maxLog - minLog);
          const freqLow = Math.pow(10, logLow);
          const freqHigh = Math.pow(10, logHigh);
          const binLow = Math.max(0, Math.floor(freqLow / binWidth));
          const binHigh = Math.min(data.length - 1, Math.ceil(freqHigh / binWidth));

          // Average the dB values in this bucket
          let sum = 0;
          let count = 0;
          for (let b = binLow; b <= binHigh; b++) {
            sum += data[b];
            count++;
          }
          const avgDB = count > 0 ? sum / count : -100;

          // Normalise: -100 dB → 0, 0 dB → 1
          const norm = Math.max(0, Math.min(1, (avgDB + 100) / 100));
          const barHeight = norm * h * 0.9;
          const x = (i / numBuckets) * w;
          const barW = (w / numBuckets) - 1 * dpr;

          // Gold-to-violet gradient based on position
          const t = i / numBuckets;
          const r = Math.round(212 * (1 - t) + 123 * t);
          const g = Math.round(168 * (1 - t) + 47 * t);
          const b2 = Math.round(67 * (1 - t) + 190 * t);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b2}, ${0.6 + norm * 0.4})`;
          ctx.fillRect(x, h - barHeight, Math.max(barW, 1), barHeight);
        }
      } else {
        // Curve mode
        ctx.beginPath();
        ctx.moveTo(0, h);

        const minLog = Math.log10(20);
        const maxLog = Math.log10(4000);
        const steps = Math.min(256, Math.floor(w / dpr));

        for (let i = 0; i <= steps; i++) {
          const logFreq = minLog + (i / steps) * (maxLog - minLog);
          const freq = Math.pow(10, logFreq);
          const bin = Math.round(freq / binWidth);
          const db = bin < data.length ? data[bin] : -100;
          const norm = Math.max(0, Math.min(1, (db + 100) / 100));
          const x = (i / steps) * w;
          const y = h - norm * h * 0.9;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, "rgba(212, 168, 67, 0.6)");
        gradient.addColorStop(1, "rgba(123, 47, 190, 0.6)");
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = "rgba(212, 168, 67, 0.8)";
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }
    },
    [width, height, showBands, mode]
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

    if (!animated) {
      draw(ctx);
      return;
    }

    const loop = () => {
      draw(ctx);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [animated, draw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`block rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}
