// Test: PDF generieren und Seitenanzahl prüfen
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// PDFKit direkt nutzen um Seitenanzahl zu prüfen
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { readFileSync } = require("fs");

// Logo laden
let logoBuffer = null;
try {
  logoBuffer = readFileSync(join(__dirname, "server/HTW_Berlin_Logo.jpg"));
  console.log("✅ Neues HTW-Logo geladen:", logoBuffer.length, "bytes");
} catch (e) {
  console.log("❌ Logo nicht gefunden:", e.message);
}

// Einfacher Seitenanzahl-Test mit PDFKit bufferPages
const doc = new PDFDocument({ size: "A4", bufferPages: true, autoFirstPage: true });
const chunks = [];
doc.on("data", c => chunks.push(c));
doc.on("end", () => {
  const buf = Buffer.concat(chunks);
  // Seitenanzahl aus PDF-Struktur ermitteln
  const pdfStr = buf.toString("latin1");
  const pageMatches = pdfStr.match(/\/Type\s*\/Page[^s]/g);
  console.log("📄 Seiten im PDF:", pageMatches ? pageMatches.length : "unbekannt");
  writeFileSync("/tmp/test-output.pdf", buf);
  console.log("✅ PDF gespeichert: /tmp/test-output.pdf (", buf.length, "bytes)");
});

// Etwas Text schreiben
doc.text("Test", 60, 100, { lineBreak: false });
doc.flushPages();
doc.end();
