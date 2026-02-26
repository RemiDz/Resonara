"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";
import { useAudioStream } from "@/hooks/useAudioStream";
import { useFFT } from "@/hooks/useFFT";
import { useImpulseCapture } from "@/hooks/useImpulseCapture";
import { getAudioContext } from "@/lib/audio/audioContext";
import type { ImpulseCaptureResult } from "@/hooks/useImpulseCapture";

interface ClapTestProps {
  onComplete: (results: ImpulseCaptureResult[]) => void;
  onBack: () => void;
}

export function ClapTest({ onComplete, onBack }: ClapTestProps) {
  const audioStream = useAudioStream();
  const fft = useFFT();
  const impulseCapture = useImpulseCapture();
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [ctxState, setCtxState] = useState<string>("—");
  const ctxPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll AudioContext state for debug overlay
  useEffect(() => {
    if (phase === "recording") {
      const poll = setInterval(() => {
        try {
          setCtxState(getAudioContext().state);
        } catch {
          setCtxState("error");
        }
      }, 500);
      ctxPollRef.current = poll;
      return () => clearInterval(poll);
    } else {
      if (ctxPollRef.current) {
        clearInterval(ctxPollRef.current);
        ctxPollRef.current = null;
      }
      setCtxState("—");
    }
  }, [phase]);

  const startRecording = useCallback(async () => {
    const source = await audioStream.start();
    if (!source) return;

    fft.connect(source);
    impulseCapture.startCapture(source);
    setPhase("recording");
  }, [audioStream, fft, impulseCapture]);

  const stopRecording = useCallback(async () => {
    const results = await impulseCapture.stopCapture();
    fft.disconnect();
    audioStream.stop();
    setPhase("done");

    if (results.length === 0) {
      // Stay in done phase but show error state
      return;
    }
  }, [impulseCapture, fft, audioStream]);

  // Average RT60 from results
  const avgRT60 =
    impulseCapture.results.length > 0
      ? impulseCapture.results.reduce((sum, r) => sum + r.rt60.rt60, 0) /
        impulseCapture.results.length
      : 0;

  // Convert RT60 to a 0–100 score (0.8–2.0s is ideal for sound healing)
  const rt60Score =
    avgRT60 > 0
      ? Math.max(0, Math.min(100, 100 - Math.abs(avgRT60 - 1.4) * 80))
      : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
      {phase === "recording" && (
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
        <h2 className="mb-2 text-xl font-bold text-gold">Clap Test</h2>

        {phase === "idle" && (
          <>
            <p className="mb-6 text-foreground-muted leading-relaxed">
              Stand in the centre of the room. When ready, clap your hands
              sharply 2–3 times with a few seconds between each clap.
              Resonara will measure how sound decays in your space.
            </p>
            {audioStream.error && (
              <p className="mb-4 text-sm text-red-400">{audioStream.error}</p>
            )}
            <div className="flex gap-3">
              <GoldButton variant="ghost" onClick={onBack}>
                Back
              </GoldButton>
              <GoldButton onClick={startRecording} className="flex-1">
                Start Recording
              </GoldButton>
            </div>
          </>
        )}

        {phase === "recording" && (
          <>
            <p className="mb-4 text-foreground-muted">
              Recording... Clap now!
            </p>

            {/* Real-time mic level indicator */}
            <div className="mb-3 w-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-foreground-muted">Mic Level</span>
                <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-75"
                    style={{
                      width: `${Math.min(impulseCapture.currentPeak * 100, 100)}%`,
                      backgroundColor:
                        impulseCapture.currentPeak > 0.5
                          ? "#D4A843"
                          : impulseCapture.currentPeak > 0.1
                            ? "#9B5BD4"
                            : "#4B3B6B",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Debug overlay */}
            <div className="mb-4 rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-foreground-muted text-left">
              <div className="flex justify-between">
                <span>Peak amplitude:</span>
                <span className={impulseCapture.currentPeak > 0.1 ? "text-gold" : ""}>
                  {impulseCapture.currentPeak.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Audio flowing:</span>
                <span className={impulseCapture.currentPeak > 0.001 ? "text-green-400" : "text-red-400"}>
                  {impulseCapture.currentPeak > 0.001 ? "yes" : "no"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>AudioContext:</span>
                <span className={ctxState === "running" ? "text-green-400" : "text-red-400"}>
                  {ctxState}
                </span>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-foreground-muted">
                {impulseCapture.results.length} clap
                {impulseCapture.results.length !== 1 ? "s" : ""} detected
              </span>
            </div>
            <GoldButton onClick={stopRecording} variant="secondary" className="w-full">
              Stop Recording
            </GoldButton>
          </>
        )}

        {phase === "done" && (
          <>
            {impulseCapture.error ? (
              <>
                <p className="mb-4 text-foreground-muted">
                  {impulseCapture.error}
                </p>
                <div className="flex gap-3">
                  <GoldButton variant="ghost" onClick={onBack}>
                    Back
                  </GoldButton>
                  <GoldButton
                    onClick={() => {
                      impulseCapture.reset();
                      setPhase("idle");
                    }}
                    className="flex-1"
                  >
                    Try Again
                  </GoldButton>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-foreground-muted">
                  Reverb analysis complete — {impulseCapture.results.length} clap
                  {impulseCapture.results.length !== 1 ? "s" : ""} analysed.
                </p>
                <div className="mb-6 flex justify-center">
                  <ScoreDisplay
                    score={rt60Score}
                    label="Room Reverb"
                    sublabel={`RT60: ${avgRT60.toFixed(2)}s`}
                  />
                </div>
                <div className="mb-6 grid grid-cols-2 gap-4 text-left">
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-foreground-muted">Decay Time</p>
                    <p className="text-lg font-bold text-gold">
                      {avgRT60.toFixed(2)}s
                    </p>
                  </div>
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-foreground-muted">Quality</p>
                    <p className="text-lg font-bold text-gold capitalize">
                      {impulseCapture.results[0]?.rt60.quality ?? "—"}
                    </p>
                  </div>
                </div>
                <GoldButton
                  onClick={() => onComplete(impulseCapture.results)}
                  className="w-full"
                >
                  Continue
                </GoldButton>
              </>
            )}
          </>
        )}
      </GlassPanel>
    </div>
  );
}
