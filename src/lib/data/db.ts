/**
 * IndexedDB persistence layer via `idb`.
 * Stores room profiles, instrument profiles, and sessions.
 * All data stays on-device — nothing is transmitted.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { NoiseFloorResult } from "@/lib/audio/noiseFloor";
import type { EnergyCentreKey } from "@/hooks/useFFT";
import type { HarmonicPeak } from "@/lib/audio/overtoneDetector";

// ---------------------------------------------------------------------------
// Serialisable types (Float32Array → number[])
// ---------------------------------------------------------------------------

export interface SerializedClapResult {
  rt60: number;
  decayCurve: number[];
  quality: "good" | "fair" | "poor";
  peakAmplitude: number;
  timeSeconds: number;
}

export interface SerializedInstrumentProfile {
  instrumentId: string;
  fundamental: number;
  harmonics: HarmonicPeak[];
  energyCentres: Record<EnergyCentreKey, number>;
  compatibilityScore: number;
  centreCoverage: Record<EnergyCentreKey, number>;
  summary: string;
  averagedSpectrum: number[];
  timestamp: number;
}

export interface RoomRecord {
  id: string;
  name: string;
  createdAt: number;
  overallScore: number;
  noiseFloor: NoiseFloorResult | null;
  clapResults: SerializedClapResult[];
  instrumentProfiles: SerializedInstrumentProfile[];
  energyCentres: Record<EnergyCentreKey, number>;
}

// ---------------------------------------------------------------------------
// DB schema
// ---------------------------------------------------------------------------

interface ResonaraDB extends DBSchema {
  rooms: {
    key: string;
    value: RoomRecord;
    indexes: { "by-createdAt": number };
  };
  instrumentProfiles: {
    key: string;
    value: SerializedInstrumentProfile & { id: string; roomId: string };
    indexes: { "by-roomId": string };
  };
  sessions: {
    key: string;
    value: { id: string; roomId: string; createdAt: number; data: unknown };
    indexes: { "by-roomId": string };
  };
}

// ---------------------------------------------------------------------------
// Singleton database handle
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBPDatabase<ResonaraDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ResonaraDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ResonaraDB>("resonara-db", 1, {
      upgrade(db) {
        // rooms store
        const roomStore = db.createObjectStore("rooms", { keyPath: "id" });
        roomStore.createIndex("by-createdAt", "createdAt");

        // instrumentProfiles store
        const ipStore = db.createObjectStore("instrumentProfiles", { keyPath: "id" });
        ipStore.createIndex("by-roomId", "roomId");

        // sessions store
        const sessStore = db.createObjectStore("sessions", { keyPath: "id" });
        sessStore.createIndex("by-roomId", "roomId");
      },
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Room CRUD
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Save a room record. Returns the generated id.
 */
export async function saveRoom(room: Omit<RoomRecord, "id">): Promise<string> {
  const db = await getDB();
  const id = generateId();
  const record: RoomRecord = { ...room, id };
  await db.put("rooms", record);
  return id;
}

/**
 * Retrieve a single room by id.
 */
export async function getRoom(id: string): Promise<RoomRecord | undefined> {
  const db = await getDB();
  return db.get("rooms", id);
}

/**
 * Retrieve all rooms, newest first.
 */
export async function getAllRooms(): Promise<RoomRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("rooms", "by-createdAt");
  return all.reverse();
}

/**
 * Update only the room name.
 */
export async function updateRoomName(id: string, name: string): Promise<void> {
  const db = await getDB();
  const room = await db.get("rooms", id);
  if (!room) return;
  room.name = name;
  await db.put("rooms", room);
}

/**
 * Delete a room by id.
 */
export async function deleteRoom(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("rooms", id);
}

// ---------------------------------------------------------------------------
// Session types (fits existing `sessions` store without schema change)
// ---------------------------------------------------------------------------

export interface SessionSnapshot {
  time: number; // seconds from session start
  centres: Record<EnergyCentreKey, number>;
}

export interface SessionData {
  intention: string;
  startedAt: number;
  durationSeconds: number;
  snapshots: SessionSnapshot[];
  peakMoments: Array<{ time: number; totalEnergy: number; peakCentre: EnergyCentreKey }>;
  averageCentres: Record<EnergyCentreKey, number>;
  qualityScore: number;
}

export interface SessionRecord {
  id: string;
  roomId: string;
  createdAt: number;
  data: SessionData;
}

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------

/**
 * Save a session record. Returns the generated id.
 */
export async function saveSession(
  session: Omit<SessionRecord, "id">,
): Promise<string> {
  const db = await getDB();
  const id = generateId();
  const record = { ...session, id } as SessionRecord;
  await db.put("sessions", record as unknown as ResonaraDB["sessions"]["value"]);
  return id;
}

/**
 * Retrieve a single session by id.
 */
export async function getSession(id: string): Promise<SessionRecord | undefined> {
  const db = await getDB();
  const raw = await db.get("sessions", id);
  return raw as unknown as SessionRecord | undefined;
}

/**
 * Retrieve all sessions for a room, newest first.
 */
export async function getSessionsByRoom(roomId: string): Promise<SessionRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("sessions", "by-roomId", roomId);
  return (all as unknown as SessionRecord[]).reverse();
}
