"use client";

import { useRef, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { BodyMap } from "@/components/visualisations/BodyMap";
import { INTENTIONS } from "@/lib/analysis/intentionEngine";
import type { SessionRecord } from "@/lib/data/db";
import type { EnergyCentreKey } from "@/hooks/useFFT";
import type { Intention } from "@/lib/analysis/intentionEngine";

interface PostSummaryProps {
  sessionRecord: SessionRecord;
  roomName: string;
  onDone: () => void;
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

const CENTRE_LABELS: Record<EnergyCentreKey, string> = {
  root: "Root",
  sacral: "Sacral",
  solarPlexus: "Solar Plexus",
  heart: "Heart",
  throat: "Throat",
  thirdEye: "Third Eye",
  crown: "Crown",
};

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PostSummary({ sessionRecord, roomName, onDone }: PostSummaryProps) {
  const { data } = sessionRecord;
  const intentionConfig = INTENTIONS[data.intention as Intention];

  // Normalise average centres for BodyMap (dB → 0–1)
  const normalisedCentres = {} as Record<EnergyCentreKey, number>;
  const maxValues: number[] = [];
  for (const key of CENTRE_ORDER) {
    const val = data.averageCentres[key] ?? -80;
    normalisedCentres[key] = Math.max(0, Math.min(1, (val + 80) / 80));
    maxValues.push(normalisedCentres[key]);
  }
  const maxCentreVal = Math.max(...maxValues, 0.01);

  return (
    <div className="min-h-screen px-4 py-8 animate-fade-in">
      <div className="mx-auto max-w-md flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gold">Session Complete</h1>
          <p className="mt-1 text-xs text-foreground-muted/50">
            {roomName} &middot; {intentionConfig?.label ?? data.intention}
          </p>
        </div>

        {/* Duration */}
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground/90">
            {formatDuration(data.durationSeconds)}
          </p>
          <p className="text-xs text-foreground-muted/50 mt-1">Duration</p>
        </div>

        {/* Quality score */}
        <div className="flex justify-center">
          <ScoreDisplay
            score={data.qualityScore}
            label="Session Quality"
            sublabel="Coverage, consistency, and alignment"
            size="lg"
          />
        </div>

        {/* Energy centre engagement */}
        <GlassPanel>
          <h3 className="text-sm font-medium text-gold mb-4">
            Energy Centre Engagement
          </h3>

          <div className="flex justify-center mb-4">
            <BodyMap coverage={normalisedCentres} width={200} height={320} />
          </div>

          {/* Horizontal bars */}
          <div className="flex flex-col gap-2">
            {CENTRE_ORDER.map((key) => {
              const value = normalisedCentres[key];
              const widthPct = (value / maxCentreVal) * 100;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-foreground-muted/60 w-20 text-right">
                    {CENTRE_LABELS[key]}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-glass-bg overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: CENTRE_COLOURS[key],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="text-xs text-foreground-muted/40 w-10">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        {/* Peak moments */}
        {data.peakMoments.length > 0 && (
          <GlassPanel>
            <h3 className="text-sm font-medium text-gold mb-3">Peak Moments</h3>
            <div className="flex flex-col gap-2">
              {data.peakMoments.map((peak, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CENTRE_COLOURS[peak.peakCentre] }}
                  />
                  <span className="text-sm text-foreground/80">
                    {formatTime(peak.time)}
                  </span>
                  <span className="text-xs text-foreground-muted/50">
                    {CENTRE_LABELS[peak.peakCentre]} peaked
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}

        {/* Frequency coverage timeline */}
        {data.snapshots.length > 1 && (
          <GlassPanel>
            <h3 className="text-sm font-medium text-gold mb-3">
              Frequency Coverage Timeline
            </h3>
            <TimelineHeatmap snapshots={data.snapshots} />
          </GlassPanel>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-8 no-print">
          <GoldButton
            variant="secondary"
            onClick={() => window.print()}
          >
            Export as PDF
          </GoldButton>
          <GoldButton onClick={onDone}>Done</GoldButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline heatmap sub-component (Canvas)
// ---------------------------------------------------------------------------

interface TimelineHeatmapProps {
  snapshots: Array<{ time: number; centres: Record<EnergyCentreKey, number> }>;
}

function TimelineHeatmap({ snapshots }: TimelineHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = ctx.canvas.clientWidth;
      const cssH = 80;
      ctx.canvas.width = cssW * dpr;
      ctx.canvas.height = cssH * dpr;
      ctx.canvas.style.height = `${cssH}px`;

      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const rows = CENTRE_ORDER.length;
      const cols = snapshots.length;
      const cellW = w / cols;
      const cellH = h / rows;

      for (let col = 0; col < cols; col++) {
        const snap = snapshots[col];
        for (let row = 0; row < rows; row++) {
          // Rows: crown at top, root at bottom
          const key = CENTRE_ORDER[rows - 1 - row];
          const rawDb = snap.centres[key] ?? -80;
          const level = Math.max(0, Math.min(1, (rawDb + 80) / 80));
          const colour = CENTRE_COLOURS[key];

          ctx.fillStyle = colour;
          ctx.globalAlpha = level * 0.9 + 0.05;
          ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
        }
      }
      ctx.globalAlpha = 1;
    },
    [snapshots],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    draw(ctx);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full rounded-lg"
      style={{ height: 80 }}
    />
  );
}
