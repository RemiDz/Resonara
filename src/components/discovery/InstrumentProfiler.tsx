"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { SpectrumCanvas } from "@/components/visualisations/SpectrumCanvas";
import { InstrumentProfileCard } from "./InstrumentProfileCard";
import { INSTRUMENTS } from "@/lib/data/instruments";
import type { InstrumentDef } from "@/lib/data/instruments";
import { useAudioStream } from "@/hooks/useAudioStream";
import { useFFT } from "@/hooks/useFFT";
import { getAudioContext } from "@/lib/audio/audioContext";
import { detectOvertones } from "@/lib/audio/overtoneDetector";
import { frequencyToNote } from "@/lib/audio/noteMapper";
import {
  computeCompatibilityScore,
  computeCentreCoverage,
  generateSummary,
} from "@/lib/analysis/compatibilityScorer";
import type { InstrumentProfile } from "@/lib/analysis/compatibilityScorer";
import type { EnergyCentreKey } from "@/hooks/useFFT";
import type { NoiseFloorResult } from "@/lib/audio/noiseFloor";

type Phase = "select" | "record" | "analyse" | "results";

interface InstrumentProfilerProps {
  onComplete: (profiles: InstrumentProfile[]) => void;
  onBack: () => void;
  /** Noise floor from the Ambient Listen step (may be null). */
  noiseFloor?: NoiseFloorResult | null;
}

const RECORD_DURATION = 5; // seconds
const FFT_SIZE = 8192;

/**
 * Instrument Profiler — the killer feature.
 *
 * Four phases:
 * 1. Select: choose an instrument from the library grid
 * 2. Record: play the instrument with a live spectrum for 5 seconds
 * 3. Analyse: process captured data into a profile
 * 4. Results: display the profile with option to profile more
 */
