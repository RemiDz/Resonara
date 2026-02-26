"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createFFTAnalyser, bandEnergy } from "@/lib/audio/fftAnalyser";
import { getAudioContext } from "@/lib/audio/audioContext";
import type { FFTAnalyser } from "@/lib/audio/fftAnalyser";

/** Energy centre frequency bands. */
const ENERGY_CENTRES = {
  root: [32, 128] as const,
  sacral: [128, 256] as const,
  solarPlexus: [256, 384] as const,
  heart: [384, 512] as const,
  throat: [512, 768] as const,
  thirdEye: [768, 1024] as const,
  crown: [1024, 4000] as const,
};

export type EnergyCentreKey = keyof typeof ENERGY_CENTRES;

export interface FFTData {
  frequencyData: Float32Array;
  timeDomainData: Float32Array;
  energyCentres: Record<EnergyCentreKey, number>;
}

export interface UseFFTReturn {
  data: FFTData | null;
  isRunning: boolean;
  connect: (source: AudioNode) => void;
  disconnect: () => void;
}

/**
 * Hook that wraps FFT analyser for real-time frequency analysis.
 * Provides both raw frequency data and energy centre mappings.
 */
export function useFFT(fftSize: number = 8192, fps: number = 30): UseFFTReturn {
  const [data, setData] = useState<FFTData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const analyserRef = useRef<FFTAnalyser | null>(null);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (!analyserRef.current) return;

    const frequencyData = analyserRef.current.getFrequencyData();
    const timeDomainData = analyserRef.current.getTimeDomainData();
    const ctx = getAudioContext();

    // Compute energy centre levels
    const energyCentres = {} as Record<EnergyCentreKey, number>;
    for (const [key, [low, high]] of Object.entries(ENERGY_CENTRES)) {
      energyCentres[key as EnergyCentreKey] = bandEnergy(
        frequencyData,
        low,
        high,
        ctx.sampleRate,
        fftSize
      );
    }

    setData({
      frequencyData: new Float32Array(frequencyData),
      timeDomainData: new Float32Array(timeDomainData),
      energyCentres,
    });
  }, [fftSize]);

  // Animation loop running at specified fps
  useEffect(() => {
    if (!isRunning) return;

    const interval = 1000 / fps;
    let lastTime = 0;

    const loop = (time: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (time - lastTime >= interval) {
        lastTime = time;
        tick();
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning, tick, fps]);

  const connect = useCallback(
    (source: AudioNode) => {
      if (!analyserRef.current) {
        analyserRef.current = createFFTAnalyser(fftSize);
      }
      analyserRef.current.connectSource(source);
      setIsRunning(true);
    },
    [fftSize]
  );

  const disconnect = useCallback(() => {
    setIsRunning(false);
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
    };
  }, []);

  return { data, isRunning, connect, disconnect };
}
