"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SessionPrep } from "@/components/session/SessionPrep";
import { LiveView } from "@/components/session/LiveView";
import { SessionControls } from "@/components/session/SessionControls";
import { PostSummary } from "@/components/session/PostSummary";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { useAudioStream } from "@/hooks/useAudioStream";
import { useFFT } from "@/hooks/useFFT";
import { useRoom } from "@/hooks/useRoom";
import { saveSession } from "@/lib/data/db";
import { INTENTIONS, type Intention } from "@/lib/analysis/intentionEngine";
import type { SessionRecord, SessionSnapshot, SessionData } from "@/lib/data/db";
import type { EnergyCentreKey } from "@/hooks/useFFT";
import Link from "next/link";

const CENTRE_ORDER: EnergyCentreKey[] = [
  "root", "sacral", "solarPlexus", "heart", "throat", "thirdEye", "crown",
];

type Phase = "prep" | "live" | "summary";

function SessionContent() {
  const params = useSearchParams();
  const router = useRouter();
  const roomId = params.get("roomId") ?? "";
  const { room } = useRoom(roomId || null);

  const [phase, setPhase] = useState<Phase>("prep");
  const [intention, setIntention] = useState<Intention | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [savedRecord, setSavedRecord] = useState<SessionRecord | null>(null);

  const audio = useAudioStream();
  const fft = useFFT(8192, 30);

  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotsRef = useRef<SessionSnapshot[]>([]);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peakMomentsRef = useRef<Array<{ time: number; totalEnergy: number; peakCentre: EnergyCentreKey }>>([]);

  // ---------- Phase transitions ----------

  const handleStart = useCallback(async (chosen: Intention) => {
    setIntention(chosen);
    setPhase("live");
    startTimeRef.current = Date.now();
    snapshotsRef.current = [];
    peakMomentsRef.current = [];

    const source = await audio.start();
    if (source) {
      fft.connect(source);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = useCallback(async () => {
    // Stop timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);

    // Stop audio
    fft.disconnect();
    audio.stop();

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const snapshots = snapshotsRef.current;
    const peakMoments = peakMomentsRef.current
      .sort((a, b) => b.totalEnergy - a.totalEnergy)
      .slice(0, 3);

    // Compute average centres
    const averageCentres = {} as Record<EnergyCentreKey, number>;
    for (const key of CENTRE_ORDER) {
      if (snapshots.length === 0) {
        averageCentres[key] = -80;
      } else {
        const sum = snapshots.reduce((s, snap) => s + snap.centres[key], 0);
        averageCentres[key] = sum / snapshots.length;
      }
    }

    // Compute quality score
    const qualityScore = computeQualityScore(
      intention!,
      snapshots,
      averageCentres,
    );

    const sessionData: SessionData = {
      intention: intention!,
      startedAt: startTimeRef.current,
      durationSeconds,
      snapshots,
      peakMoments,
      averageCentres,
      qualityScore,
    };

    const id = await saveSession({
      roomId,
      createdAt: Date.now(),
      data: sessionData,
    });

    const record: SessionRecord = {
      id,
      roomId,
      createdAt: Date.now(),
      data: sessionData,
    };

    setSavedRecord(record);
    setPhase("summary");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intention, roomId]);

  // ---------- Live phase effects ----------

  // Elapsed seconds counter
  useEffect(() => {
    if (phase !== "live") return;

    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, isPaused]);

  // Sample energy centres every 2 seconds
  useEffect(() => {
    if (phase !== "live") return;

    sampleTimerRef.current = setInterval(() => {
      if (isPaused || !fft.data) return;

      const time = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const centres = { ...fft.data.energyCentres };
      snapshotsRef.current.push({ time, centres });

      // Track peak moments
      const totalEnergy = CENTRE_ORDER.reduce(
        (sum, key) => sum + Math.max(0, (centres[key] + 80) / 80),
        0,
      );
      const peakCentre = CENTRE_ORDER.reduce((best, key) =>
        centres[key] > centres[best] ? key : best,
      );

      peakMomentsRef.current.push({ time, totalEnergy, peakCentre });
    }, 2000);

    return () => {
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPaused, fft.data]);

  // ---------- No roomId guard ----------

  if (!roomId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <GlassPanel className="max-w-md w-full text-center">
          <h2 className="mb-4 text-xl font-bold text-gold">No Room Selected</h2>
          <p className="mb-6 text-sm text-foreground-muted/70">
            Please select a room from the dashboard first.
          </p>
          <Link href="/">
            <GoldButton className="w-full">Discover a Room</GoldButton>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  // ---------- Render phases ----------

  if (phase === "prep") {
    return (
      <SessionPrep
        roomId={roomId}
        onStart={handleStart}
        onBack={() => router.push(`/dashboard?roomId=${roomId}`)}
      />
    );
  }

  if (phase === "live" && intention) {
    return (
      <>
        <LiveView
          intention={intention}
          fftData={fft.data}
          isPaused={isPaused}
          elapsedSeconds={elapsedSeconds}
        />
        <SessionControls
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((p) => !p)}
          onEnd={handleEnd}
        />
      </>
    );
  }

  if (phase === "summary" && savedRecord) {
    return (
      <PostSummary
        sessionRecord={savedRecord}
        roomName={room?.name ?? "Room"}
        onDone={() => router.push(`/dashboard?roomId=${roomId}`)}
      />
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Quality score computation
// ---------------------------------------------------------------------------

function computeQualityScore(
  intention: Intention,
  snapshots: SessionSnapshot[],
  averageCentres: Record<EnergyCentreKey, number>,
): number {
  if (snapshots.length === 0) return 0;

  const config = INTENTIONS[intention];
  const primaryCentres: EnergyCentreKey[] = config.primaryCentres;

  // 1. Coverage breadth (0–35): how many centres were stimulated above threshold
  let activatedCount = 0;
  for (const key of CENTRE_ORDER) {
    const level = Math.max(0, (averageCentres[key] + 80) / 80);
    if (level > 0.15) activatedCount++;
  }
  const coverageScore = (activatedCount / CENTRE_ORDER.length) * 35;

  // 2. Consistency (0–30): low variance across snapshots
  let varianceSum = 0;
  for (const key of CENTRE_ORDER) {
    const mean = averageCentres[key];
    const variance =
      snapshots.reduce((sum, s) => sum + (s.centres[key] - mean) ** 2, 0) /
      snapshots.length;
    // Normalise: stddev in dB, lower is better
    const stddev = Math.sqrt(variance);
    varianceSum += Math.max(0, 1 - stddev / 20);
  }
  const consistencyScore = (varianceSum / CENTRE_ORDER.length) * 30;

  // 3. Alignment with intention (0–35): how much energy hit the target centres
  let alignmentSum = 0;
  for (const key of primaryCentres) {
    const level = Math.max(0, (averageCentres[key] + 80) / 80);
    alignmentSum += level;
  }
  const alignmentScore = Math.min(35, (alignmentSum / primaryCentres.length) * 35);

  return Math.max(0, Math.min(100, Math.round(coverageScore + consistencyScore + alignmentScore)));
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense
// ---------------------------------------------------------------------------

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <MandalaCanvas width={200} height={200} active />
          <p className="mt-6 text-sm text-foreground-muted/60 animate-pulse">
            Loading&hellip;
          </p>
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
