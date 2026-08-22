import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const [mode, archivePath] = process.argv.slice(2);
if (!archivePath || !["preview", "import"].includes(mode)) {
  console.error("Verwendung: node bootstrap-portable-request.mjs preview|import /pfad/zum/transfer.zip");
  process.exit(64);
}

const token = process.env.TRANSFER_IMPORT_TOKEN;
if (!token || token === "CHANGE_ME" || token === "change_me") {
  console.error("TRANSFER_IMPORT_TOKEN ist im App-Container nicht gesetzt.");
  process.exit(78);
}

const archive = await readFile(archivePath);
const form = new FormData();
form.append("archive", new Blob([archive], { type: "application/zip" }), basename(archivePath));

const isPreview = mode === "preview";
const response = await fetch(
  `http://127.0.0.1:3000/api/bootstrap/portable-transfer/${isPreview ? "preview" : "import"}`,
  {
    method: "POST",
    headers: {
      "X-Thesis-Transfer-Token": token,
      "X-Thesis-Transfer-Confirmation": isPreview ? "BOOTSTRAP_PREVIEW" : "BOOTSTRAP_IMPORT",
    },
    body: form,
  },
);

const body = await response.text();
process.stdout.write(`${body}\n`);
if (!response.ok) process.exit(response.status === 403 ? 77 : 1);
