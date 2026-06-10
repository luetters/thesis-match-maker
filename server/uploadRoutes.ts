import type { Express, Request, Response } from "express";
import multer from "multer";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { createAuditLogEntry, getThesisRequestById, updateThesisExpose, getUserById, updateExaminerPhoto, updateProfileAvatar, getUserByOpenId, createThesisDocToken, getThesisDocTokenByToken } from "./db";
import { generateThesisPdf } from "./thesisPdf";
import crypto from "crypto";
import { generateDeadlineIcs } from "./icsHelper";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";

/** Authentifiziert einen Request anhand des Session-Cookies ohne upsertUser-Seiteneffekte */
async function getUserFromRequest(req: Request) {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const openId = payload.openId as string | undefined;
    if (!openId) return null;
    return await getUserByOpenId(openId) ?? null;
  } catch {
    return null;
  }
}

// In-memory storage: Datei wird direkt zu S3 weitergeleitet
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB für Fotos
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Nur Bilddateien sind erlaubt."));
    } else {
      cb(null, true);
    }
  },
});
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Nur PDF-Dateien sind erlaubt."));
    } else {
      cb(null, true);
    }
  },
});

export function registerUploadRoutes(app: Express) {
  // POST /api/upload/expose  (pre-upload vor Thesis-Erstellung – kein thesisId erforderlich)
  app.post(
    "/api/upload/expose",
    (req, res, next) => pdfUpload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Die Datei ist zu groß. Bitte laden Sie eine PDF-Datei mit maximal 5 MB hoch." });
        }
        return res.status(400).json({ error: err.message ?? "Ungültige Datei." });
      }
      next();
    }),
    async (req: Request, res: Response) => {
      try {
        const user = await getUserFromRequest(req);
        if (!user) {
          res.status(401).json({ error: "Nicht angemeldet." });
          return;
        }
        if (!req.file) {
          res.status(400).json({ error: "Keine Datei übermittelt." });
          return;
        }
        const fileName = `expose-pre-${user.id}-${Date.now()}.pdf`;
        const { key, url } = await storagePut(
          `exposes/${fileName}`,
          req.file.buffer,
          "application/pdf"
        );
        res.json({ success: true, url, key });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload fehlgeschlagen.";
        console.error("[Upload/expose] Fehler:", err);
        res.status(500).json({ error: message });
      }
    }
  );

  // POST /api/upload/expose/:thesisId
  app.post(
    "/api/upload/expose/:thesisId",
    (req, res, next) => pdfUpload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Die Datei ist zu gro\u00df. Bitte laden Sie eine PDF-Datei mit maximal 5 MB hoch." });
        }
        return res.status(400).json({ error: err.message ?? "Ung\u00fcltige Datei." });
      }
      next();
    }),
    async (req: Request, res: Response) => {
      try {
        // Auth prüfen
        const user = await getUserFromRequest(req);
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

  // --- Foto-Upload für Prüfer:innen-Profil ---
  app.post(
    "/api/upload/photo",
    (req, res, next) => upload.single("photo")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Die Datei ist zu groß. Bitte laden Sie ein Bild mit maximal 5 MB hoch." });
        }
        return res.status(400).json({ error: err.message ?? "Ungültige Datei." });
      }
      next();
    }),
    async (req: Request, res: Response) => {
      try {
        const user = await getUserFromRequest(req);
        if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }
        if (!req.file) { res.status(400).json({ error: "Kein Foto übermittelt." }); return; }
        const ext = req.file.mimetype.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
        const fileName = `photo-${user.id}-${Date.now()}.${ext}`;
        const { key, url } = await storagePut(`photos/${fileName}`, req.file.buffer, req.file.mimetype);
        await updateExaminerPhoto(user.id, url, key);
        res.json({ success: true, url, key });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Foto-Upload fehlgeschlagen.";
        console.error("[Upload/photo] Fehler:", err);
        res.status(500).json({ error: message });
      }
    }
  );

  // --- Profilbild-Upload für alle Nutzer:innen ---
  app.post(
    "/api/upload/avatar",
    (req, res, next) => upload.single("avatar")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Die Datei ist zu groß. Bitte laden Sie ein Bild mit maximal 5 MB hoch." });
        }
        return res.status(400).json({ error: err.message ?? "Ungültige Datei." });
      }
      next();
    }),
    async (req: Request, res: Response) => {
      try {
        const user = await getUserFromRequest(req);
        if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }
        if (!req.file) { res.status(400).json({ error: "Kein Bild übermittelt." }); return; }
        const mimeType = req.file.mimetype;
        if (!['image/jpeg','image/png','image/webp','image/gif'].includes(mimeType)) {
          res.status(400).json({ error: "Nur JPEG, PNG, WebP oder GIF sind erlaubt." }); return;
        }
        const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
        const storageKey = `avatars/user-${user.id}-${Date.now()}.${ext}`;
        const { key: savedKey, url } = await storagePut(storageKey, req.file.buffer, mimeType);
        const ok = await updateProfileAvatar(user.id, url, savedKey);
        if (!ok) { res.status(500).json({ error: "Profilbild konnte nicht gespeichert werden." }); return; }
        console.log(`[Upload/avatar] Nutzer ${user.id} (${user.email}) hat Avatar hochgeladen: ${url}`);
        res.json({ success: true, avatarUrl: url, key: savedKey });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Avatar-Upload fehlgeschlagen.";
        console.error("[Upload/avatar] Fehler:", err);
        res.status(500).json({ error: message });
      }
    }
  );

  // --- Storage-Proxy: Bilder direkt streamen (verhindert CloudFront-IP-Binding-Problem) ---
  app.get("/api/storage/*", async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string | undefined>)[0];
    if (!key) { res.status(400).send("Missing key"); return; }
    const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;
    if (!forgeApiUrl || !forgeApiKey) { res.status(500).send("Not configured"); return; }
    try {
      const forgeUrl = new URL("v1/storage/presign/get", forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl.toString(), {
        headers: { Authorization: `Bearer ${forgeApiKey}` },
      });
      if (!forgeResp.ok) { res.status(502).send("Storage backend error"); return; }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) { res.status(502).send("Empty URL"); return; }
      const imgResp = await fetch(url);
      if (!imgResp.ok) { res.status(imgResp.status).send("Upstream error"); return; }
      const contentType = imgResp.headers.get("content-type") ?? "application/octet-stream";
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600");
      const buf = await imgResp.arrayBuffer();
      res.send(Buffer.from(buf));
    } catch (err) {
      console.error("[StorageProxy/api] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });

  // GET /api/thesis/:id/registration.pdf – Anmeldedokument herunterladen
  app.get("/api/thesis/:id/registration.pdf", async (req: Request, res: Response) => {
    const thesisId = parseInt(req.params.id, 10);
    if (isNaN(thesisId)) { res.status(400).json({ error: "Ungültige Thesis-ID" }); return; }
    try {
      const user = await getUserFromRequest(req);
      if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }

      const thesis = await getThesisRequestById(thesisId);
      if (!thesis) { res.status(404).json({ error: "Thesis nicht gefunden" }); return; }

      // Nur Student der Thesis oder Admin/PAV darf herunterladen
      const allowedRoles = ["admin", "superadmin", "pav", "dean", "vice_dean"];
      const userRolesArr: string[] = (user as any).roles ?? [];
      const hasAdminRole = allowedRoles.some(r => userRolesArr.includes(r)) || (user as any).role === "admin";
      if (thesis.studentId !== user.id && !hasAdminRole) {
        res.status(403).json({ error: "Keine Berechtigung." }); return;
      }

      // Daten zusammenführen
      const student = await getUserById(thesis.studentId);
      const firstExaminer = thesis.examinerId ? await getUserById(thesis.examinerId) : null;
      const secondExaminer = thesis.secondExaminerId ? await getUserById(thesis.secondExaminerId) : null;

      // Studiengang über users.programmeId laden
      let programmeName: string | null = null;
      if (student?.programmeId) {
        const { getDb } = await import("./db");
        const { programmes } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (db) {
          const rows = await db.select({ name: programmes.name, abbreviation: programmes.abbreviation })
            .from(programmes).where(eq(programmes.id, student.programmeId)).limit(1);
          programmeName = rows[0]?.abbreviation ?? rows[0]?.name ?? null;
        }
      }

      // Verifikations-Token erzeugen und speichern
      const docToken = crypto.randomBytes(24).toString("hex");
      const proto = req.headers["x-forwarded-proto"] ?? "https";
      const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "thesis.htw-berlin.com";
      const verifyUrl = `${proto}://${host}/verify/${docToken}`;

      await createThesisDocToken({
        token: docToken,
        thesisRequestId: thesisId,
        studentName: student?.name ?? "Unbekannt",
        matrikelNr: (student as any)?.matrikelNr ?? null,
        programmeName,
        title: thesis.title,
        firstExaminerName: firstExaminer?.name ?? null,
        secondExaminerName: secondExaminer?.name ?? null,
        targetSemester: thesis.targetSemester ?? null,
        degreeType: thesis.degreeType ?? null,
      });

      const pdfBuffer = await generateThesisPdf({
        studentName: student?.name ?? "Unbekannt",
        matrikelNr: (student as any)?.matrikelNr ?? null,
        programmeName,
        degreeType: thesis.degreeType ?? null,
        title: thesis.title,
        firstExaminerName: firstExaminer?.name ?? null,
        secondExaminerName: secondExaminer?.name ?? null,
        targetSemester: thesis.targetSemester ?? null,
        language: thesis.language ?? "de",
        verifyUrl,
        verifyToken: docToken,
        createdAt: new Date(),
      });

      // Dateiname: Name_Studiengang_Semester.pdf
      const safeName = (student?.name ?? "Student").replace(/[^\w\säöüÄÖÜß-]/g, "").replace(/\s+/g, "_");
      const safeProg = (programmeName ?? "Studiengang").replace(/[^a-zA-Z0-9]/g, "");
      const safeSem = (thesis.targetSemester ?? "Semester").replace(/[^a-zA-Z0-9]/g, "");
      const filename = `${safeName}_${safeProg}_${safeSem}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(pdfBuffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PDF-Generierung fehlgeschlagen";
      console.error("[PDF] Fehler:", err);
      res.status(500).json({ error: message });
    }
  });

  // GET /api/verify/:token – Öffentliche Verifikation (JSON)
  app.get("/api/verify/:token", async (req: Request, res: Response) => {
    const { token } = req.params;
    try {
      const doc = await getThesisDocTokenByToken(token);
      if (!doc) { res.status(404).json({ error: "Token nicht gefunden oder ungültig." }); return; }
      res.json({
        valid: true,
        studentName: doc.studentName,
        matrikelNr: doc.matrikelNr,
        programmeName: doc.programmeName,
        title: doc.title,
        firstExaminerName: doc.firstExaminerName,
        secondExaminerName: doc.secondExaminerName,
        targetSemester: doc.targetSemester,
        degreeType: doc.degreeType,
        issuedAt: doc.createdAt,
      });
    } catch (err) {
      res.status(500).json({ error: "Verifikation fehlgeschlagen." });
    }
  });

  // GET /api/thesis/:id/deadline.ics
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