export function InstrumentProfiler({
  onComplete,
  onBack,
  noiseFloor = null,
}: InstrumentProfilerProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentDef | null>(null);
  const [profiles, setProfiles] = useState<InstrumentProfile[]>([]);
  const [latestProfile, setLatestProfile] = useState<InstrumentProfile | null>(null);
  const [countdown, setCountdown] = useState(RECORD_DURATION);
  const [error, setError] = useState<string | null>(null);

  const audioStream = useAudioStream();
  const fft = useFFT(FFT_SIZE, 30);

  // Refs for collecting snapshots during recording
  const frequencySnapshotsRef = useRef<Float32Array[]>([]);
  const centreSnapshotsRef = useRef<Array<Record<EnergyCentreKey, number>>>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Collect snapshots while recording
  useEffect(() => {
    if (phase !== "record" || !fft.data) return;

    frequencySnapshotsRef.current.push(new Float32Array(fft.data.frequencyData));
    centreSnapshotsRef.current.push({ ...fft.data.energyCentres });
  }, [phase, fft.data]);

  // --- Phase: Select ---
  const handleSelectInstrument = useCallback((instrument: InstrumentDef) => {
    setSelectedInstrument(instrument);
    setError(null);
    startRecording(instrument);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async (instrument: InstrumentDef) => {
    // Reset snapshots
    frequencySnapshotsRef.current = [];
    centreSnapshotsRef.current = [];
    setCountdown(RECORD_DURATION);

    // Start mic
    const source = await audioStream.start();
    if (!source) {
      setError("Could not access microphone. Please grant permission.");
      setPhase("select");
      return;
    }

    // Connect to FFT
    fft.connect(source);
    setPhase("record");

    // Countdown timer
    let remaining = RECORD_DURATION;
    recordTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        stopRecording();
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    fft.disconnect();
    audioStream.stop();
    setPhase("analyse");
    runAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Phase: Analyse ---
  const runAnalysis = useCallback(() => {
    const snapshots = frequencySnapshotsRef.current;
    const centreSnapshots = centreSnapshotsRef.current;

    if (snapshots.length === 0 || !selectedInstrument) {
      setError("No audio data captured. Please try again.");
      setPhase("select");
      return;
    }

    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const fftSize = FFT_SIZE;

    // Average all frequency snapshots
    const binCount = snapshots[0].length;
    const averaged = new Float32Array(binCount);
    for (let b = 0; b < binCount; b++) {
      let sum = 0;
      for (const snap of snapshots) {
        sum += snap[b];
      }
      averaged[b] = sum / snapshots.length;
    }

    // Detect overtones from averaged spectrum (filter to 8th harmonic)
    const overtoneResult = detectOvertones(averaged, sampleRate, fftSize);
    const harmonics = overtoneResult.harmonics.filter((h) => h.harmonicNumber <= 8);

    // Average energy centres
    const avgCentres = {} as Record<EnergyCentreKey, number>;
    const centreKeys: EnergyCentreKey[] = [
      "root", "sacral", "solarPlexus", "heart", "throat", "thirdEye", "crown",
    ];
    for (const key of centreKeys) {
      let sum = 0;
      for (const snap of centreSnapshots) {
        sum += snap[key];
      }
      avgCentres[key] = centreSnapshots.length > 0 ? sum / centreSnapshots.length : -80;
    }

    // Compute compatibility score
    const compatibilityScore = computeCompatibilityScore({
      instrumentCentres: avgCentres,
      noiseFloorBands: noiseFloor?.bandLevels ?? null,
      overtoneConfidence: overtoneResult.confidence,
      harmonics,
    });

    // Compute centre coverage
    const centreCoverage = computeCentreCoverage(avgCentres);

    // Get note name
    const note = frequencyToNote(overtoneResult.fundamental);

    // Generate summary
    const summary = generateSummary(
      selectedInstrument.name,
      note.name,
      overtoneResult.fundamental,
      centreCoverage,
      compatibilityScore,
      harmonics
    );

    const profile: InstrumentProfile = {
      instrumentId: selectedInstrument.id,
      fundamental: overtoneResult.fundamental,
      harmonics,
      energyCentres: avgCentres,
      compatibilityScore,
      centreCoverage,
      summary,
      averagedSpectrum: averaged,
      timestamp: Date.now(),
    };

    setLatestProfile(profile);
    setProfiles((prev) => [...prev, profile]);

    // Brief pause for the "Analysing..." animation then show results
    setTimeout(() => setPhase("results"), 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstrument, noiseFloor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      fft.disconnect();
      audioStream.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveProfile = useCallback((index: number) => {
    setProfiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // =====================
  // Render phases
  // =====================

  // --- SELECT PHASE ---
  if (phase === "select") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
        <GlassPanel className="max-w-lg w-full">
          <h2 className="mb-2 text-center text-xl font-bold text-gold">
            Instrument Profiler
          </h2>
          <p className="mb-6 text-center text-sm text-foreground-muted/70">
            Select an instrument to profile how it resonates in this room.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Instrument grid */}
          <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {INSTRUMENTS.map((instrument) => {
              const alreadyProfiled = profiles.some(
                (p) => p.instrumentId === instrument.id
              );
              return (
                <button
                  key={instrument.id}
                  onClick={() => handleSelectInstrument(instrument)}
                  className={`
                    group relative flex flex-col items-center gap-1.5 rounded-xl p-3
                    border transition-all duration-300
                    ${
                      alreadyProfiled
                        ? "border-gold/30 bg-gold/5"
                        : "border-white/5 bg-white/[0.02] hover:border-gold/20 hover:bg-gold/5"
                    }
                    active:scale-95
                  `}
                >
                  <span className="text-2xl">{instrument.icon}</span>
                  <span className="text-xs text-foreground-muted/80 leading-tight text-center">
                    {instrument.name}
                  </span>
                  {alreadyProfiled && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-deep-primary">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Existing profiles count */}
          {profiles.length > 0 && (
            <div className="mb-4 text-center">
              <button
                onClick={() => {
                  setLatestProfile(profiles[profiles.length - 1]);
                  setPhase("results");
                }}
                className="text-sm text-gold hover:text-gold-light transition-colors"
              >
                {profiles.length} instrument{profiles.length > 1 ? "s" : ""} profiled — View Results
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <GoldButton variant="ghost" onClick={onBack}>
              Back
            </GoldButton>
            {profiles.length > 0 && (
              <GoldButton
                onClick={() => onComplete(profiles)}
                variant="secondary"
                className="flex-1"
              >
                Continue
              </GoldButton>
            )}
            {profiles.length === 0 && (
              <GoldButton
                onClick={() => onComplete([])}
                variant="secondary"
                className="flex-1"
              >
                Skip for Now
              </GoldButton>
            )}
          </div>
        </GlassPanel>
      </div>
    );
  }

  // --- RECORD PHASE ---
  if (phase === "record") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-4">
            <span className="text-4xl">{selectedInstrument?.icon}</span>
          </div>

          <h2 className="mb-2 text-xl font-bold text-gold">
            Play your {selectedInstrument?.name} now
          </h2>
          <p className="mb-4 text-sm text-foreground-muted/70">
            Let it ring naturally — we&apos;re listening to how the room responds.
          </p>

          {/* Countdown */}
          <div className="mb-4">
            <span className="text-5xl font-bold text-gold tabular-nums">
              {countdown}
            </span>
            <p className="text-xs text-foreground-muted/50 mt-1">seconds remaining</p>
          </div>

          {/* Live spectrum */}
          <div className="mb-4 overflow-hidden rounded-lg bg-black/20">
            <SpectrumCanvas
              frequencyData={fft.data?.frequencyData ?? null}
              width={350}
              height={150}
              showBands
              animated
              className="w-full"
            />
          </div>

          {/* Recording indicator */}
          <div className="flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400">Recording</span>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // --- ANALYSE PHASE ---
  if (phase === "analyse") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 rounded-full border-2 border-gold/30 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-t-gold border-r-gold/30 border-b-gold/10 border-l-gold/30 animate-spin" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gold">Analysing...</h2>
          <p className="text-sm text-foreground-muted/70">
            Detecting harmonics and mapping energy centres.
          </p>
        </GlassPanel>
      </div>
    );
  }

  // --- RESULTS PHASE ---
  return (
    <div className="flex min-h-screen flex-col items-center justify-start px-4 py-16 animate-fade-in">
      <div className="max-w-md w-full space-y-4">
        {/* Latest profile */}
        {latestProfile && (
          <InstrumentProfileCard profile={latestProfile} />
        )}

        {/* Previous profiles */}
        {profiles.length > 1 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground-muted/60">
              Previous Profiles
            </h3>
            <div className="space-y-3">
              {profiles
                .filter((p) => p !== latestProfile)
                .map((profile, idx) => (
                  <InstrumentProfileCard
                    key={`${profile.instrumentId}-${profile.timestamp}`}
                    profile={profile}
                    onRemove={() => {
                      const actualIdx = profiles.indexOf(profile);
                      if (actualIdx !== -1) handleRemoveProfile(actualIdx);
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <GoldButton
            variant="ghost"
            onClick={() => {
              setSelectedInstrument(null);
              setPhase("select");
            }}
          >
            Profile Another
          </GoldButton>
          <GoldButton
            onClick={() => onComplete(profiles)}
            variant="secondary"
            className="flex-1"
          >
            Continue
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
