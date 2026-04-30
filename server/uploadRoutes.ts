import type { Express, Request, Response } from "express";
import multer from "multer";
import { sdk } from "./_core/sdk";
import { createAuditLogEntry, getThesisRequestById, updateThesisExpose, getUserById } from "./db";
import { generateDeadlineIcs } from "./icsHelper";
import { storagePut } from "./storage";

// In-memory storage: Datei wird direkt zu S3 weitergeleitet
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Nur PDF-Dateien sind erlaubt."));
    } else {
      cb(null, true);
    }
  },
});

export function registerUploadRoutes(app: Express) {
  // POST /api/upload/expose/:thesisId
  app.post(
    "/api/upload/expose/:thesisId",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        // Auth prüfen
        let user = null;
        try { user = await sdk.authenticateRequest(req); } catch { user = null; }
        if (!user) {
          res.status(401).json({ error: "Nicht angemeldet." });
          return;
        }

        const thesisId = parseInt(req.params.thesisId);
        if (isNaN(thesisId)) {
          res.status(400).json({ error: "Ungültige Anfrage-ID." });
          return;
        }

        const thesis = await getThesisRequestById(thesisId);
        if (!thesis) {
          res.status(404).json({ error: "Anfrage nicht gefunden." });
          return;
        }

        // Nur Eigentümer:in oder Admin darf hochladen
        if (thesis.studentId !== user.id && user.role !== "admin") {
          res.status(403).json({ error: "Kein Zugriff." });
          return;
        }

        if (!req.file) {
          res.status(400).json({ error: "Keine Datei übermittelt." });
          return;
        }

        // S3-Upload
        const fileName = `expose-${thesisId}-${Date.now()}.pdf`;
        const { key, url } = await storagePut(
          `exposes/${fileName}`,
          req.file.buffer,
          "application/pdf"
        );

        // DB aktualisieren
        await updateThesisExpose(thesisId, url, key);

        // AuditLog
        await createAuditLogEntry({
          thesisRequestId: thesisId,
          actorId: user.id,
          actorRole: user.role,
          action: "EXPOSE_UPLOADED",
          metadata: { key, url },
        });

        res.json({ success: true, url, key });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload fehlgeschlagen.";
        console.error("[Upload] Fehler:", err);
        res.status(500).json({ error: message });
      }
    }
  );

  // --- ICS-Kalender-Export für Thesis-Deadline ---
  app.get("/api/thesis/:id/deadline.ics", async (req: Request, res: Response) => {
    const thesisId = parseInt(req.params.id, 10);
    if (isNaN(thesisId)) { res.status(400).json({ error: "Ungültige Thesis-ID" }); return; }
    try {
      const thesis = await getThesisRequestById(thesisId);
      if (!thesis) { res.status(404).json({ error: "Thesis nicht gefunden" }); return; }
      if (!thesis.deadline) { res.status(404).json({ error: "Keine Deadline gesetzt" }); return; }
      const student = thesis.studentId ? await getUserById(thesis.studentId) : null;
      const icsContent = generateDeadlineIcs({
        title: thesis.title,
        description: thesis.description ?? undefined,
        deadline: new Date(thesis.deadline),
        studentName: student?.name ?? undefined,
        department: thesis.department ?? undefined,
        thesisId,
      });
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="thesis-deadline-${thesisId}.ics"`);
      res.send(icsContent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ICS-Generierung fehlgeschlagen";
      res.status(500).json({ error: message });
    }
  });
}
