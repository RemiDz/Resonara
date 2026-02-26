export {
  getAudioContext,
  resumeAudioContext,
  closeAudioContext,
  getMicrophoneStream,
  createMicSource,
} from "./audioContext";

export { createFFTAnalyser, binToFrequency, frequencyToBin, bandEnergy } from "./fftAnalyser";
export type { FFTAnalyser } from "./fftAnalyser";

export { schroederIntegration, estimateRT60, computeRT60, analyseRT60 } from "./rt60";
export type { RT60Result } from "./rt60";

export {
  harmonicProductSpectrum,
  findSpectralPeaks,
  detectOvertones,
} from "./overtoneDetector";
export type { HarmonicPeak, OvertoneResult } from "./overtoneDetector";

export { generateLogSweep, playSweep, computeInverseFilter } from "./sweepGenerator";
export type { SweepConfig } from "./sweepGenerator";

export { computeRMS, linearToDB, analyseNoiseFloor } from "./noiseFloor";
export type { NoiseFloorResult } from "./noiseFloor";

export { detectTransients, extractImpulseResponse } from "./transientDetector";
export type { TransientEvent, TransientDetectorConfig } from "./transientDetector";

export { frequencyToNote, noteToFrequency } from "./noteMapper";
export type { NoteInfo } from "./noteMapper";
