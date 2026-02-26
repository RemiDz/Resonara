/**
 * FFT analyser — wraps AnalyserNode for frequency-domain analysis.
 * Uses fftSize 8192 for ~5.4 Hz resolution at 44.1 kHz.
 */

import { getAudioContext } from "./audioContext";

export interface FFTAnalyser {
  analyser: AnalyserNode;
  /** Get frequency data as Float32Array (dB values). */
  getFrequencyData: () => Float32Array;
  /** Get time-domain waveform data. */
  getTimeDomainData: () => Float32Array;
  /** Frequency resolution in Hz per bin. */
  frequencyResolution: number;
  /** Connect an audio source node to this analyser. */
  connectSource: (source: AudioNode) => void;
  /** Disconnect the analyser. */
  disconnect: () => void;
}

export function createFFTAnalyser(fftSize: number = 8192): FFTAnalyser {
  const ctx = getAudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.8;

  const frequencyResolution = ctx.sampleRate / fftSize;
  const frequencyData = new Float32Array(analyser.frequencyBinCount);
  const timeDomainData = new Float32Array(analyser.fftSize);

  return {
    analyser,
    frequencyResolution,
    getFrequencyData() {
      analyser.getFloatFrequencyData(frequencyData);
      return frequencyData;
    },
    getTimeDomainData() {
      analyser.getFloatTimeDomainData(timeDomainData);
      return timeDomainData;
    },
    connectSource(source: AudioNode) {
      source.connect(analyser);
    },
    disconnect() {
      analyser.disconnect();
    },
  };
}

/**
 * Convert FFT bin index to frequency in Hz.
 */
export function binToFrequency(bin: number, sampleRate: number, fftSize: number): number {
  return (bin * sampleRate) / fftSize;
}

/**
 * Convert frequency in Hz to the nearest FFT bin index.
 */
export function frequencyToBin(freq: number, sampleRate: number, fftSize: number): number {
  return Math.round((freq * fftSize) / sampleRate);
}

/**
 * Extract average energy in a frequency band (in dB).
 */
export function bandEnergy(
  frequencyData: Float32Array,
  lowFreq: number,
  highFreq: number,
  sampleRate: number,
  fftSize: number
): number {
  const lowBin = frequencyToBin(lowFreq, sampleRate, fftSize);
  const highBin = frequencyToBin(highFreq, sampleRate, fftSize);
  let sum = 0;
  let count = 0;
  for (let i = lowBin; i <= highBin && i < frequencyData.length; i++) {
    sum += frequencyData[i];
    count++;
  }
  return count > 0 ? sum / count : -Infinity;
}
