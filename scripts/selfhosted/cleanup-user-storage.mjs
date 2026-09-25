#!/usr/bin/env node
/**
 * Entfernt ausschließlich die über stdin übergebenen, bereits referenzierten
 * personenbezogenen Speicherschlüssel. Öffentliche Studiengangsmedien sind nicht
 * Teil der vom Reset-Skript erzeugten Eingabe und bleiben erhalten.
 */
import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const rawInput = await new Promise((resolveInput, reject) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolveInput(Buffer.concat(chunks).toString("utf8")));
  process.stdin.on("error", reject);
});
const keys = [...new Set(rawInput.split(/\r?\n/).map((key) => key.trim()).filter(Boolean))];

function safeKey(key) {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (!normalized || normalized.includes("\0") || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Ungültiger Speicherpfad.");
  }
  return normalized;
}

const normalizedKeys = keys.map(safeKey);
if (normalizedKeys.length === 0) {
  process.stdout.write("Keine personenbezogenen Speicherobjekte zum Entfernen gefunden.\n");
  process.exit(0);
}

const hasS3 = Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
const hasForge = Boolean(process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY);
if (hasForge) {
  throw new Error("Der frühere Plattform-Speicher ist für dieses selbst gehostete Reset-Werkzeug nicht zulässig.");
}

if (hasS3) {
  const { DeleteObjectsCommand, S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "de",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
    forcePathStyle: true,
  });
  for (let index = 0; index < normalizedKeys.length; index += 1000) {
    const batch = normalizedKeys.slice(index, index + 1000);
    const response = await client.send(new DeleteObjectsCommand({
      Bucket: process.env.S3_BUCKET,
      Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
    }));
    if (response.Errors?.length) throw new Error("Mindestens ein personenbezogenes S3-Objekt konnte nicht entfernt werden.");
  }
  process.stdout.write(`${normalizedKeys.length} personenbezogene Speicherobjekte aus dem privaten S3-Speicher entfernt.\n`);
} else {
  const storageDir = resolve(process.env.STORAGE_LOCAL_DIR || "/app/storage-data");
  for (const key of normalizedKeys) {
    const target = resolve(storageDir, key);
    if (!target.startsWith(`${storageDir}${sep}`)) throw new Error("Ungültiger lokaler Speicherpfad.");
    await rm(target, { force: true });
  }
  process.stdout.write(`${normalizedKeys.length} personenbezogene Dateien aus dem lokalen Speicher entfernt.\n`);
}
