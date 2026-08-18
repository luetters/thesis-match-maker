/**
 * Autarker Dateispeicher-Adapter.
 *
 * Erkennt automatisch den aktiven Modus:
 *   1. Wenn BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY gesetzt sind → Manus Forge (Bestand)
 *   2. Wenn S3_ENDPOINT + S3_BUCKET + S3_ACCESS_KEY + S3_SECRET_KEY gesetzt sind → IONOS S3
 *   3. Sonst → lokales Dateisystem unter STORAGE_LOCAL_DIR (Standard: ./storage-data)
 *
 * Die öffentliche API (storagePut, storageGet, storageGetSignedUrl) bleibt identisch.
 */
/**
 * Unterstützte S3-Anbieter (IONOS und Hetzner verwenden dasselbe S3-Protokoll):
 *   - IONOS: S3_ENDPOINT=https://s3.eu-central-1.ionoscloud.com
 *   - Hetzner: S3_ENDPOINT=https://fsn1.your-objectstorage.com (oder nbg1/hel1)
 *
 * Der Adapter erkennt den Anbieter anhand des Endpunkts für die Statusanzeige.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import crypto from "crypto";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

// ─── Modus-Erkennung ──────────────────────────────────────────────────────────

type StorageMode = "forge" | "s3" | "local";

function detectMode(): StorageMode {
  if (process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY) {
    return "forge";
  }
  if (process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY) {
    return "s3";
  }
  return "local";
}

// ─── Lokaler Dateispeicher ────────────────────────────────────────────────────

function getLocalDir(): string {
  const dir = process.env.STORAGE_LOCAL_DIR || join(process.cwd(), "storage-data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

async function localPut(relKey: string, data: Buffer | Uint8Array | string, _contentType?: string): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = join(getLocalDir(), key);
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });
  const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  writeFileSync(filePath, buf);
  return { key, url: `/api/storage/${key}` };
}

async function localGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/api/storage/${key}` };
}

async function localGetSignedUrl(relKey: string): Promise<string> {
  // Lokaler Modus: kein Signing nötig, direkte URL
  const key = normalizeKey(relKey);
  return `/api/storage/${key}`;
}

/**
 * Liest eine Datei aus dem lokalen Speicher.
 * Wird vom lokalen Storage-Proxy verwendet.
 */
export function localReadFile(key: string): { data: Buffer; exists: boolean } {
  const filePath = join(getLocalDir(), normalizeKey(key));
  if (!existsSync(filePath)) return { data: Buffer.alloc(0), exists: false };
  return { data: readFileSync(filePath), exists: true };
}

// ─── IONOS S3 ─────────────────────────────────────────────────────────────────

let s3ClientPromise: Promise<typeof import("@aws-sdk/client-s3")> | null = null;

function getS3Config() {
  return {
    endpoint: process.env.S3_ENDPOINT!,
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION || "de",
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  };
}

async function getS3Client() {
  if (!s3ClientPromise) {
    s3ClientPromise = import("@aws-sdk/client-s3");
  }
  const { S3Client } = await s3ClientPromise;
  const cfg = getS3Config();
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: true,
  });
}

async function s3Put(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  const cfg = getS3Config();
  const key = appendHashSuffix(normalizeKey(relKey));
  const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await client.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: buf,
    ContentType: contentType,
  }));
  return { key, url: `/api/storage/${key}` };
}

async function s3Get(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/api/storage/${key}` };
}

async function s3GetSignedUrl(relKey: string): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await getS3Client();
  const cfg = getS3Config();
  const key = normalizeKey(relKey);
  return getSignedUrl(client, new GetObjectCommand({ Bucket: cfg.bucket, Key: key }), { expiresIn: 3600 });
}

/**
 * Liest eine Datei aus dem S3-Speicher.
 * Wird vom S3-Storage-Proxy verwendet.
 */
export async function s3ReadFile(key: string): Promise<{ data: Buffer; exists: boolean }> {
  try {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    const cfg = getS3Config();
    const result = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: normalizeKey(key) }));
    const body = result.Body;
    if (!body) return { data: Buffer.alloc(0), exists: false };
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return { data: Buffer.concat(chunks), exists: true };
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return { data: Buffer.alloc(0), exists: false };
    }
    throw err;
  }
}

// ─── Forge (Bestand) ──────────────────────────────────────────────────────────

function getForgeConfig() {
  return {
    forgeUrl: (process.env.BUILT_IN_FORGE_API_URL ?? "").replace(/\/+$/, ""),
    forgeKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  };
}

async function forgePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
  if (!uploadResp.ok) throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  return { key, url: `/api/storage/${key}` };
}

async function forgeGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/api/storage/${key}` };
}

async function forgeGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  return url;
}

// ─── Öffentliche API ──────────────────────────────────────────────────────────

const mode = detectMode();
console.log(`[Storage] Modus: ${mode}`);

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  switch (mode) {
    case "forge": return forgePut(relKey, data, contentType);
    case "s3": return s3Put(relKey, data, contentType);
    case "local": return localPut(relKey, data, contentType);
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  switch (mode) {
    case "forge": return forgeGet(relKey);
    case "s3": return s3Get(relKey);
    case "local": return localGet(relKey);
  }
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  switch (mode) {
    case "forge": return forgeGetSignedUrl(relKey);
    case "s3": return s3GetSignedUrl(relKey);
    case "local": return localGetSignedUrl(relKey);
  }
}

export function getStorageMode(): StorageMode {
  return mode;
}

/** Gibt den erkannten S3-Anbieter zurück (für die Admin-Statusanzeige). */
export function getStorageProvider(): "forge" | "ionos" | "hetzner" | "local" {
  if (mode === "forge") return "forge";
  if (mode === "local") return "local";
  const endpoint = (process.env.S3_ENDPOINT ?? "").toLowerCase();
  if (endpoint.includes("ionos")) return "ionos";
  if (endpoint.includes("hetzner") || endpoint.includes("your-objectstorage")) return "hetzner";
  return "ionos"; // Fallback für unbekannte S3-Endpunkte
}

/** Prüft die S3-Verbindung und gibt den Status zurück. */
export async function checkStorageHealth(): Promise<{
  mode: StorageMode;
  provider: string;
  healthy: boolean;
  message: string;
  bucket?: string;
  endpoint?: string;
}> {
  const provider = getStorageProvider();
  if (mode === "local") {
    const dir = getLocalDir();
    const exists = existsSync(dir);
    return { mode, provider, healthy: exists, message: exists ? `Verzeichnis: ${dir}` : `Verzeichnis nicht vorhanden: ${dir}` };
  }
  if (mode === "forge") {
    const { forgeUrl, forgeKey } = getForgeConfig();
    try {
      const resp = await fetch(new URL("v1/storage/presign/get?path=__health_check__", forgeUrl + "/"), {
        headers: { Authorization: `Bearer ${forgeKey}` },
      });
      return { mode, provider, healthy: resp.status < 500, message: `Forge API: ${resp.status}`, endpoint: forgeUrl };
    } catch (err: any) {
      return { mode, provider, healthy: false, message: err.message ?? "Verbindung fehlgeschlagen" };
    }
  }
  // S3-Modus (IONOS oder Hetzner)
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    const cfg = getS3Config();
    await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
    return { mode, provider, healthy: true, message: "Verbindung erfolgreich", bucket: cfg.bucket, endpoint: cfg.endpoint };
  } catch (err: any) {
    const cfg = getS3Config();
    return { mode, provider, healthy: false, message: err.message ?? "Verbindung fehlgeschlagen", bucket: cfg.bucket, endpoint: cfg.endpoint };
  }
}
