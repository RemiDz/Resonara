/**
 * Overtone / harmonic detection using Harmonic Product Spectrum (HPS).
 * Identifies fundamental frequency and prominent overtones from FFT data.
 */

export interface HarmonicPeak {
  frequency: number;
  amplitude: number;
  /** Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.) */
  harmonicNumber: number;
}

export interface OvertoneResult {
  fundamental: number;
  harmonics: HarmonicPeak[];
  confidence: number;
}

/**
 * Harmonic Product Spectrum — multiply downsampled copies of the spectrum
 * to find the fundamental frequency.
 */
export function harmonicProductSpectrum(
  magnitudeSpectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
  numHarmonics: number = 5
): number {
  const halfLength = Math.floor(magnitudeSpectrum.length / numHarmonics);
  const hps = new Float32Array(halfLength);

  // Convert dB to linear for multiplication
  for (let i = 0; i < halfLength; i++) {
    hps[i] = Math.pow(10, magnitudeSpectrum[i] / 20);
  }

  // Multiply downsampled versions
  for (let h = 2; h <= numHarmonics; h++) {
    for (let i = 0; i < halfLength; i++) {
      const sourceIdx = i * h;
      if (sourceIdx < magnitudeSpectrum.length) {
        hps[i] *= Math.pow(10, magnitudeSpectrum[sourceIdx] / 20);
      }
    }
  }

  // Find peak (skip DC and very low bins)
  const minBin = Math.ceil((20 * fftSize) / sampleRate); // Start from ~20 Hz
  let maxVal = -Infinity;
  let maxBin = minBin;

  for (let i = minBin; i < halfLength; i++) {
    if (hps[i] > maxVal) {
      maxVal = hps[i];
      maxBin = i;
    }
  }

  return (maxBin * sampleRate) / fftSize;
}

/**
 * Find spectral peaks above a threshold.
 */
export function findSpectralPeaks(
  magnitudeSpectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
  thresholdDB: number = -60,
  minDistance: number = 5
): Array<{ bin: number; frequency: number; amplitude: number }> {
  const peaks: Array<{ bin: number; frequency: number; amplitude: number }> = [];

  for (let i = 2; i < magnitudeSpectrum.length - 2; i++) {
    if (
      magnitudeSpectrum[i] > thresholdDB &&
      magnitudeSpectrum[i] > magnitudeSpectrum[i - 1] &&
      magnitudeSpectrum[i] > magnitudeSpectrum[i + 1] &&
      magnitudeSpectrum[i] > magnitudeSpectrum[i - 2] &&
      magnitudeSpectrum[i] > magnitudeSpectrum[i + 2]
    ) {
      // Check minimum distance from previous peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1].bin >= minDistance) {
        peaks.push({
          bin: i,
          frequency: (i * sampleRate) / fftSize,
          amplitude: magnitudeSpectrum[i],
        });
      }
    }
  }

  return peaks.sort((a, b) => b.amplitude - a.amplitude);
}

/**
 * Detect overtones: find the fundamental and classify harmonics.
 */
export function detectOvertones(
  magnitudeSpectrum: Float32Array,
  sampleRate: number,
  fftSize: number
): OvertoneResult {
  const fundamental = harmonicProductSpectrum(magnitudeSpectrum, sampleRate, fftSize);
  const peaks = findSpectralPeaks(magnitudeSpectrum, sampleRate, fftSize);

  const harmonics: HarmonicPeak[] = [];
  let matchCount = 0;

  for (const peak of peaks.slice(0, 16)) {
    const ratio = peak.frequency / fundamental;
    const nearestHarmonic = Math.round(ratio);

    if (nearestHarmonic >= 1 && Math.abs(ratio - nearestHarmonic) < 0.08) {
      harmonics.push({
        frequency: peak.frequency,
        amplitude: peak.amplitude,
        harmonicNumber: nearestHarmonic,
      });
      matchCount++;
    }
  }

  // Confidence: ratio of peaks matching harmonics
  const confidence = peaks.length > 0 ? matchCount / Math.min(peaks.length, 10) : 0;

  return { fundamental, harmonics, confidence };
}
