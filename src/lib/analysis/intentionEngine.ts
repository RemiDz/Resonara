/**
 * Intention-to-recommendation mapper.
 * Maps five practitioner intentions to energy centre priorities,
 * frequency ranges, and instrument recommendations.
 */

import type { EnergyCentreKey } from "@/hooks/useFFT";
import type { InstrumentProfile } from "@/lib/analysis/compatibilityScorer";

export type Intention =
  | "grounding"
  | "release"
  | "energising"
  | "heartOpening"
  | "integration";

export interface IntentionConfig {
  label: string;
  description: string;
  primaryCentres: EnergyCentreKey[];
  frequencyRange: [number, number];
  colourHue: number;
}

export const INTENTIONS: Record<Intention, IntentionConfig> = {
  grounding: {
    label: "Grounding",
    description: "Anchoring into the body with deep, resonant tones",
    primaryCentres: ["root", "sacral"],
    frequencyRange: [32, 256],
    colourHue: 15,
  },
  release: {
    label: "Release",
    description: "Letting go of held tension and stagnant energy",
    primaryCentres: ["sacral", "solarPlexus"],
    frequencyRange: [128, 384],
    colourHue: 30,
  },
  energising: {
    label: "Energising",
    description: "Activating vitality and clear expression",
    primaryCentres: ["solarPlexus", "throat"],
    frequencyRange: [256, 768],
    colourHue: 55,
  },
  heartOpening: {
    label: "Heart Opening",
    description: "Cultivating compassion and emotional connection",
    primaryCentres: ["heart", "throat"],
    frequencyRange: [384, 768],
    colourHue: 140,
  },
  integration: {
    label: "Integration",
    description: "Harmonising all centres into coherent wholeness",
    primaryCentres: ["root", "sacral", "solarPlexus", "heart", "throat", "thirdEye", "crown"],
    frequencyRange: [32, 4000],
    colourHue: 270,
  },
};

export const INTENTION_LIST: Array<{ key: Intention } & IntentionConfig> = (
  ["grounding", "release", "energising", "heartOpening", "integration"] as Intention[]
).map((key) => ({ key, ...INTENTIONS[key] }));

/**
 * Recommend instruments for a given intention, sorted by relevance.
 * Relevance = average coverage of the intention's primary energy centres.
 */
export function recommendInstruments(
  intention: Intention,
  profiles: InstrumentProfile[],
): Array<{ profile: InstrumentProfile; reason: string }> {
  const config = INTENTIONS[intention];
  const { primaryCentres } = config;

  const scored = profiles.map((profile) => {
    const relevance =
      primaryCentres.reduce(
        (sum, key) => sum + (profile.centreCoverage[key] ?? 0),
        0,
      ) / primaryCentres.length;

    // Find the strongest matching centre for the reason text
    const strongest = primaryCentres.reduce((best, key) =>
      (profile.centreCoverage[key] ?? 0) > (profile.centreCoverage[best] ?? 0) ? key : best,
    );

    const centreLabel = CENTRE_DISPLAY[strongest];
    const reason =
      relevance > 0.5
        ? `Strong ${centreLabel} resonance — ideal for ${config.label.toLowerCase()}`
        : relevance > 0.25
          ? `Moderate ${centreLabel} support`
          : `Light contribution to ${config.label.toLowerCase()} work`;

    return { profile, relevance, reason };
  });

  scored.sort((a, b) => b.relevance - a.relevance);

  return scored.map(({ profile, reason }) => ({ profile, reason }));
}

/**
 * Practitioner-friendly positioning advice for an intention.
 */
export function positioningAdvice(intention: Intention): string {
  switch (intention) {
    case "grounding":
      return "Place instruments close to the ground. Position the recipient lying down if possible, with bowls near the feet and lower body.";
    case "release":
      return "Position instruments around the torso. Allow space for the recipient to breathe deeply. Gentle movement between sacral and solar plexus zones works well.";
    case "energising":
      return "Elevate instruments to mid-body height. A seated position works well for the recipient. Direct sound toward the core and throat area.";
    case "heartOpening":
      return "Position instruments at chest height. The recipient should be comfortable and open — supine with arms uncrossed. Place primary instruments near the heart space.";
    case "integration":
      return "Distribute instruments at multiple heights around the body. Begin low and gradually introduce higher-pitched instruments. The recipient should be fully reclined for whole-body reception.";
  }
}

const CENTRE_DISPLAY: Record<EnergyCentreKey, string> = {
  root: "Root",
  sacral: "Sacral",
  solarPlexus: "Solar Plexus",
  heart: "Heart",
  throat: "Throat",
  thirdEye: "Third Eye",
  crown: "Crown",
};
