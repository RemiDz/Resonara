"use client";

import { useState, useEffect, useCallback } from "react";
import { getRoom, updateRoomName as dbUpdateName } from "@/lib/data/db";
import type { RoomRecord, SerializedInstrumentProfile } from "@/lib/data/db";
import type { InstrumentProfile } from "@/lib/analysis/compatibilityScorer";

/** Room record with Float32Array spectrums restored for visualisation components. */
export interface HydratedRoom extends Omit<RoomRecord, "instrumentProfiles"> {
  instrumentProfiles: InstrumentProfile[];
}

function hydrateProfiles(serialised: SerializedInstrumentProfile[]): InstrumentProfile[] {
  return serialised.map((p) => ({
    ...p,
    averagedSpectrum: new Float32Array(p.averagedSpectrum),
  }));
}

export interface UseRoomReturn {
  room: HydratedRoom | null;
  isLoading: boolean;
  error: string | null;
  updateName: (name: string) => Promise<void>;
}

/**
 * Loads a room from IndexedDB by id and hydrates serialised arrays.
 */
export function useRoom(roomId: string | null): UseRoomReturn {
  const [room, setRoom] = useState<HydratedRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getRoom(roomId)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setError("Room not found.");
          setRoom(null);
        } else {
          setRoom({
            ...record,
            instrumentProfiles: hydrateProfiles(record.instrumentProfiles),
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load room.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const updateName = useCallback(
    async (name: string) => {
      if (!roomId || !room) return;
      await dbUpdateName(roomId, name);
      setRoom((prev) => (prev ? { ...prev, name } : prev));
    },
    [roomId, room],
  );

  return { room, isLoading, error, updateName };
}
