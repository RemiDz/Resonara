"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  getAudioContext,
  resumeAudioContext,
  getMicrophoneStream,
  createMicSource,
} from "@/lib/audio/audioContext";

export interface AudioStreamState {
  isActive: boolean;
  isPermissionGranted: boolean;
  error: string | null;
}

export interface UseAudioStreamReturn extends AudioStreamState {
  start: () => Promise<MediaStreamAudioSourceNode | null>;
  stop: () => void;
  stream: MediaStream | null;
  sourceNode: MediaStreamAudioSourceNode | null;
}

/**
 * Hook to manage microphone audio stream lifecycle.
 * Handles permission requests, AudioContext resume, and cleanup.
 */
export function useAudioStream(): UseAudioStreamReturn {
  const [state, setState] = useState<AudioStreamState>({
    isActive: false,
    isPermissionGranted: false,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const start = useCallback(async (): Promise<MediaStreamAudioSourceNode | null> => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      // Resume AudioContext (required after user gesture on iOS)
      await resumeAudioContext();

      // Request microphone access
      const stream = await getMicrophoneStream();
      streamRef.current = stream;

      // Belt-and-braces: re-check AudioContext state after mic grant
      // iOS Safari can sometimes re-suspend during the getUserMedia flow
      const audioCtx = getAudioContext();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Create source node
      const source = createMicSource(stream);
      sourceRef.current = source;

      setState({
        isActive: true,
        isPermissionGranted: true,
        error: null,
      });

      return source;
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please grant permission to continue."
          : "Could not access microphone. Please check your device settings.";

      setState({
        isActive: false,
        isPermissionGranted: false,
        error: message,
      });

      return null;
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    stream: streamRef.current,
    sourceNode: sourceRef.current,
  };
}
