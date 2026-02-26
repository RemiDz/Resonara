/**
 * Transient detector — identifies sudden onset events (claps, strikes).
 * Used in the Clap Test phase of Room Discovery.
 */

export interface TransientEvent {
  /** Sample index where transient was detected. */
  sampleIndex: number;
  /** Time in seconds from start of buffer. */
  timeSeconds: number;
  /** Peak amplitude of the transient. */
  peakAmplitude: number;
  /** Energy ratio (transient energy vs background). */
  energyRatio: number;
}

export interface TransientDetectorConfig {
  /** Threshold in dB above noise floor to trigger detection. */
  thresholdDB: number;
  /** Minimum peak amplitude (0–1) to qualify as a transient. */
  minAmplitude: number;
  /** Minimum time (seconds) between detected transients. */
  minIntervalSeconds: number;
  /** Analysis window size in samples. */
  windowSize: number;
}

const DEFAULT_CONFIG: TransientDetectorConfig = {
  thresholdDB: 6,
  minAmplitude: 0.1,
  minIntervalSeconds: 0.3,
  windowSize: 512,
};

/**
 * Detect transients in an audio buffer.
 */
export function detectTransients(
  buffer: Float32Array,
  sampleRate: number,
  config: Partial<TransientDetectorConfig> = {}
): TransientEvent[] {
  const { thresholdDB, minAmplitude, minIntervalSeconds, windowSize } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const events: TransientEvent[] = [];
  const minIntervalSamples = Math.floor(minIntervalSeconds * sampleRate);

  // Compute short-term energy in sliding windows
  const numWindows = Math.floor(buffer.length / windowSize);
  const energies = new Float32Array(numWindows);

  for (let w = 0; w < numWindows; w++) {
    let sum = 0;
    const start = w * windowSize;
    for (let i = 0; i < windowSize; i++) {
      sum += buffer[start + i] * buffer[start + i];
    }
    energies[w] = sum / windowSize;
  }

  // Compute running average energy (background estimate)
  const avgWindowSize = Math.min(20, numWindows);
  const thresholdLinear = Math.pow(10, thresholdDB / 10);
  let lastDetectedSample = -minIntervalSamples;

  for (let w = avgWindowSize; w < numWindows; w++) {
    // Average energy of preceding windows
    let bgEnergy = 0;
    for (let j = w - avgWindowSize; j < w; j++) {
      bgEnergy += energies[j];
    }
    bgEnergy /= avgWindowSize;

    const ratio = bgEnergy > 0 ? energies[w] / bgEnergy : 0;
    const sampleIndex = w * windowSize;

    if (ratio > thresholdLinear && sampleIndex - lastDetectedSample >= minIntervalSamples) {
      // Find peak amplitude within the window
      let peak = 0;
      for (let i = 0; i < windowSize; i++) {
        const abs = Math.abs(buffer[sampleIndex + i]);
        if (abs > peak) peak = abs;
      }

      // Amplitude gate — ignore quiet noise spikes
      if (peak < minAmplitude) continue;

      events.push({
        sampleIndex,
        timeSeconds: sampleIndex / sampleRate,
        peakAmplitude: peak,
        energyRatio: ratio,
      });

      lastDetectedSample = sampleIndex;
    }
  }

  return events;
}

/**
 * Extract the impulse response segment after a detected transient.
 * Captures the decay following the transient onset.
 */
export function extractImpulseResponse(
  buffer: Float32Array,
  transient: TransientEvent,
  durationSeconds: number,
  sampleRate: number
): Float32Array {
  const startSample = transient.sampleIndex;
  const length = Math.min(
    Math.floor(durationSeconds * sampleRate),
    buffer.length - startSample
  );

  if (length <= 0) {
    return new Float32Array(0);
  }

  return buffer.slice(startSample, startSample + length);
}
