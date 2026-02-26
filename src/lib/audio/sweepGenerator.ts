/**
 * Sweep (chirp) generator for room impulse response measurement.
 * Generates logarithmic sine sweeps and computes impulse responses
 * via deconvolution.
 */

import { getAudioContext } from "./audioContext";

export interface SweepConfig {
  startFreq: number;
  endFreq: number;
  durationSeconds: number;
  sampleRate?: number;
}

/**
 * Generate a logarithmic sine sweep buffer.
 */
export function generateLogSweep(config: SweepConfig): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = config.sampleRate ?? ctx.sampleRate;
  const length = Math.floor(sampleRate * config.durationSeconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const { startFreq, endFreq, durationSeconds } = config;
  const k = (endFreq / startFreq) ** (1 / durationSeconds);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const phase =
      (2 * Math.PI * startFreq * (Math.pow(k, t) - 1)) / Math.log(k);
    data[i] = Math.sin(phase) * 0.8;
  }

  // Apply fade-in/out to avoid clicks (50 ms each)
  const fadeLength = Math.floor(sampleRate * 0.05);
  for (let i = 0; i < fadeLength; i++) {
    const gain = i / fadeLength;
    data[i] *= gain;
    data[length - 1 - i] *= gain;
  }

  return buffer;
}

/**
 * Play a sweep through the speakers and return the AudioBufferSourceNode.
 */
export function playSweep(buffer: AudioBuffer): AudioBufferSourceNode {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  return source;
}

/**
 * Compute the inverse filter for a logarithmic sweep.
 * The inverse filter decays in amplitude over time (compensating for
 * the energy distribution of the log sweep).
 */
export function computeInverseFilter(sweepBuffer: AudioBuffer): Float32Array {
  const data = sweepBuffer.getChannelData(0);
  const length = data.length;
  const inverse = new Float32Array(length);

  // Time-reverse the sweep
  for (let i = 0; i < length; i++) {
    inverse[i] = data[length - 1 - i];
  }

  // Apply amplitude envelope: exponential decay to compensate log sweep energy
  const decayRate = 6 / length; // ~6 dB/octave compensation
  for (let i = 0; i < length; i++) {
    inverse[i] *= Math.exp(-decayRate * i);
  }

  // Normalise
  let maxVal = 0;
  for (let i = 0; i < length; i++) {
    if (Math.abs(inverse[i]) > maxVal) maxVal = Math.abs(inverse[i]);
  }
  if (maxVal > 0) {
    for (let i = 0; i < length; i++) {
      inverse[i] /= maxVal;
    }
  }

  return inverse;
}
