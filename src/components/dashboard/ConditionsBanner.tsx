"use client";

import { useState, useEffect, useRef } from "react";
import { useAudioStream } from "@/hooks/useAudioStream";
import { useFFT } from "@/hooks/useFFT";
import type { NoiseFloorResult } from "@/lib/audio/noiseFloor";
import type { EnergyCentreKey } from "@/hooks/useFFT";

interface ConditionsBannerProps {
  baselineNoiseFloor: NoiseFloorResult;
}

const ENERGY_CENTRE_KEYS: EnergyCentreKey[] = [
  "root", "sacral", "solarPlexus", "heart", "throat", "thirdEye", "crown",
];

type ConditionStatus = "measuring" | "excellent" | "baseline" | "elevated";

function statusMessage(status: ConditionStatus): string {
  switch (status) {
    case "measuring":
      return "Measuring current conditions\u2026";
    case "excellent":
      return "Conditions are excellent today";
    case "baseline":
      return "Conditions match your baseline";
    case "elevated":
      return "Background noise is elevated today";
  }
}

function statusColour(status: ConditionStatus): string {
  switch (status) {
    case "measuring":
      return "#D4A843";
    case "excellent":
      return "#44DD88";
    case "baseline":
      return "#44BBFF";
    case "elevated":
      return "#FF8844";
  }
}

/**
 * Thin glass banner that briefly samples the mic and compares
 * current conditions to the stored baseline noise floor.
 */
export function ConditionsBanner({ baselineNoiseFloor }: ConditionsBannerProps) {
  const [status, setStatus] = useState<ConditionStatus>("measuring");
  const audio = useAudioStream();
  const fft = useFFT(8192, 15);
  const samplesRef = useRef<Record<EnergyCentreKey, number>[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  // Start mic on mount
  useEffect(() => {
    let cancelled = false;

    async function measure() {
      const source = await audio.start();
      if (!source || cancelled) return;
      fft.connect(source);
    }

    measure();

    return () => {
      cancelled = true;
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Collect FFT samples for ~3 seconds
  useEffect(() => {
    if (!fft.data || doneRef.current) return;

    samplesRef.current.push({ ...fft.data.energyCentres });

    // After ~3 seconds of data (15 fps × 3 = 45 frames)
    if (samplesRef.current.length >= 45) {
      doneRef.current = true;

      // Average current band levels
      const currentAvg: Record<string, number> = {};
      for (const key of ENERGY_CENTRE_KEYS) {
        const sum = samplesRef.current.reduce((s, frame) => s + frame[key], 0);
        currentAvg[key] = sum / samplesRef.current.length;
      }

      // Compute delta against baseline
      let deltaSum = 0;
      let count = 0;
      for (const key of ENERGY_CENTRE_KEYS) {
        const baseline = baselineNoiseFloor.bandLevels[key] ?? -60;
        deltaSum += currentAvg[key] - baseline;
        count++;
      }
      const avgDelta = count > 0 ? deltaSum / count : 0;

      if (avgDelta <= 0) setStatus("excellent");
      else if (avgDelta <= 6) setStatus("baseline");
      else setStatus("elevated");

      // Stop mic
      fft.disconnect();
      audio.stop();
    }
  }, [fft.data, fft, audio, baselineNoiseFloor]);

  // Timeout: if no mic data after 5s, just hide
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        fft.disconnect();
        audio.stop();
        setStatus("baseline");
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colour = statusColour(status);

  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
      <span
        className="block h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: colour,
          boxShadow: `0 0 8px ${colour}`,
        }}
      />
      <p className="text-sm text-foreground-muted/80">{statusMessage(status)}</p>
    </div>
  );
}
