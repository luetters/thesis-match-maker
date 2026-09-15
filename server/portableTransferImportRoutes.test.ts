import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { ZipArchive } from "archiver";
import { createPortableTransferManifest, sha256 } from "@shared/portableTransfer";
import { assertSafeArchiveEntries, previewPortableTransferArchive, safeArchivePath } from "./portableTransferImportRoutes";

async function writeArchive(rows: unknown[], checksum = sha256(Buffer.from(JSON.stringify(rows)))): Promise<{ dir: string; path: string }> {
  const dir = await mkdtemp(join(tmpdir(), "tmm-transfer-"));
  const path = join(dir, "transfer.zip");
  const output = createWriteStream(path);
  const archive = new ZipArchive({ zlib: { level: 1 } });
  const done = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    archive.on("error", reject);
  });
  archive.pipe(output);
  archive.append(JSON.stringify(rows), { name: "records/users.json" });
  archive.append(JSON.stringify(createPortableTransferManifest({
    sections: [{ name: "users", rows: rows.length, sha256: checksum }],
    assets: [], exclusions: [], warnings: [],
  })), { name: "manifest.json" });
  await archive.finalize();
  await done;
  return { dir, path };
}

describe("portable transfer preview", () => {
  it("accepts a complete archive whose record checksum matches", async () => {
    const archive = await writeArchive([{ id: 1, email: "person@example.org" }]);
    try {
      const preview = await previewPortableTransferArchive(archive.path);
      expect(preview.valid).toBe(true);
      expect(preview.records).toEqual([{ name: "users", rows: 1, sha256Valid: true }]);
    } finally { await rm(archive.dir, { recursive: true, force: true }); }
  });

  it("rejects a manipulated section before any import is possible", async () => {
    const archive = await writeArchive([{ id: 1 }], "0".repeat(64));
    try {
      const preview = await previewPortableTransferArchive(archive.path);
      expect(preview.valid).toBe(false);
      expect(preview.errors.some((error) => error.includes("Prüfsumme"))).toBe(true);
    } finally { await rm(archive.dir, { recursive: true, force: true }); }
  });
});

describe("portable transfer archive safeguards", () => {
  it("rejects traversal paths including Windows separators", () => {
    expect(safeArchivePath("records/users.json")).toBe(true);
    expect(safeArchivePath("../.env")).toBe(false);
    expect(safeArchivePath("records\\..\\.env")).toBe(false);
    expect(safeArchivePath("records//users.json")).toBe(false);
  });

  it("rejects archives whose uncompressed content exceeds the configured limit", () => {
    expect(() => assertSafeArchiveEntries([
      { path: "assets/one.bin", uncompressedSize: 300 * 1024 * 1024 },
      { path: "assets/two.bin", uncompressedSize: 300 * 1024 * 1024 },
    ])).toThrow("nach dem Entpacken zu groß");
  });
});
