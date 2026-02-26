/**
 * Hz-to-musical-note converter using 12-TET (A4 = 440 Hz).
 */

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
] as const;

export interface NoteInfo {
  /** Display name e.g. "F#3" */
  name: string;
  /** Note letter e.g. "F#" */
  noteName: string;
  /** Octave number */
  octave: number;
  /** Exact frequency of the nearest note in Hz */
  exactFrequency: number;
  /** Cents deviation from the nearest note (-50 to +50) */
  cents: number;
}

/**
 * Convert a frequency in Hz to the nearest musical note.
 * Uses 12-TET with A4 = 440 Hz as reference.
 */
export function frequencyToNote(hz: number): NoteInfo {
  // Semitones from A4
  const semitones = 12 * Math.log2(hz / 440);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);

  // MIDI note number (A4 = 69)
  const midi = 69 + roundedSemitones;
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteName = NOTE_NAMES[noteIndex];
  const exactFrequency = 440 * Math.pow(2, roundedSemitones / 12);

  return {
    name: `${noteName}${octave}`,
    noteName,
    octave,
    exactFrequency: Math.round(exactFrequency * 100) / 100,
    cents,
  };
}

/**
 * Convert a note name and octave to frequency in Hz.
 */
export function noteToFrequency(noteName: string, octave: number): number {
  const index = NOTE_NAMES.indexOf(noteName as typeof NOTE_NAMES[number]);
  if (index === -1) return 0;

  const midi = (octave + 1) * 12 + index;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
