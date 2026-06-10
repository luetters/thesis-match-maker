#!/usr/bin/env python3
"""Fügt PDF-Download und Verifikations-Routen in uploadRoutes.ts ein."""
import re

path = "/home/ubuntu/thesis-match-maker/server/uploadRoutes.ts"
with open(path, "r") as f:
    content = f.read()

# 1. Import-Zeile patchen
old_import = 'import { createAuditLogEntry, getThesisRequestById, updateThesisExpose, getUserById, updateExaminerPhoto, updateProfileAvatar, getUserByOpenId } from "./db";'
new_import = (
    'import { createAuditLogEntry, getThesisRequestById, updateThesisExpose, getUserById, updateExaminerPhoto, updateProfileAvatar, getUserByOpenId, createThesisDocToken, getThesisDocTokenByToken } from "./db";\n'
    'import { generateThesisPdf } from "./thesisPdf";\n'
    'import crypto from "crypto";'
)
if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print("OK: Import-Zeile gepatcht")
else:
    print("WARNUNG: Import-Zeile nicht gefunden")

# 2. Neue Routen vor "// GET /api/thesis/:id/deadline.ics" einfügen
marker = "  // --- ICS-Kalender-Export für Thesis-Deadline ---"
new_routes = r"""  // GET /api/thesis/:id/registration.pdf – Anmeldedokument herunterladen
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
        const { getDb } = await import("./_core/db");
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

  // GET /api/thesis/:id/deadline.ics"""

if marker in content:
    content = content.replace(marker, new_routes, 1)
    print("OK: Neue Routen eingefügt")
else:
    print("WARNUNG: Marker nicht gefunden")

with open(path, "w") as f:
    f.write(content)
print("Datei gespeichert.")
