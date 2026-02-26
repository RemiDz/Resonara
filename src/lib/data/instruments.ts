/**
 * Static instrument library for the Instrument Profiler.
 */

export interface InstrumentDef {
  id: string;
  name: string;
  icon: string;
  /** Typical frequency range [lowHz, highHz] */
  typicalRange: [number, number];
  category: "bowl" | "percussion" | "string" | "wind" | "voice";
}

export const INSTRUMENTS: InstrumentDef[] = [
  {
    id: "singing-bowl",
    name: "Singing Bowl",
    icon: "\u{1F514}",
    typicalRange: [150, 800],
    category: "bowl",
  },
  {
    id: "crystal-bowl",
    name: "Crystal Bowl",
    icon: "\u{1F48E}",
    typicalRange: [200, 900],
    category: "bowl",
  },
  {
    id: "gong",
    name: "Gong",
    icon: "\u{1F941}",
    typicalRange: [40, 300],
    category: "percussion",
  },
  {
    id: "tuning-fork",
    name: "Tuning Fork",
    icon: "\u{1FA88}",
    typicalRange: [128, 4096],
    category: "percussion",
  },
  {
    id: "monochord",
    name: "Monochord",
    icon: "\u{1F3B8}",
    typicalRange: [60, 400],
    category: "string",
  },
  {
    id: "didgeridoo",
    name: "Didgeridoo",
    icon: "\u{1F3B5}",
    typicalRange: [50, 150],
    category: "wind",
  },
  {
    id: "voice",
    name: "Voice",
    icon: "\u{1F5E3}\u{FE0F}",
    typicalRange: [80, 1200],
    category: "voice",
  },
  {
    id: "frame-drum",
    name: "Frame Drum",
    icon: "\u{1FA98}",
    typicalRange: [60, 300],
    category: "percussion",
  },
  {
    id: "chimes",
    name: "Chimes",
    icon: "\u{1F390}",
    typicalRange: [500, 4000],
    category: "percussion",
  },
  {
    id: "tingsha",
    name: "Tingsha",
    icon: "\u{1F514}",
    typicalRange: [2000, 4500],
    category: "percussion",
  },
];

export function getInstrumentById(id: string): InstrumentDef | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}
