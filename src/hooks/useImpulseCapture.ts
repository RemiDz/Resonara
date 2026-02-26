"use client";

import { useState, useCallback, useRef } from "react";
import { getAudioContext } from "@/lib/audio/audioContext";
import { detectTransients, extractImpulseResponse } from "@/lib/audio/transientDetector";
import { analyseRT60 } from "@/lib/audio/rt60";
import type { TransientEvent } from "@/lib/audio/transientDetector";
import type { RT60Result } from "@/lib/audio/rt60";

export interface ImpulseCaptureResult {
  transient: TransientEvent;
  impulseResponse: Float32Array;
  rt60: RT60Result;
}

export interface UseImpulseCaptureReturn {
  isRecording: boolean;
  results: ImpulseCaptureResult[];
  error: string | null;
  /** Current peak amplitude (0–1) — updates in real-time during recording. */
  currentPeak: number;
  /** Start recording from a source node. Listens for transients. */
  startCapture: (source: AudioNode) => void;
  /** Stop recording and process captured audio. */
  stopCapture: () => Promise<ImpulseCaptureResult[]>;
  /** Reset all results. */
  reset: () => void;
}

/**
 * Hook for capturing impulse responses from clap tests.
 * Records audio, detects transients, extracts impulse responses,
 * and computes RT60 for each detected clap.
 */
export function useImpulseCapture(): UseImpulseCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [results, setResults] = useState<ImpulseCaptureResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPeak, setCurrentPeak] = useState(0);

  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const bufferRef = useRef<Float32Array[]>([]);

  const startCapture = useCallback((source: AudioNode) => {
    const ctx = getAudioContext();
    bufferRef.current = [];
    setError(null);
    setResults([]);

    // Use ScriptProcessorNode to capture raw audio
    // (AudioWorklet would be preferred in production)
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      bufferRef.current.push(new Float32Array(input));

      // Track peak amplitude for real-time UI feedback
      let peak = 0;
      for (let i = 0; i < input.length; i++) {
        const abs = Math.abs(input[i]);
        if (abs > peak) peak = abs;
      }
      setCurrentPeak(peak);
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    setIsRecording(true);
  }, []);

  const stopCapture = useCallback(async (): Promise<ImpulseCaptureResult[]> => {
    setIsRecording(false);
    setCurrentPeak(0);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Concatenate all recorded buffers
    const chunks = bufferRef.current;
    if (chunks.length === 0) {
      setError("No audio was captured. Please try again.");
      return [];
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const fullBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;

    // Detect transients (claps)
    const transients = detectTransients(fullBuffer, sampleRate);

    if (transients.length === 0) {
      setError("No claps detected. Try clapping louder or closer to the microphone.");
      return [];
    }

    // Extract impulse response and compute RT60 for each transient
    const captureResults: ImpulseCaptureResult[] = transients.map((transient) => {
      const impulseResponse = extractImpulseResponse(
        fullBuffer,
        transient,
        3, // 3 seconds of decay
        sampleRate
      );
      const rt60 = analyseRT60(impulseResponse, sampleRate);
      return { transient, impulseResponse, rt60 };
    });

    setResults(captureResults);
    bufferRef.current = [];
    return captureResults;
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setError(null);
    bufferRef.current = [];
  }, []);

  return {
    isRecording,
    results,
    error,
    currentPeak,
    startCapture,
    stopCapture,
    reset,
  };
}
