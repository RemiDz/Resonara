/**
 * RT60 (reverberation time) measurement using Schroeder backward integration.
 * Measures time for sound to decay by 60 dB after an impulse.
 */

/**
 * Compute the Schroeder backward integration curve from an impulse response.
 * Returns energy decay curve in dB.
 */
export function schroederIntegration(impulseResponse: Float32Array): Float32Array {
  const length = impulseResponse.length;
  const energyCurve = new Float32Array(length);

  // Square the impulse response to get energy
  const squared = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    squared[i] = impulseResponse[i] * impulseResponse[i];
  }

  // Backward integration: sum from end to current position
  energyCurve[length - 1] = squared[length - 1];
  for (let i = length - 2; i >= 0; i--) {
    energyCurve[i] = energyCurve[i + 1] + squared[i];
  }

  // Normalise to dB (relative to the initial energy)
  const maxEnergy = energyCurve[0];
  if (maxEnergy <= 0) {
    return energyCurve;
  }

  for (let i = 0; i < length; i++) {
    energyCurve[i] = 10 * Math.log10(energyCurve[i] / maxEnergy);
  }

  return energyCurve;
}

/**
 * Estimate RT60 from the Schroeder decay curve.
 * Uses T20 extrapolation: measures time for -5 dB to -25 dB decay and
 * extrapolates to 60 dB.
 */
export function estimateRT60(decayCurve: Float32Array, sampleRate: number): number {
  // Find -5 dB point
  let t5 = -1;
  for (let i = 0; i < decayCurve.length; i++) {
    if (decayCurve[i] <= -5) {
      t5 = i;
      break;
    }
  }

  // Find -25 dB point
  let t25 = -1;
  for (let i = 0; i < decayCurve.length; i++) {
    if (decayCurve[i] <= -25) {
      t25 = i;
      break;
    }
  }

  if (t5 < 0 || t25 < 0 || t25 <= t5) {
    // Not enough dynamic range — return a rough estimate using -10 dB point
    let t10 = -1;
    for (let i = 0; i < decayCurve.length; i++) {
      if (decayCurve[i] <= -10) {
        t10 = i;
        break;
      }
    }
    if (t10 <= 0) return 0;
    return (t10 / sampleRate) * 6; // Extrapolate from 10 dB to 60 dB
  }

  // T20 extrapolation: 20 dB of decay, multiply by 3 to get 60 dB
  const t20Seconds = (t25 - t5) / sampleRate;
  return t20Seconds * 3;
}

/**
 * Compute RT60 from a raw impulse response buffer.
 */
export function computeRT60(impulseResponse: Float32Array, sampleRate: number): number {
  const decayCurve = schroederIntegration(impulseResponse);
  return estimateRT60(decayCurve, sampleRate);
}

export interface RT60Result {
  rt60: number;
  decayCurve: Float32Array;
  quality: "good" | "fair" | "poor";
}

/**
 * Full RT60 analysis with quality assessment.
 */
export function analyseRT60(impulseResponse: Float32Array, sampleRate: number): RT60Result {
  const decayCurve = schroederIntegration(impulseResponse);
  const rt60 = estimateRT60(decayCurve, sampleRate);

  // Assess quality based on dynamic range
  let minDB = 0;
  for (let i = 0; i < decayCurve.length; i++) {
    if (decayCurve[i] < minDB) minDB = decayCurve[i];
  }

  let quality: RT60Result["quality"];
  if (minDB <= -35) quality = "good";
  else if (minDB <= -20) quality = "fair";
  else quality = "poor";

  return { rt60, decayCurve, quality };
}
