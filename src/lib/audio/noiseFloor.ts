/**
 * Noise floor estimation — determines the ambient noise level of the room.
 * Used for calibration and to assess measurement quality.
 */

export interface NoiseFloorResult {
  /** Average RMS level in dB. */
  averageDB: number;
  /** Peak level in dB. */
  peakDB: number;
  /** Estimated A-weighted noise level (approximate). */
  estimatedDBA: number;
  /** Per-band noise levels for the energy centres. */
  bandLevels: Record<string, number>;
  /** Quality rating for sound healing practice. */
  rating: "excellent" | "good" | "fair" | "poor";
}

/** Energy centre frequency bands as defined in the spec. */
const ENERGY_BANDS: Record<string, [number, number]> = {
  root: [32, 128],
  sacral: [128, 256],
  solarPlexus: [256, 384],
  heart: [384, 512],
  throat: [512, 768],
  thirdEye: [768, 1024],
  crown: [1024, 4000],
};

/**
 * Compute RMS of a time-domain buffer.
 */
export function computeRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Convert linear amplitude to dB (relative to full scale).
 */
export function linearToDB(value: number): number {
  return 20 * Math.log10(Math.max(value, 1e-10));
}

/**
 * Analyse noise floor from collected samples.
 * @param samples Array of RMS measurements over time
 * @param frequencySnapshots Array of frequency-domain snapshots
 * @param sampleRate Audio sample rate
 * @param fftSize FFT size used for analysis
 */
export function analyseNoiseFloor(
  samples: number[],
  frequencySnapshots: Float32Array[],
  sampleRate: number,
  fftSize: number
): NoiseFloorResult {
  // Average and peak RMS
  const avgRMS = samples.reduce((a, b) => a + b, 0) / samples.length;
  const peakRMS = Math.max(...samples);
  const averageDB = linearToDB(avgRMS);
  const peakDB = linearToDB(peakRMS);

  // Compute per-band noise levels from frequency snapshots
  const bandLevels: Record<string, number> = {};

  if (frequencySnapshots.length > 0) {
    for (const [name, [lowFreq, highFreq]] of Object.entries(ENERGY_BANDS)) {
      const lowBin = Math.round((lowFreq * fftSize) / sampleRate);
      const highBin = Math.round((highFreq * fftSize) / sampleRate);
      let bandSum = 0;
      let count = 0;

      for (const snapshot of frequencySnapshots) {
        for (let bin = lowBin; bin <= highBin && bin < snapshot.length; bin++) {
          bandSum += snapshot[bin];
          count++;
        }
      }

      bandLevels[name] = count > 0 ? bandSum / count : -Infinity;
    }
  }

  // Rough A-weighting approximation (simplified)
  const estimatedDBA = averageDB + 3; // Rough offset

  // Rating based on average noise level
  let rating: NoiseFloorResult["rating"];
  if (averageDB < -50) rating = "excellent";
  else if (averageDB < -40) rating = "good";
  else if (averageDB < -30) rating = "fair";
  else rating = "poor";

  return { averageDB, peakDB, estimatedDBA, bandLevels, rating };
}
