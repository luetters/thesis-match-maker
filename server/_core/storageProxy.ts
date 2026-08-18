import type { Express } from "express";
import { ENV } from "./env";

/** Private Fachakten dürfen nie über den öffentlichen Asset-Proxy ausgeliefert werden. */
export function isPrivateStorageKey(key: string): boolean {
  return key.startsWith("exposes/") || key.startsWith("conditional-docs/");
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string | undefined>)[0];
    if (!key) {
      res.status(400).send("Missing key");
      return;
    }
    if (isPrivateStorageKey(key)) {
      // Keine Rückschlüsse auf die Existenz eines privaten Objekts zulassen.
      res.status(404).send("Not found");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Direkt streamen statt Redirect – verhindert 404-Probleme im Browser
      // durch signierte CloudFront-URLs die im Browser nicht korrekt aufgelöst werden
      const imgResp = await fetch(url);
      if (!imgResp.ok) {
        console.error(`[StorageProxy] upstream error: ${imgResp.status}`);
        res.status(imgResp.status).send("Upstream error");
        return;
      }
      const contentType = imgResp.headers.get("content-type") ?? "application/octet-stream";
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600");
      const buf = await imgResp.arrayBuffer();
      res.send(Buffer.from(buf));
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
