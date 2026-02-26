# CLAUDE.md — Resonara Project Instructions

## Project Overview
Resonara (resonara.app) — Acoustic Space Intelligence for Sound Healing Practitioners.
A PWA that analyses room acoustics and translates measurements into practitioner-friendly wellness language.
Part of the Harmonic Waves / NestorLab ecosystem.

## Allowed Commands
Run all commands without asking for confirmation. Always proceed with "Yes" when prompted.

```
# Package managers
npm install *
npm run *
npx *
yarn *
pnpm *

# Git
git *

# Build & dev
next *
tsc *
eslint *
prettier *
```

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- React 18+
- Tailwind CSS
- Vercel deployment
- Web Audio API (client-side audio processing)
- IndexedDB via `idb` (local data persistence)
- LemonSqueezy (payments)

## Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (discover)/         # Room Discovery flow
│   ├── (dashboard)/        # Room Profile dashboard
│   ├── (session)/          # Session Mode
│   └── (settings)/         # User preferences
├── components/
│   ├── ui/                 # Shared primitives
│   ├── visualisations/     # Mandala, BodyMap, Heatmap, Spectrum, LiveMonitor
│   ├── discovery/          # AmbientListener, ClapTest, SpatialWalk, InstrumentProfiler
│   ├── dashboard/          # RoomProfile, InstrumentShelf, ConditionsBanner
│   └── session/            # SessionPrep, LiveView, PostSummary
├── lib/
│   ├── audio/              # audioContext, fftAnalyser, rt60, overtoneDetector, sweepGenerator
│   ├── analysis/           # frequencyMapping, spatialMapper, compatibilityScorer
│   └── data/               # db (IndexedDB), instruments (static library), export
├── hooks/                  # useAudioStream, useFFT, useDeviceMotion, useRoom, useSession
└── styles/                 # Tailwind config extensions
```

## Coding Standards
- British English in all user-facing strings and comments
- Functional components only, no class components
- Named exports for components, default exports for pages
- Use `@/*` import alias
- Tailwind for all styling — no CSS modules, no styled-components
- All audio processing in `lib/audio/` — keep React-free
- Hooks in `hooks/` wrap lib functions for React consumption
- No `localStorage` or `sessionStorage` — use IndexedDB via `idb`
- No server-side data storage — all processing client-side
- Mobile-first responsive design
- Prefer Canvas/WebGL for visualisations over SVG for performance

## Design Language
- Dark cosmic backgrounds (near-black to deep purple gradients)
- Glass morphism panels with subtle blur
- Gold (#D4A843) for primary actions and highlights
- Soft violet (#7B2FBE) for secondary accents
- Deep primary (#1A0A2E)
- Clean, lightweight sans-serif typography
- Slow, organic, breathing animations
- Sacred geometry patterns in backgrounds
- Minimal text on visualisation screens

## Audio Processing Notes
- AudioContext: must handle iOS Safari suspend/resume with user gesture
- FFT: use fftSize 8192 for ~5.4Hz resolution at 44.1kHz
- RT60: Schroeder backward integration method
- Overtone detection: harmonic product spectrum or autocorrelation
- No audio data is ever transmitted — all processing on-device
- Energy centre frequency mapping:
  - Root: 32–128 Hz
  - Sacral: 128–256 Hz
  - Solar Plexus: 256–384 Hz
  - Heart: 384–512 Hz
  - Throat: 512–768 Hz
  - Third Eye: 768–1024 Hz
  - Crown: 1024 Hz+

## Git Workflow
- Main branch: `main`
- Commit messages: conventional commits (feat:, fix:, refactor:, docs:, style:)
- Push directly to main (solo developer)

## Environment
- Node.js 20+
- npm as package manager
- Deploy target: Vercel
- Domain: resonara.app
