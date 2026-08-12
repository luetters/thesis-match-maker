import { desc, eq } from "drizzle-orm";
import { colloquiumRoomBlocks } from "../drizzle/schema";
import { getDb } from "./db";

function toDbDate(value: Date | number): string {
  const date = typeof value === "number" ? new Date(value) : value;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function getColloquiumRoomBlocks() {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  return db.select().from(colloquiumRoomBlocks).orderBy(desc(colloquiumRoomBlocks.startsAt));
}

export async function createColloquiumRoomBlock(input: {
  location?: string | null;
  room: string;
  startsAt: number;
  endsAt: number;
  reason?: string | null;
  createdById: number;
}) {
  if (input.endsAt <= input.startsAt) throw new Error("Das Ende der Sperrzeit muss nach dem Beginn liegen");
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const [result] = await db.insert(colloquiumRoomBlocks).values({
    location: input.location?.trim() || null,
    room: input.room.trim(),
    startsAt: toDbDate(input.startsAt),
    endsAt: toDbDate(input.endsAt),
    reason: input.reason?.trim() || null,
    source: "manual",
    createdById: input.createdById,
  });
  return Number((result as any).insertId);
}

export async function updateColloquiumRoomBlock(input: {
  id: number;
  location?: string | null;
  room: string;
  startsAt: number;
  endsAt: number;
  reason?: string | null;
}) {
  if (input.endsAt <= input.startsAt) throw new Error("Das Ende der Sperrzeit muss nach dem Beginn liegen");
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.update(colloquiumRoomBlocks).set({
    location: input.location?.trim() || null,
    room: input.room.trim(),
    startsAt: toDbDate(input.startsAt),
    endsAt: toDbDate(input.endsAt),
    reason: input.reason?.trim() || null,
    source: "manual",
    externalReference: null,
  }).where(eq(colloquiumRoomBlocks.id, input.id));
}

export async function deleteColloquiumRoomBlock(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.delete(colloquiumRoomBlocks).where(eq(colloquiumRoomBlocks.id, id));
}
