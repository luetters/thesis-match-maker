import type { Express, Request, Response } from "express";
import multer from "multer";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { createAuditLogEntry, getThesisRequestById, getThesisRequestByIdWithNames, updateThesisExpose, getUserById, updateExaminerPhoto, updateProfileAvatar, getUserByOpenId, createThesisDocToken, getThesisDocTokenByToken, getSystemSetting, getUserRoles, getAllColloquiums, getColloquiumsByExaminer } from "./db";
import { generateThesisPdf } from "./thesisPdf";
import { hasCompleteCommission } from "./thesisRegistrationDocument";
import crypto from "crypto";
import { generateDeadlineIcs, createIcsEvent } from "./icsHelper";
import { storagePut } from "./storage";
import { COOKIE_NAME, buildFullName } from "@shared/const";

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

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export function hasExpectedFileSignature(file: Express.Multer.File): boolean {
  const header = file.buffer.subarray(0, 12);
  if (file.mimetype === "application/pdf") return isPdfBuffer(file.buffer);
  if (file.mimetype === "image/png") return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === "image/jpeg") return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (file.mimetype === "image/gif") return header.subarray(0, 3).toString("ascii") === "GIF";
  if (file.mimetype === "image/webp") return header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP";
  if (file.mimetype.includes("officedocument") || file.mimetype === "application/vnd.ms-powerpoint") return header.subarray(0, 2).toString("ascii") === "PK";
  if (file.mimetype === "application/msword") return header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0;
  return false;
}

