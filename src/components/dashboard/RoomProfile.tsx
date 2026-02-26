"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRoom } from "@/hooks/useRoom";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { RoomMandala } from "@/components/visualisations/RoomMandala";
import { BodyMap } from "@/components/visualisations/BodyMap";
import { ConditionsBanner } from "./ConditionsBanner";
import { InstrumentShelf } from "./InstrumentShelf";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";
import type { EnergyCentreKey } from "@/hooks/useFFT";

interface RoomProfileProps {
  roomId: string;
}

const CENTRE_LABELS: Record<EnergyCentreKey, string> = {
  root: "Root",
  sacral: "Sacral",
  solarPlexus: "Solar Plexus",
  heart: "Heart",
  throat: "Throat",
  thirdEye: "Third Eye",
  crown: "Crown",
};

/**
 * Main dashboard layout for a saved room profile.
 * Displays mandala, body map, conditions banner, and instrument shelf.
 */
export function RoomProfile({ roomId }: RoomProfileProps) {
  const { room, isLoading, error, updateName } = useRoom(roomId);
  const [activeZone, setActiveZone] = useState<EnergyCentreKey | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const handleStartEdit = useCallback(() => {
    if (room) {
      setNameValue(room.name);
      setIsEditingName(true);
    }
  }, [room]);

  const handleSaveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== room?.name) {
      await updateName(trimmed);
    }
    setIsEditingName(false);
  }, [nameValue, room?.name, updateName]);

  // Loading state — breathing mandala placeholder
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <MandalaCanvas width={200} height={200} active />
        <p className="mt-6 text-sm text-foreground-muted/60 animate-pulse">
          Loading room profile&hellip;
        </p>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <GlassPanel className="max-w-md w-full text-center">
          <p className="mb-4 text-foreground-muted/80">{error ?? "Room not found."}</p>
          <Link href="/">
            <GoldButton variant="secondary">Discover a Room</GoldButton>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  const createdDate = new Date(room.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Normalise energy centres to 0–1 for visualisation components
  const normalisedCentres = { ...room.energyCentres };
  const centreKeys = Object.keys(normalisedCentres) as EnergyCentreKey[];
  for (const key of centreKeys) {
    normalisedCentres[key] = Math.max(0, Math.min(1, (normalisedCentres[key] + 80) / 80));
  }

  return (
    <div className="min-h-screen px-4 py-8 animate-fade-in">
      <div className="mx-auto max-w-md flex flex-col gap-6">
        {/* 1. Editable room name */}
        <div className="text-center">
          {isEditingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
              }}
              autoFocus
              className="bg-transparent text-center text-2xl font-bold text-gold border-b border-gold/30 outline-none w-full"
            />
          ) : (
            <h1
              className="text-2xl font-bold text-gold cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleStartEdit}
              title="Click to rename"
            >
              {room.name}
            </h1>
          )}
          <p className="mt-1 text-xs text-foreground-muted/50">{createdDate}</p>
        </div>

        {/* 2. Overall score */}
        <div className="flex justify-center">
          <ScoreDisplay
            score={room.overallScore}
            label="Acoustic Wellness Score"
            sublabel="Overall room compatibility"
            size="lg"
          />
        </div>

        {/* 3. Room mandala */}
        <div className="flex justify-center">
          <RoomMandala
            energyCentres={normalisedCentres}
            width={300}
            height={300}
          />
        </div>

        {/* 4. Body map with detail overlay */}
        <div className="relative flex flex-col items-center">
          <BodyMap
            coverage={normalisedCentres}
            activeZone={activeZone}
            onZoneTap={(key) => setActiveZone(activeZone === key ? null : key)}
            width={250}
            height={400}
          />
          {/* Zone detail overlay */}
          {activeZone && (
            <GlassPanel className="mt-2 w-full text-center animate-fade-in">
              <p className="text-sm font-bold text-gold">{CENTRE_LABELS[activeZone]}</p>
              <p className="text-xs text-foreground-muted/70">
                Response: {Math.round(normalisedCentres[activeZone] * 100)}%
              </p>
              <p className="text-xs text-foreground-muted/50 mt-1">
                {room.energyCentres[activeZone].toFixed(1)} dB average
              </p>
            </GlassPanel>
          )}
        </div>

        {/* 5. Conditions banner */}
        {room.noiseFloor && (
          <ConditionsBanner baselineNoiseFloor={room.noiseFloor} />
        )}

        {/* 6. Instrument shelf */}
        {room.instrumentProfiles.length > 0 && (
          <InstrumentShelf profiles={room.instrumentProfiles} />
        )}

        {/* 7. Prepare Session */}
        <div className="flex justify-center">
          <Link href={`/session?roomId=${roomId}`}>
            <GoldButton>Prepare Session</GoldButton>
          </Link>
        </div>

        {/* 8. Navigation */}
        <div className="flex justify-center pt-4 pb-8">
          <Link href="/">
            <GoldButton variant="secondary">Discover Another Room</GoldButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
