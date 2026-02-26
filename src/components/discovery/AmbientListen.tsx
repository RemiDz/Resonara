"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";
import { useAudioStream } from "@/hooks/useAudioStream";
import { useFFT } from "@/hooks/useFFT";
import { computeRMS, linearToDB, analyseNoiseFloor } from "@/lib/audio/noiseFloor";
import type { NoiseFloorResult } from "@/lib/audio/noiseFloor";

const LISTEN_DURATION_SECONDS = 15;

interface AmbientListenProps {
  onComplete: (result: NoiseFloorResult) => void;
  onBack: () => void;
}

export function AmbientListen({ onComplete, onBack }: AmbientListenProps) {
  const audioStream = useAudioStream();
  const fft = useFFT();
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<"idle" | "listening" | "done">("idle");
  const [noiseResult, setNoiseResult] = useState<NoiseFloorResult | null>(null);

  const rmsSamplesRef = useRef<number[]>([]);
  const freqSnapshotsRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startListening = useCallback(async () => {
    const source = await audioStream.start();
    if (!source) return;

    fft.connect(source);
    setPhase("listening");
    setElapsed(0);
    rmsSamplesRef.current = [];
    freqSnapshotsRef.current = [];

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.5;
        if (next >= LISTEN_DURATION_SECONDS) {
          if (timerRef.current) clearInterval(timerRef.current);
          return LISTEN_DURATION_SECONDS;
        }
        return next;
      });
    }, 500);
  }, [audioStream, fft]);

  // Collect samples while listening
  useEffect(() => {
    if (phase !== "listening" || !fft.data) return;

    const rms = computeRMS(fft.data.timeDomainData);
    rmsSamplesRef.current.push(rms);
    freqSnapshotsRef.current.push(new Float32Array(fft.data.frequencyData));
  }, [phase, fft.data]);

  // Complete when timer reaches duration
  useEffect(() => {
    if (phase !== "listening" || elapsed < LISTEN_DURATION_SECONDS) return;

    fft.disconnect();
    audioStream.stop();
    setPhase("done");

    const result = analyseNoiseFloor(
      rmsSamplesRef.current,
      freqSnapshotsRef.current,
      44100,
      8192
    );
    setNoiseResult(result);
  }, [phase, elapsed, fft, audioStream]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progress = elapsed / LISTEN_DURATION_SECONDS;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
      {phase === "listening" && (
        <div className="mb-8">
          <MandalaCanvas
            width={300}
            height={300}
            energyCentres={fft.data?.energyCentres}
            active
          />
        </div>
      )}

      <GlassPanel className="max-w-md w-full text-center">
        <h2 className="mb-2 text-xl font-bold text-gold">Ambient Listening</h2>

        {phase === "idle" && (
          <>
            <p className="mb-6 text-foreground-muted">
              Resonara will listen to your room&apos;s ambient sound for{" "}
              {LISTEN_DURATION_SECONDS} seconds. Please stay still and keep the
              space quiet.
            </p>
            {audioStream.error && (
              <p className="mb-4 text-sm text-red-400">{audioStream.error}</p>
            )}
            <div className="flex gap-3">
              <GoldButton variant="ghost" onClick={onBack}>
                Back
              </GoldButton>
              <GoldButton onClick={startListening} className="flex-1">
                Start Listening
              </GoldButton>
            </div>
          </>
        )}

        {phase === "listening" && (
          <>
            <p className="mb-6 text-foreground-muted">
              Listening to your space...
            </p>
            <div className="flex justify-center mb-6">
              <ProgressRing
                progress={progress}
                size={100}
                label={`${Math.ceil(LISTEN_DURATION_SECONDS - elapsed)}s`}
              />
            </div>
            <p className="text-xs text-foreground-muted/60">
              Keep the room as quiet as possible
            </p>
          </>
        )}

        {phase === "done" && noiseResult && (
          <>
            <p className="mb-4 text-foreground-muted">
              Ambient analysis complete.
            </p>
            <div className="mb-6 grid grid-cols-2 gap-4 text-left">
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-foreground-muted">Noise Floor</p>
                <p className="text-lg font-bold text-gold">
                  {noiseResult.averageDB.toFixed(1)} dB
                </p>
              </div>
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-foreground-muted">Quality</p>
                <p className="text-lg font-bold text-gold capitalize">
                  {noiseResult.rating}
                </p>
              </div>
            </div>
            <GoldButton onClick={() => onComplete(noiseResult)} className="w-full">
              Continue
            </GoldButton>
          </>
        )}
      </GlassPanel>
    </div>
  );
}
