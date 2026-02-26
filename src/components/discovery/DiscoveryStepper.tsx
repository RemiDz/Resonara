"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OpeningScreen } from "./OpeningScreen";
import { AmbientListen } from "./AmbientListen";
import { ClapTest } from "./ClapTest";
import { SpatialWalk } from "./SpatialWalk";
import { InstrumentProfiler } from "./InstrumentProfiler";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";
import { saveRoom } from "@/lib/data/db";
import type { NoiseFloorResult } from "@/lib/audio/noiseFloor";
import type { ImpulseCaptureResult } from "@/hooks/useImpulseCapture";
import type { InstrumentProfile } from "@/lib/analysis/compatibilityScorer";
import type { EnergyCentreKey } from "@/hooks/useFFT";
import type { SerializedClapResult, SerializedInstrumentProfile } from "@/lib/data/db";

type Step = "opening" | "ambient" | "clap" | "spatial" | "instruments" | "summary";

interface DiscoveryData {
  noiseFloor: NoiseFloorResult | null;
  clapResults: ImpulseCaptureResult[];
  instrumentProfiles: InstrumentProfile[];
}

const STEP_ORDER: Step[] = ["opening", "ambient", "clap", "spatial", "instruments", "summary"];

/**
 * Orchestrates the Room Discovery flow through all phases.
 */
const ENERGY_CENTRE_KEYS: EnergyCentreKey[] = [
  "root", "sacral", "solarPlexus", "heart", "throat", "thirdEye", "crown",
];

export function DiscoveryStepper() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("opening");
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<DiscoveryData>({
    noiseFloor: null,
    clapResults: [],
    instrumentProfiles: [],
  });

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length - 1; // Exclude summary from progress

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEP_ORDER[idx - 1]);
  }, [currentStep]);

  const handleAmbientComplete = useCallback((result: NoiseFloorResult) => {
    setData((prev) => ({ ...prev, noiseFloor: result }));
    setCurrentStep("clap");
  }, []);

  const handleClapComplete = useCallback((results: ImpulseCaptureResult[]) => {
    setData((prev) => ({ ...prev, clapResults: results }));
    setCurrentStep("spatial");
  }, []);

  const handleInstrumentsComplete = useCallback((instrumentProfiles: InstrumentProfile[]) => {
    setData((prev) => ({ ...prev, instrumentProfiles }));
    setCurrentStep("summary");
  }, []);

  // Compute overall room score
  const computeOverallScore = (): number => {
    let score = 50; // Base score

    if (data.noiseFloor) {
      const noiseScore =
        data.noiseFloor.rating === "excellent"
          ? 25
          : data.noiseFloor.rating === "good"
            ? 20
            : data.noiseFloor.rating === "fair"
              ? 12
              : 5;
      score += noiseScore;
    }

    if (data.clapResults.length > 0) {
      const avgRT60 =
        data.clapResults.reduce((sum, r) => sum + r.rt60.rt60, 0) /
        data.clapResults.length;
      // Ideal RT60 for sound healing: 0.8-2.0s
      const rt60Score = Math.max(0, 25 - Math.abs(avgRT60 - 1.4) * 20);
      score += rt60Score;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const handleViewProfile = async () => {
    setIsSaving(true);
    try {
      // Serialise clap results (Float32Array → number[])
      const clapResults: SerializedClapResult[] = data.clapResults.map((r) => ({
        rt60: r.rt60.rt60,
        decayCurve: Array.from(r.rt60.decayCurve),
        quality: r.rt60.quality,
        peakAmplitude: r.transient.peakAmplitude,
        timeSeconds: r.transient.timeSeconds,
      }));

      // Serialise instrument profiles (Float32Array → number[])
      const instrumentProfiles: SerializedInstrumentProfile[] =
        data.instrumentProfiles.map((p) => ({
          ...p,
          averagedSpectrum: Array.from(p.averagedSpectrum),
        }));

      // Compute energy centres from noise floor band levels
      const energyCentres = {} as Record<EnergyCentreKey, number>;
      for (const key of ENERGY_CENTRE_KEYS) {
        energyCentres[key] = data.noiseFloor?.bandLevels[key] ?? -60;
      }

      const id = await saveRoom({
        name: `Room ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        createdAt: Date.now(),
        overallScore: computeOverallScore(),
        noiseFloor: data.noiseFloor,
        clapResults,
        instrumentProfiles,
        energyCentres,
      });

      router.push(`/dashboard?roomId=${id}`);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Progress indicator */}
      {currentStep !== "opening" && currentStep !== "summary" && (
        <div className="fixed top-0 left-0 right-0 z-50 p-4">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-2">
              {STEP_ORDER.slice(1, -1).map((step, i) => (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i < stepIndex - 1
                      ? "bg-gold"
                      : i === stepIndex - 1
                        ? "bg-gold/60"
                        : "bg-gold/15"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-foreground-muted/60">
              Step {stepIndex} of {totalSteps - 1}
            </p>
          </div>
        </div>
      )}

      {/* Step content */}
      {currentStep === "opening" && (
        <OpeningScreen onBegin={() => setCurrentStep("ambient")} />
      )}

      {currentStep === "ambient" && (
        <AmbientListen onComplete={handleAmbientComplete} onBack={goBack} />
      )}

      {currentStep === "clap" && (
        <ClapTest onComplete={handleClapComplete} onBack={goBack} />
      )}

      {currentStep === "spatial" && (
        <SpatialWalk
          onComplete={() => setCurrentStep("instruments")}
          onBack={goBack}
        />
      )}

      {currentStep === "instruments" && (
        <InstrumentProfiler
          onComplete={handleInstrumentsComplete}
          onBack={goBack}
          noiseFloor={data.noiseFloor}
        />
      )}

      {currentStep === "summary" && (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 animate-fade-in">
          <div className="mb-8">
            <MandalaCanvas width={250} height={250} active />
          </div>

          <GlassPanel className="max-w-md w-full text-center">
            <h2 className="mb-4 text-2xl font-bold text-gold">
              Room Discovery Complete
            </h2>

            <div className="mb-6 flex justify-center">
              <ScoreDisplay
                score={computeOverallScore()}
                label="Acoustic Wellness Score"
                sublabel="Overall room compatibility"
                size="lg"
              />
            </div>

            {data.noiseFloor && (
              <div className="mb-4 grid grid-cols-2 gap-3 text-left">
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-foreground-muted">Ambient Noise</p>
                  <p className="text-sm font-bold text-gold capitalize">
                    {data.noiseFloor.rating}
                  </p>
                </div>
                {data.clapResults.length > 0 && (
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-foreground-muted">Reverb Time</p>
                    <p className="text-sm font-bold text-gold">
                      {(
                        data.clapResults.reduce((s, r) => s + r.rt60.rt60, 0) /
                        data.clapResults.length
                      ).toFixed(2)}
                      s
                    </p>
                  </div>
                )}
                {data.instrumentProfiles.length > 0 && (
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-foreground-muted">Instruments</p>
                    <p className="text-sm font-bold text-gold">
                      {data.instrumentProfiles.length} profiled
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="mb-6 text-sm text-foreground-muted/70">
              Your room profile has been created. You can refine it later
              with additional measurements.
            </p>

            <div className="flex flex-col gap-3">
              <GoldButton
                onClick={handleViewProfile}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Saving\u2026" : "View Room Profile"}
              </GoldButton>
              <GoldButton
                onClick={() => setCurrentStep("opening")}
                variant="secondary"
                className="w-full"
              >
                Discover Another Room
              </GoldButton>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