export function canAccessThesisRecord(user: any, thesis: any): boolean {
  if (!user || !thesis) return false;
  if (user.role === "admin" || user.role === "superadmin") return true;
  return [thesis.studentId, thesis.firstExaminerId, thesis.secondExaminerId].includes(user.id);
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
        if (!isPdfBuffer(req.file.buffer)) {
          res.status(400).json({ error: "Die Datei ist kein gültiges PDF-Dokument." });
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
        console.error("[Upload/expose] Fehler:", err);
        res.status(500).json({ error: "Der Upload konnte nicht abgeschlossen werden." });
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
        if (thesis.studentId !== user.id && user.role !== "admin" && user.role !== "superadmin") {
          res.status(403).json({ error: "Kein Zugriff." });
          return;
        }

        if (!req.file) {
          res.status(400).json({ error: "Keine Datei übermittelt." });
          return;
        }
        if (!isPdfBuffer(req.file.buffer)) {
          res.status(400).json({ error: "Die Datei ist kein gültiges PDF-Dokument." });
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
        console.error("[Upload] Fehler:", err);
        res.status(500).json({ error: "Der Upload konnte nicht abgeschlossen werden." });
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
      if (!hasCompleteCommission(thesis)) {
        res.status(409).json({ error: "Das offizielle Anmeldedokument steht erst nach vollständiger Kommissionsbildung zur Verfügung." }); return;
      }

      // Student, zugewiesene Gutachter oder Admin/PAV dürfen herunterladen
      const allowedRoles = ["admin", "superadmin", "pav", "dean", "vice_dean"];
      const userRolesArr: string[] = await getUserRoles(user.id);
      const hasAdminRole = allowedRoles.some(r => userRolesArr.includes(r)) || user.role === "admin" || user.role === "superadmin" || user.role === "pav" || user.role === "dean" || user.role === "vice_dean";
      const isAssignedExaminer = thesis.examinerId === user.id || thesis.secondExaminerId === user.id;
      if (thesis.studentId !== user.id && !hasAdminRole && !isAssignedExaminer) {
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
        studentName: buildFullName({ firstName: (student as any)?.firstName, lastName: (student as any)?.lastName, academicTitle: (student as any)?.academicTitle, name: student?.name }) || "Unbekannt",
        matrikelNr: (student as any)?.matrikelNr ?? null,
        programmeName,
        title: thesis.title,
        firstExaminerName: firstExaminer ? (buildFullName({ firstName: (firstExaminer as any)?.firstName, lastName: (firstExaminer as any)?.lastName, academicTitle: (firstExaminer as any)?.academicTitle, name: firstExaminer?.name }) || null) : null,
        secondExaminerName: secondExaminer ? (buildFullName({ firstName: (secondExaminer as any)?.firstName, lastName: (secondExaminer as any)?.lastName, academicTitle: (secondExaminer as any)?.academicTitle, name: secondExaminer?.name }) || null) : null,
        targetSemester: thesis.targetSemester?.trim() || null,
        degreeType: thesis.degreeType?.trim() || null,
        plagiarismConsent: Number((student as any)?.plagiarismConsent ?? 0),
        aiReviewConsent: Number((student as any)?.aiReviewConsent ?? 0),
      });

      // Disclaimer-Texte aus den System-Einstellungen laden
      const disclaimerDeRow = await getSystemSetting("pdfDisclaimerDe");
      const disclaimerEnRow = await getSystemSetting("pdfDisclaimerEn");
      const disclaimerDe = disclaimerDeRow?.value ?? "Der Thesis Match Maker ist ein Hilfsmittel zur Organisation der Thesisbetreuung. Die Abstimmung erfolgt jedoch ausserhalb der offiziellen Prozesse der HTW Berlin. Aus der erfolgreichen Synchronisierung entsteht kein Anspruch auf eine Thesis im geplanten Semester. Hierzu ist eine Zulassung zur Thesis durch die Verwaltung Ihres Studiengangs erforderlich, die im Nachgang zu diesem Match erfolgt.";
      const disclaimerEn = disclaimerEnRow?.value ?? "The Thesis Match Maker is a tool designed to help organize your thesis supervision. Please note that any arrangements made here take place outside of HTW Berlin's official administrative processes. A successful match via the platform does not guarantee enrollment in your thesis for the planned semester. For this, official admission from your department's degree program administration is required, which must be requested after a match has been made.";

      const pdfBuffer = await generateThesisPdf({
        studentName: buildFullName({ firstName: (student as any)?.firstName, lastName: (student as any)?.lastName, academicTitle: (student as any)?.academicTitle, name: student?.name }) || "Unbekannt",
        matrikelNr: (student as any)?.matrikelNr ?? null,
        studentEmail: (student as any)?.email ?? null,
        programmeName,
        degreeType: thesis.degreeType ?? null,
        department: (student as any)?.department ?? null,
        title: thesis.title,
        titleEn: (thesis as any)?.titleEn ?? null,
        firstExaminerName: firstExaminer ? (buildFullName({ firstName: (firstExaminer as any)?.firstName, lastName: (firstExaminer as any)?.lastName, academicTitle: (firstExaminer as any)?.academicTitle, name: firstExaminer?.name }) || null) : null,
        secondExaminerName: secondExaminer ? (buildFullName({ firstName: (secondExaminer as any)?.firstName, lastName: (secondExaminer as any)?.lastName, academicTitle: (secondExaminer as any)?.academicTitle, name: secondExaminer?.name }) || null) : null,
        targetSemester: thesis.targetSemester ?? null,
        language: thesis.language ?? "de",
        documentLanguage: (student as any)?.preferredLanguage === "en" ? "en" : "de",
        submissionDeadline: (thesis as any)?.submissionDeadline ?? (thesis as any)?.deadline ?? null,
        verifyUrl,
        verifyToken: docToken,
        createdAt: new Date(),
        plagiarismConsent: Number((student as any)?.plagiarismConsent ?? 0),
        aiReviewConsent: Number((student as any)?.aiReviewConsent ?? 0),
        disclaimerDe,
        disclaimerEn,
      });

      // Dateiname: Name_Studiengang_Semester.pdf
      const safeName = (buildFullName({ firstName: (student as any)?.firstName, lastName: (student as any)?.lastName, academicTitle: (student as any)?.academicTitle, name: student?.name }) || "Student").replace(/[^\w\säöüÄÖÜß-]/g, "").replace(/\s+/g, "_");
      const safeProg = (programmeName ?? "Studiengang").replace(/[^a-zA-Z0-9]/g, "");
      const safeSem = (thesis.targetSemester ?? "Semester").replace(/[^a-zA-Z0-9]/g, "");
      const filename = `${safeName}_${safeProg}_${safeSem}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      // ?preview=1 → inline (Browser-Vorschau), sonst attachment (Download)
      const isPreview = req.query.preview === "1";
      const disposition = isPreview ? "inline" : "attachment";
      res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(pdfBuffer);
    } catch (err: unknown) {
      console.error("[PDF] Fehler:", err);
      // SQL-Fehler und interne Fehler nicht an den Client weitergeben
      const raw = err instanceof Error ? err.message : String(err);
      const isSqlError = raw.toLowerCase().includes("insert") || raw.toLowerCase().includes("query") || raw.toLowerCase().includes("sql") || raw.toLowerCase().includes("database");
      const userMessage = isSqlError
        ? "Das Anmeldedokument konnte nicht erstellt werden. Bitte wenden Sie sich an die Verwaltung."
        : "Das Anmeldedokument konnte nicht generiert werden. Bitte versuchen Sie es erneut.";
      res.status(500).json({ error: userMessage });
    }
  });

  // GET /api/verify/:token – Öffentliche Verifikation (JSON)
  app.get("/api/verify/:token", async (req: Request, res: Response) => {
    const { token } = req.params;
    try {
      const doc = await getThesisDocTokenByToken(token);
      if (!doc) { res.status(404).json({ error: "Token nicht gefunden oder ungültig." }); return; }
      if ((doc as any).revoked) {
        res.status(410).json({ valid: false, revoked: true, error: "Dieses Dokument wurde widerrufen. Die Betreuungszusage wurde nachträglich zurückgezogen oder storniert." });
        return;
      }
      res.json({
        valid: true,
        studentName: doc.studentName,
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
      const user = await getUserFromRequest(req);
      if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }
      const thesis = await getThesisRequestById(thesisId);
      if (!thesis) { res.status(404).json({ error: "Thesis nicht gefunden" }); return; }
      if (!canAccessThesisRecord(user, thesis)) { res.status(403).json({ error: "Kein Zugriff auf diese Frist." }); return; }
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
      console.error("[ICS/deadline] Fehler:", err);
      res.status(500).json({ error: "ICS-Generierung fehlgeschlagen" });
    }
  });

  // GET /api/ics/colloquium/:id – Einzel-Export eines Kolloquiums als .ics
  app.get("/api/ics/colloquium/:id", async (req: Request, res: Response) => {
    const colloquiumId = parseInt(req.params.id, 10);
    if (isNaN(colloquiumId)) { res.status(400).json({ error: "Ungültige Kolloquium-ID" }); return; }
    try {
      const user = await getUserFromRequest(req);
      if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }
      const all = await getAllColloquiums();
      const col = all.find((c) => c.id === colloquiumId);
      if (!col) { res.status(404).json({ error: "Kolloquium nicht gefunden" }); return; }
      // Thesis-Daten mit aufgelösten Namen laden
      const thesis = await getThesisRequestByIdWithNames(col.thesisRequestId);
      if (!canAccessThesisRecord(user, thesis)) { res.status(403).json({ error: "Kein Zugriff auf dieses Kolloquium." }); return; }
      const icsContent = createIcsEvent({
        title: col.title,
        start: new Date(col.scheduledAt as string),
        durationMinutes: 60,
        location: [col.location, col.room].filter(Boolean).join(" – ") || undefined,
        onlineLink: col.onlineLink || undefined,
        notes: col.notes || undefined,
        colloquiumId: col.id,
        thesisTitle: thesis?.title,
        studentName: thesis?.studentName ?? undefined,
        firstExaminerName: thesis?.firstExaminerName ?? undefined,
        secondExaminerName: thesis?.secondExaminerName ?? undefined,
        programmeName: thesis?.programmeName ?? undefined,
      });
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="kolloquium-${colloquiumId}.ics"`);
      res.send(icsContent);
    } catch (err: unknown) {
      console.error("[ICS/colloquium] Fehler:", err);
      res.status(500).json({ error: "ICS-Generierung fehlgeschlagen" });
    }
  });

  // GET /api/ics/colloquiums/all – Sammel-Export aller Kolloquien des eingeloggten Prüfers
  app.get("/api/ics/colloquiums/all", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }
      // Kolloquien des Prüfers laden (gefiltert nach Examiner-ID)
      const examinerCols = await getColloquiumsByExaminer(user.id);
      // Für second_examiner: nur Kolloquien filtern, bei denen sie als Zweitgutachter:in eingetragen sind
      const isSecondExaminer = user.role === "second_examiner";
      const filteredCols = isSecondExaminer
        ? (examinerCols as any[]).filter((c) => c.thesisSecondExaminerId === user.id)
        : examinerCols;
      if (filteredCols.length === 0) {
        res.status(404).json({ error: "Keine Kolloquien gefunden" });
        return;
      }
      // Thesis-Daten für alle Kolloquien laden (parallel)
      const { createEvents } = await import("ics");
      const thesisDataList = await Promise.all(
        filteredCols.map((col: any) => getThesisRequestByIdWithNames(col.thesisRequestId).catch(() => null))
      );
      // Mehrere ICS-Events zu einer Kalender-Datei zusammenführen
      const events = filteredCols.map((col: any, idx: number) => {
        const d = new Date(col.scheduledAt as string);
        const thesis = thesisDataList[idx];
        const descriptionLines = [
          thesis?.title ? `Abschlussarbeit: ${thesis.title}` : "",
          thesis?.studentName ? `Studierende:r: ${thesis.studentName}` : "",
          thesis?.firstExaminerName ? `Erstprüfer:in: ${thesis.firstExaminerName}` : "",
          thesis?.secondExaminerName ? `Zweitprüfer:in: ${thesis.secondExaminerName}` : "",
          thesis?.programmeName ? `Studiengang: ${thesis.programmeName}` : "",
          col.notes ? `Hinweise: ${col.notes}` : "",
          "HTW Berlin – Thesis Match Maker",
        ].filter(Boolean).join("\n");
        return {
          uid: `kolloquium-${col.id}@htw-berlin.de`,
          title: col.title,
          description: descriptionLines,
          start: [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()] as [number, number, number, number, number],
          duration: { hours: 1, minutes: 0 },
          location: [col.location, col.room].filter(Boolean).join(" – ") || undefined,
          alarms: [
            { action: "display" as const, description: "Erinnerung: Kolloquium in 24 Stunden", trigger: { days: 1, before: true } },
            { action: "display" as const, description: "Erinnerung: Kolloquium in 1 Stunde", trigger: { hours: 1, before: true } },
          ],
          organizer: { name: "HTW Berlin – Prüfungsamt", email: "pruefungsamt@htw-berlin.de" },
          url: "https://thesis.htw-berlin.com",
          categories: ["Kolloquium", "HTW Berlin"],
          status: "CONFIRMED" as const,
          busyStatus: "BUSY" as const,
        };
      });
      const { error, value } = createEvents(events);
      if (error || !value) {
        res.status(500).json({ error: "ICS-Generierung fehlgeschlagen" });
        return;
      }
      const safeFilename = `htw-kolloquien-${user.id}.ics`;
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.send(value);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ICS-Generierung fehlgeschlagen";
      res.status(500).json({ error: message });
    }
  });

  // POST /api/thesis/:id/conditional-documents – Dokument bei Zusage unter Vorbehalt hochladen
  const conditionalDocUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      const allowed = ["application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowed.includes(file.mimetype)) {
        cb(new Error("Nur PDF-, Word-, PowerPoint- und Bilddateien sind erlaubt."));
      } else {
        cb(null, true);
      }
    },
  });

  app.post(
    "/api/thesis/:id/conditional-documents",
    (req, res, next) => conditionalDocUpload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Die Datei ist zu gro\u00df. Maximal 10 MB erlaubt." });
        }
        return res.status(400).json({ error: err.message ?? "Ung\u00fcltige Datei." });
      }
      next();
    }),
    async (req: Request, res: Response) => {
      try {
        const user = await getUserFromRequest(req);
        if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }
        const thesisId = parseInt(req.params.id, 10);
        if (isNaN(thesisId)) { res.status(400).json({ error: "Ung\u00fcltige Thesis-ID" }); return; }
        const thesis = await getThesisRequestById(thesisId);
        if (!thesis) { res.status(404).json({ error: "Thesis nicht gefunden" }); return; }
        // Nur Studierende der eigenen Thesis d\u00fcrfen hochladen
        if (thesis.studentId !== user.id) { res.status(403).json({ error: "Kein Zugriff." }); return; }
        if (!req.file) { res.status(400).json({ error: "Keine Datei \u00fcbermittelt." }); return; }
        if (!hasExpectedFileSignature(req.file)) { res.status(400).json({ error: "Dateityp und Dateiinhalt stimmen nicht überein." }); return; }
        const note = typeof req.body?.note === "string" ? req.body.note.slice(0, 500) : null;
        const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9._\-\u00C0-\u024F]/g, "_");
        const storageFilename = `conditional-${thesisId}-${Date.now()}-${safeFilename}`;
        const { key, url } = await storagePut(`conditional-docs/${storageFilename}`, req.file.buffer, req.file.mimetype);
        // DB-Eintrag
        const { getDb } = await import("./db");
        const { conditionalDocuments } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) { res.status(500).json({ error: "Datenbankfehler" }); return; }
        await db.insert(conditionalDocuments).values({
          thesisRequestId: thesisId,
          uploadedByUserId: user.id,
          originalFilename: req.file.originalname,
          storageKey: key,
          storageUrl: url,
          mimeType: req.file.mimetype,
          fileSizeBytes: req.file.size,
          note,
        });
        // Audit-Log
        await createAuditLogEntry({
          thesisRequestId: thesisId,
          actorId: user.id,
          actorRole: user.role,
          action: "CONDITIONAL_DOCUMENT_UPLOADED",
          metadata: { filename: req.file.originalname, key },
        });
        res.json({ success: true, key, url, filename: req.file.originalname });
      } catch (err: unknown) {
        console.error("[Upload/conditional-docs] Fehler:", err);
        res.status(500).json({ error: "Der Upload konnte nicht abgeschlossen werden." });
      }
    }
  );

  // --- Profil-Banner-Upload ---
  app.post(
    "/api/upload/banner",
    (req, res, next) => upload.single("banner")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Die Datei ist zu gro\u00df. Bitte laden Sie ein Bild mit maximal 5 MB hoch." });
        }
        return res.status(400).json({ error: err.message ?? "Ung\u00fcltige Datei." });
      }
      next();
    }),
    async (req: Request, res: Response) => {
      try {
        const user = await getUserFromRequest(req);
        if (!user) { res.status(401).json({ error: "Nicht angemeldet." }); return; }
        if (!req.file) { res.status(400).json({ error: "Kein Bild \u00fcbermittelt." }); return; }
        const mimeType = req.file.mimetype;
        if (!['image/jpeg','image/png','image/webp','image/gif'].includes(mimeType)) {
          res.status(400).json({ error: "Nur JPEG, PNG, WebP oder GIF sind erlaubt." }); return;
        }
        if (!hasExpectedFileSignature(req.file)) {
          res.status(400).json({ error: "Dateityp und Dateiinhalt stimmen nicht überein." }); return;
        }
        const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
        const storageKey = `banners/user-${user.id}-${Date.now()}.${ext}`;
        const { key: savedKey, url } = await storagePut(storageKey, req.file.buffer, mimeType);
        // Banner-Felder in DB speichern
        const db = await (await import('./db.js')).getDb();
        if (!db) { res.status(500).json({ error: "Datenbankfehler." }); return; }
        const { users: usersTable } = await import('../drizzle/schema');
        const { eq: eqFn } = await import('drizzle-orm');
        await db.update(usersTable)
          .set({ bannerImageUrl: url, bannerImageKey: savedKey, bannerColor: null })
          .where(eqFn(usersTable.id, user.id));
        res.json({ success: true, bannerImageUrl: url, key: savedKey });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Banner-Upload fehlgeschlagen.";
        console.error("[Upload/banner] Fehler:", err);
        res.status(500).json({ error: message });
      }
    }
  );
}
