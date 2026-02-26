/**
 * Room-instrument compatibility scoring algorithm.
 * Computes how well an instrument resonates within a given room
 * based on noise floor data and detected overtone characteristics.
 */

import type { EnergyCentreKey } from "@/hooks/useFFT";
import type { HarmonicPeak } from "@/lib/audio/overtoneDetector";

/** Energy centre frequency bands (Hz). */
const ENERGY_BANDS: Record<EnergyCentreKey, [number, number]> = {
  root: [32, 128],
  sacral: [128, 256],
  solarPlexus: [256, 384],
  heart: [384, 512],
  throat: [512, 768],
  thirdEye: [768, 1024],
  crown: [1024, 4000],
};

/** Wellness-friendly names for energy centres. */
const CENTRE_WELLNESS_NAMES: Record<EnergyCentreKey, string> = {
  root: "grounding",
  sacral: "creative flow",
  solarPlexus: "empowerment",
  heart: "heart-opening",
  throat: "expression",
  thirdEye: "intuition",
  crown: "transcendence",
};

const CENTRE_ORDER: EnergyCentreKey[] = [
  "root", "sacral", "solarPlexus", "heart", "throat", "thirdEye", "crown",
];

/** Default noise floor when room data is unavailable. */
const DEFAULT_NOISE_DB = -60;

export interface InstrumentProfile {
  instrumentId: string;
  fundamental: number;
  harmonics: HarmonicPeak[];
  energyCentres: Record<EnergyCentreKey, number>;
  compatibilityScore: number;
  centreCoverage: Record<EnergyCentreKey, number>;
  summary: string;
  /** Averaged frequency data for static spectrum display. */
  averagedSpectrum: Float32Array;
  timestamp: number;
}

interface ScoringInput {
  /** dB levels per energy centre from the instrument recording. */
  instrumentCentres: Record<EnergyCentreKey, number>;
  /** dB levels per energy centre from the ambient noise floor (null = use defaults). */
  noiseFloorBands: Record<string, number> | null;
  /** Overtone detection confidence 0–1. */
  overtoneConfidence: number;
  /** Detected harmonics. */
  harmonics: HarmonicPeak[];
}

/**
 * Compute room-instrument compatibility score (0–100).
 *
 * Three weighted components:
 *   - Resonance complement (40 pts): headroom between instrument and room noise
 *   - Spectral richness (35 pts): how many energy centres the instrument activates
 *   - Signal clarity (25 pts): overtone detection confidence
 */
export function computeCompatibilityScore(input: ScoringInput): number {
  const { instrumentCentres, noiseFloorBands, overtoneConfidence, harmonics } = input;

  // --- 1. Resonance complement (40 pts) ---
  let headroomSum = 0;
  let headroomCount = 0;

  for (const key of CENTRE_ORDER) {
    const instrumentLevel = instrumentCentres[key];
    const noiseLevel = noiseFloorBands?.[key] ?? DEFAULT_NOISE_DB;
    // Headroom = how much the instrument rises above the noise floor
    const headroom = instrumentLevel - noiseLevel;
    headroomSum += Math.max(0, headroom);
    headroomCount++;
  }

  const avgHeadroom = headroomCount > 0 ? headroomSum / headroomCount : 0;
  // Normalise: 0 dB headroom → 0 pts, 30+ dB → 40 pts
  const resonanceScore = Math.min(40, (avgHeadroom / 30) * 40);

  // --- 2. Spectral richness (35 pts) ---
  let activatedCentres = 0;
  for (const key of CENTRE_ORDER) {
    const instrumentLevel = instrumentCentres[key];
    const noiseLevel = noiseFloorBands?.[key] ?? DEFAULT_NOISE_DB;
    // Consider a centre "activated" if the instrument is 6+ dB above noise
    if (instrumentLevel - noiseLevel > 6) {
      activatedCentres++;
    }
  }

  // Normalise: activating 1/7 centres → 5 pts, 7/7 → 35 pts
  const richnessScore = (activatedCentres / CENTRE_ORDER.length) * 35;

  // --- 3. Signal clarity (25 pts) ---
  // Blend overtone confidence with harmonic count
  const harmonicBonus = Math.min(1, harmonics.length / 6);
  const clarityRaw = overtoneConfidence * 0.6 + harmonicBonus * 0.4;
  const clarityScore = clarityRaw * 25;

  return Math.max(0, Math.min(100, Math.round(resonanceScore + richnessScore + clarityScore)));
}

/**
 * Normalise energy centre dB values to 0–1 coverage values.
 * Maps the dB range [-80, 0] to [0, 1].
 */
export function computeCentreCoverage(
  instrumentCentres: Record<EnergyCentreKey, number>
): Record<EnergyCentreKey, number> {
  const coverage = {} as Record<EnergyCentreKey, number>;
  for (const key of CENTRE_ORDER) {
    const db = instrumentCentres[key];
    coverage[key] = Math.max(0, Math.min(1, (db + 80) / 80));
  }
  return coverage;
}

/**
 * Generate a practitioner-friendly summary describing how the instrument
 * performs in the room, referencing energy centres by wellness names.
 */
export function generateSummary(
  instrumentName: string,
  noteName: string,
  fundamental: number,
  centreCoverage: Record<EnergyCentreKey, number>,
  compatibilityScore: number,
  harmonics: HarmonicPeak[]
): string {
  // Find the strongest centres (coverage > 0.5)
  const strongCentres = CENTRE_ORDER
    .filter((key) => centreCoverage[key] > 0.5)
    .sort((a, b) => centreCoverage[b] - centreCoverage[a]);

  // Find the peak centre
  const peakCentre = CENTRE_ORDER.reduce((best, key) =>
    centreCoverage[key] > centreCoverage[best] ? key : best
  );

  const peakWellness = CENTRE_WELLNESS_NAMES[peakCentre];
  const fundamentalHz = Math.round(fundamental);

  // Build summary based on score range
  let opening: string;
  if (compatibilityScore >= 80) {
    opening = `Your ${noteName} ${instrumentName} resonates beautifully here`;
  } else if (compatibilityScore >= 60) {
    opening = `Your ${noteName} ${instrumentName} works well in this space`;
  } else if (compatibilityScore >= 40) {
    opening = `Your ${noteName} ${instrumentName} has moderate resonance here`;
  } else {
    opening = `Your ${noteName} ${instrumentName} faces some acoustic challenges in this room`;
  }

  // Describe harmonic richness
  let harmonicNote = "";
  if (harmonics.length >= 5) {
    harmonicNote = `, producing a rich overtone series up to the ${ordinal(harmonics.length)} harmonic`;
  } else if (harmonics.length >= 3) {
    harmonicNote = ` with clear harmonics`;
  }

  // Describe centre activation
  let centreNote: string;
  if (strongCentres.length >= 3) {
    const names = strongCentres.slice(0, 3).map((k) => CENTRE_WELLNESS_NAMES[k]);
    centreNote = `The room supports its ${names.join(", ")} frequencies`;
  } else if (strongCentres.length > 0) {
    centreNote = `It primarily activates ${peakWellness} frequencies at ${fundamentalHz} Hz`;
  } else {
    centreNote = `The room's acoustic profile limits its energy centre activation`;
  }

  return `${opening}${harmonicNote}. ${centreNote}.`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Determine which energy centre band a frequency falls into. */
export function frequencyToCentre(hz: number): EnergyCentreKey | null {
  for (const [key, [low, high]] of Object.entries(ENERGY_BANDS)) {
    if (hz >= low && hz < high) return key as EnergyCentreKey;
  }
  return hz >= 1024 ? "crown" : null;
}
