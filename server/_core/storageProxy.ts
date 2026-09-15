import type { Express } from "express";
import { ENV } from "./env";
import { getStorageMode, isSafeStorageKey, localReadFile, s3ReadFile } from "../storageLocal";
import { lookup as mimeLookup } from "mime-types";

/** Private Fachakten dürfen nie über den öffentlichen Asset-Proxy ausgeliefert werden. */
export function isPrivateStorageKey(key: string): boolean {
  return key.startsWith("exposes/") || key.startsWith("conditional-docs/");
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string | undefined>)[0];
    if (!key || !isSafeStorageKey(key)) {
      res.status(404).send("Not found");
      return;
    }
    if (isPrivateStorageKey(key)) {
      res.status(404).send("Not found");
      return;
    }

    const mode = getStorageMode();

    // ─── Lokaler Modus: Datei direkt vom Dateisystem ausliefern ───────────────
    if (mode === "local") {
      try {
        const { data, exists } = localReadFile(key);
        if (!exists) { res.status(404).send("Not found"); return; }
        const ct = mimeLookup(key) || "application/octet-stream";
        res.set("Content-Type", ct);
        res.set("Cache-Control", "public, max-age=3600");
        res.send(data);
      } catch (err) {
        console.error("[StorageProxy:local] failed:", err);
        res.status(500).send("Storage error");
      }
      return;
    }

    // ─── S3-Modus: Datei aus IONOS S3 streamen ───────────────────────────────
    if (mode === "s3") {
      try {
        const { data, exists } = await s3ReadFile(key);
        if (!exists) { res.status(404).send("Not found"); return; }
        const ct = mimeLookup(key) || "application/octet-stream";
        res.set("Content-Type", ct);
        res.set("Cache-Control", "public, max-age=3600");
        res.send(data);
      } catch (err) {
        console.error("[StorageProxy:s3] failed:", err);
        res.status(502).send("Storage backend error");
      }
      return;
    }

    // ─── Forge-Modus (Bestand) ────────────────────────────────────────────────
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) { res.status(502).send("Empty signed URL from backend"); return; }
      const imgResp = await fetch(url);
      if (!imgResp.ok) { console.error(`[StorageProxy] upstream error: ${imgResp.status}`); res.status(imgResp.status).send("Upstream error"); return; }
      const contentType = imgResp.headers.get("content-type") ?? "application/octet-stream";
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600");
      const buf = await imgResp.arrayBuffer();
      res.send(Buffer.from(buf));
    } catch (err) {
      console.error("[StorageProxy:forge] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
