import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assignExaminerToThesis,
  createAuditLogEntry,
  createThesisRequest,
  getAllAuditLogs,
  getAllExaminers,
  getAllThesisRequests,
  getAllUsers,
  getAllUsersWithProfiles,
  createExaminerByAdmin,
  updateExaminerByAdmin,
  deleteUserByAdmin,
  getAuditLogByThesis,
  getExaminerProfileByUserId,
  getNotificationsByUser,
  getThesisRequestById,
  getThesisRequestsByExaminer,
  getThesisRequestsByStudent,
  getUnreadCount,
  getUserById,
  markAllNotificationsRead,
  markNotificationRead,
  notifyThesisParticipants,
  updateThesisDeadline,
  updateThesisRequestStatus,
  updateUserRole,
  upsertExaminerProfile,
  getThesisStats,
  getUserByEmail,
  setUserPasswordHash,
  getSystemSettings,
  upsertSystemSetting,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  getAllProgrammes,
  setStudentProgramme,
  getExaminerProgrammes,
  setExaminerProgrammes,
  updateExaminerAlternativeEmail,
  updateExaminerSecondExaminerFlag,
  resolveExaminerEmail,
  completeExaminerOnboarding,
  getUnassignedStudents,
  countOpenPavProposals,
  createPavProposal,
  getPavProposalsByPav,
  getPavProposalByToken,
  updatePavProposalStatus,
  assignExaminerFromProposal,
  getPavProgrammes,
  addPavProgramme,
  removePavProgramme,
  getUnassignedStudentsByPavProgrammes,
  getAllThesisRequestsForCsv,
  getAllThesisRequestsForDean,
  getAllUsersWithRoles,
  setUserRole,
  resetExaminerOnboarding,
  getAllPavUsersWithProgrammes,
  superadminAssignPavProgramme,
  superadminRemovePavProgramme,
  getThesisRequestDetailForDean,
  getDeanStats,
  getAllEmailTemplates,
  getEmailTemplateByKey,
  updateEmailTemplate,
} from "./db";
import { signExaminerActionToken, verifyExaminerActionToken } from "./jwtHelper";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ONE_YEAR_MS } from "@shared/const";
import {
  createColloquium,
  getAllColloquiums,
  getColloquiumsByThesis,
  getColloquiumsByExaminer,
  getColloquiumsByStudent,
  updateColloquiumStatus,
  deleteColloquium,
} from "./db";
import { createIcsEvent } from "./icsHelper";
import { sendExaminerCTAEmail, sendStatusChangeEmail, sendEmail, sendPavProgrammeAssignmentEmail } from "./emailHelper";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// --- Role guards --------------------------------------------------------------

const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student" && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Studierende haben Zugriff." });
  }
  return next({ ctx });
});

const examinerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "examiner" && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen haben Zugriff." });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Admins haben Zugriff." });
  }
  return next({ ctx });
});

const superadminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Superadmins haben Zugriff." });
  }
  return next({ ctx });
});

const pavProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "pav" && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur PAV haben Zugriff." });
  }
  return next({ ctx });
});

const deanProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["dean", "vice_dean", "superadmin", "admin"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Dekanat hat Zugriff." });
  }
  return next({ ctx });
});

// --- App Router ---------------------------------------------------------------

export const appRouter = router({
  system: systemRouter,

  // Öffentliche Systemstatus-Prozedur (kein Auth erforderlich)
  maintenanceStatus: publicProcedure.query(async () => {
    const settings = await getSystemSettings();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return {
      active: map["maintenanceMode"] === "true",
      contactEmail: map["contactEmail"] ?? "support@htw-berlin.de",
      systemName: map["systemName"] ?? "Thesis Match Maker",
    };
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Das neue Passwort muss mindestens 8 Zeichen lang sein."),
      }))
      .mutation(async ({ ctx, input }) => {
        // Aktuelles Passwort prüfen
        const user = await getUserByEmail(ctx.user.email ?? "");
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kein Passwort-Login für dieses Konto eingerichtet." });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Das aktuelle Passwort ist falsch." });
        }
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await setUserPasswordHash(ctx.user.id, newHash);
        return { success: true };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        // Kein Fehler zurückgeben wenn E-Mail nicht existiert (Security: kein User-Enumeration)
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) return { success: true };
        // Token generieren (kryptografisch sicher)
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
        await createPasswordResetToken(user.id, token, expiresAt);
        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        await sendEmail({
          to: input.email,
          subject: "Passwort zurücksetzen – HTW Berlin Thesis Match Maker",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <div style="background: #006937; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">HTW Berlin – Thesis Match Maker</h1>
              </div>
              <div style="padding: 32px; background: #f9f9f9;">
                <h2 style="color: #1a1a1a; margin-top: 0;">Passwort zurücksetzen</h2>
                <p style="color: #444;">Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den folgenden Button, um ein neues Passwort zu vergeben:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="background: #006937; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Passwort zurücksetzen</a>
                </div>
                <p style="color: #888; font-size: 13px;">Dieser Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
                <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} HTW Berlin – Hochschule für Technik und Wirtschaft</p>
              </div>
            </div>
          `,
        });
        return { success: true };
      }),
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
      }))
      .mutation(async ({ input }) => {
        const record = await getPasswordResetToken(input.token);
        if (!record) throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültiger oder abgelaufener Reset-Link." });
        if (record.used) throw new TRPCError({ code: "BAD_REQUEST", message: "Dieser Reset-Link wurde bereits verwendet." });
        if (new Date() > record.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Der Reset-Link ist abgelaufen. Bitte fordern Sie einen neuen an." });
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await setUserPasswordHash(record.userId, newHash);
        await markPasswordResetTokenUsed(input.token);
        return { success: true };
      }),
    loginWithPassword: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-Mail oder Passwort ungültig." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-Mail oder Passwort ungültig." });
        }
        // HTW-E-Mail-Validierung:
        // Studierende müssen immer @htw-berlin.de verwenden.
        // Erstprüfer:innen (examiner, isSecondExaminer=false) müssen @htw-berlin.de verwenden.
        // Zweitprüfer:innen (examiner, isSecondExaminer=true) dürfen externe E-Mails nutzen.
        // Admins/Superadmins sind ausgenommen.
        const isHtwEmail = input.email.toLowerCase().endsWith("@htw-berlin.de");
        if (!isHtwEmail) {
          if (user.role === "student") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Studierende müssen sich mit ihrer HTW-Berlin-E-Mail-Adresse (@htw-berlin.de) anmelden.",
            });
          }
          if (user.role === "examiner") {
            // Profil laden um isSecondExaminer-Flag zu prüfen
            const profile = await getExaminerProfileByUserId(user.id);
            const isSecondExaminer = profile && (profile as { isSecondExaminer?: number }).isSecondExaminer === 1;
            if (!isSecondExaminer) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Erstprüfer:innen müssen sich mit ihrer HTW-Berlin-E-Mail-Adresse (@htw-berlin.de) anmelden. Wenn Sie als Zweitprüfer:in agieren, aktivieren Sie bitte zunächst das entsprechende Flag in Ihrem Profil.",
              });
            }
          } else if (user.role !== "admin" && user.role !== "superadmin") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Bitte verwenden Sie Ihre HTW-Berlin-E-Mail-Adresse (@htw-berlin.de) zur Anmeldung.",
            });
          }
        }
        // JWT mit appId erstellen (kompatibel mit sdk.verifySession)
        const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
        const sessionToken = await new SignJWT({
          openId: user.openId,
          appId: process.env.VITE_APP_ID ?? "",
          name: user.name ?? user.email ?? "",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
          .sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, role: user.role };
      }),
  }),

  // --- Thesis Requests ------------------------------------------------------

  thesis: router({
    // Student: Neue Anfrage einreichen
    create: studentProcedure
      .input(
        z.object({
          title: z.string().min(1).max(512),
          description: z.string().min(1),
          department: z.string().min(2),
          abstract: z.string().optional(),
          targetSemester: z.string().optional(),
          language: z.enum(["de", "en"]).default("de"),
          degreeType: z.enum(["bachelor", "master"]).default("bachelor"),
          hasOwnTopic: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createThesisRequest({
          studentId: ctx.user.id,
          title: input.title,
          description: input.description,
          department: input.department,
          abstract: input.abstract,
          targetSemester: input.targetSemester,
          language: input.language,
          degreeType: input.degreeType,
          hasOwnTopic: input.hasOwnTopic ? 1 : 0,
          status: "PENDING",
        });
        const insertId = (result as { insertId: number }).insertId;
        await createAuditLogEntry({
          thesisRequestId: insertId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "THESIS_CREATED",
          toStatus: "PENDING",
        });
        return { success: true, insertId };
      }),

    // Student: Eigene Anfragen abrufen
    myRequests: studentProcedure.query(async ({ ctx }) => {
      return getThesisRequestsByStudent(ctx.user.id);
    }),

    // Prüfer: Eigene Betreuungen abrufen
    examinerRequests: examinerProcedure.query(async ({ ctx }) => {
      return getThesisRequestsByExaminer(ctx.user.id);
    }),

    // Admin: Alle Anfragen abrufen
    all: adminProcedure.query(async () => {
      return getAllThesisRequests();
    }),

    // Prüfer:in: Eigene Anfrage annehmen oder ablehnen
    examinerRespond: examinerProcedure
      .input(
        z.object({
          id: z.number(),
          action: z.enum(["accept", "reject"]),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        if (
          existing.examinerId !== ctx.user.id &&
          existing.secondExaminerId !== ctx.user.id &&
          ctx.user.role !== "admin"
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Diese Anfrage ist dir nicht zugewiesen." });
        }
        const newStatus = input.action === "accept" ? "ACCEPTED" : "REJECTED";
        await updateThesisRequestStatus(input.id, newStatus, {
          rejectionReason: input.rejectionReason,
        });
        await createAuditLogEntry({
          thesisRequestId: input.id,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: input.action === "accept" ? "EXAMINER_ACCEPTED" : "EXAMINER_REJECTED",
          fromStatus: existing.status,
          toStatus: newStatus,
          reason: input.rejectionReason,
        });
        // In-App-Benachrichtigung
        await notifyThesisParticipants({
          thesisRequestId: input.id,
          studentId: existing.studentId,
          examinerId: existing.examinerId,
          secondExaminerId: existing.secondExaminerId,
          title: input.action === "accept" ? "Anfrage angenommen" : "Anfrage abgelehnt",
          message: `Ihre Anfrage "${existing.title}" wurde ${input.action === "accept" ? "angenommen" : "abgelehnt"}.${input.rejectionReason ? ` Begründung: ${input.rejectionReason}` : ""}`,
          type: "status_change",
        });
        return { success: true };
      }),

    // Admin: Status ändern (mit AuditLog + Benachrichtigungen)
    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "MATCHED"]),
          reason: z.string().optional(),
          origin: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getThesisRequestById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

        await updateThesisRequestStatus(input.id, input.status, {
          rejectionReason: input.reason,
        });
        await createAuditLogEntry({
          thesisRequestId: input.id,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "STATUS_CHANGED",
          fromStatus: existing.status,
          toStatus: input.status,
          reason: input.reason,
        });

        // In-App-Benachrichtigung + E-Mail
        if (["ACCEPTED", "REJECTED", "MATCHED"].includes(input.status)) {
          const statusLabel: Record<string, string> = {
            ACCEPTED: "Angenommen",
            REJECTED: "Abgelehnt",
            MATCHED: "Matched",
          };
          await notifyThesisParticipants({
            thesisRequestId: input.id,
            studentId: existing.studentId,
            examinerId: existing.examinerId,
            secondExaminerId: existing.secondExaminerId,
            title: `Status geändert: ${statusLabel[input.status] ?? input.status}`,
            message: `"${existing.title}" hat den Status ${statusLabel[input.status] ?? input.status} erhalten.${input.reason ? ` Begründung: ${input.reason}` : ""}`,
            type: "status_change",
          });
          const student = await getUserById(existing.studentId);
          const origin = input.origin ?? "https://thesis-match.htw-berlin.de";
          if (student?.email) {
            await sendStatusChangeEmail({
              to: student.email,
              studentName: student.name ?? "Studierende:r",
              thesisTitle: existing.title,
              newStatus: input.status as "ACCEPTED" | "REJECTED" | "MATCHED",
              reason: input.reason,
              dashboardUrl: `${origin}/student`,
            });
          }
          // Prüfer:innen benachrichtigen (resolveExaminerEmail bevorzugt alternativeEmail)
          const examinerIds = [existing.examinerId, existing.secondExaminerId].filter(Boolean) as number[];
          for (const exId of examinerIds) {
            const ex = await getUserById(exId);
            if (!ex?.email) continue;
            const exEmailTo = (await resolveExaminerEmail(exId)) ?? ex.email;
            await sendEmail({
              to: exEmailTo,
              subject: `Thesis Match: Statusänderung – ${existing.title}`,
              html: `<p>Guten Tag ${ex.name ?? "Prüfer:in"},</p><p>der Status der Abschlussarbeit <strong>${existing.title}</strong> hat sich geändert: <strong>${input.status}</strong>.</p>${input.reason ? `<p>Begründung: ${input.reason}</p>` : ""}<p>Weitere Details finden Sie im <a href="${origin}/examiner">Prüfer:innen-Dashboard</a>.</p>`,
            });
          }
        }
        return { success: true };
      }),

    // Admin: Prüfer zuweisen (mit AuditLog + JWT-E-Mail + Benachrichtigung)
    assignExaminer: adminProcedure
      .input(
        z.object({
          thesisId: z.number(),
          examinerId: z.number(),
          slot: z.enum(["first", "second"]),
          origin: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const thesis = await getThesisRequestById(input.thesisId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const examiner = await getUserById(input.examinerId);
        if (!examiner) throw new TRPCError({ code: "NOT_FOUND", message: "Prüfer:in nicht gefunden." });
        const student = await getUserById(thesis.studentId);

        await assignExaminerToThesis(input.thesisId, input.examinerId, input.slot);
        await createAuditLogEntry({
          thesisRequestId: input.thesisId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: input.slot === "first" ? "FIRST_EXAMINER_ASSIGNED" : "SECOND_EXAMINER_ASSIGNED",
          metadata: { examinerId: input.examinerId, slot: input.slot },
        });

        // In-App-Benachrichtigung
        await notifyThesisParticipants({
          thesisRequestId: input.thesisId,
          studentId: thesis.studentId,
          examinerId: input.examinerId,
          title: "Prüfer:in zugewiesen",
          message: `Ihrer Anfrage "${thesis.title}" wurde ${input.slot === "first" ? "eine Erstprüfer:in" : "eine Zweitprüfer:in"} zugewiesen.`,
          type: "examiner_assigned",
        });

        // JWT-CTA-E-Mail an Prüfer:in senden
        // resolveExaminerEmail bevorzugt alternativeEmail aus dem Profil
        if (examiner.email) {
          const emailTo = (await resolveExaminerEmail(input.examinerId)) ?? examiner.email;
          const token = await signExaminerActionToken({
            thesisRequestId: input.thesisId,
            examinerId: input.examinerId,
            action: "accept",
            studentName: student?.name ?? "Studierende:r",
            thesisTitle: thesis.title,
          });
          const origin = input.origin ?? "https://thesis-match.htw-berlin.de";
          await sendExaminerCTAEmail({
            to: emailTo,
            examinerName: examiner.name ?? "Prüfer:in",
            studentName: student?.name ?? "Studierende:r",
            thesisTitle: thesis.title,
            department: thesis.department,
            acceptUrl: `${origin}/examiner/respond?token=${token}&action=accept`,
            rejectUrl: `${origin}/examiner/respond?token=${token}&action=reject`,
          });
        }
        return { success: true };
      }),

    // Einzelne Anfrage abrufen
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getThesisRequestById(input.id);
      }),
  }),

  // --- Examiner -------------------------------------------------------------

  examiner: router({
    // Nur für eingeloggte Nutzer:innen: Alle Prüfer-Profile abrufen
    list: protectedProcedure.query(async () => {
      return getAllExaminers();
    }),

    // Prüfer: Eigenes Profil abrufen
    myProfile: examinerProcedure.query(async ({ ctx }) => {
      return getExaminerProfileByUserId(ctx.user.id);
    }),

    // Prüfer: Profil aktualisieren
    updateProfile: examinerProcedure
      .input(
        z.object({
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
          maxSupervisions: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertExaminerProfile({ userId: ctx.user.id, ...input });
        return { success: true };
      }),

    // JWT-gesicherter Endpunkt: Prüfer antwortet per E-Mail-Link (kein Login nötig)
    respondViaToken: publicProcedure
      .input(
        z.object({
          token: z.string(),
          action: z.enum(["accept", "reject"]),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const payload = await verifyExaminerActionToken(input.token);
        if (!payload) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Ungültiger oder abgelaufener Token.",
          });
        }
        const thesis = await getThesisRequestById(payload.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const newStatus = input.action === "accept" ? "ACCEPTED" : "REJECTED";
        await updateThesisRequestStatus(payload.thesisRequestId, newStatus, {
          rejectionReason: input.rejectionReason,
        });
        await createAuditLogEntry({
          thesisRequestId: payload.thesisRequestId,
          actorId: payload.examinerId,
          actorRole: "examiner",
          action: input.action === "accept" ? "EXAMINER_ACCEPTED" : "EXAMINER_REJECTED",
          fromStatus: thesis.status,
          toStatus: newStatus,
          reason: input.rejectionReason,
        });
        // In-App-Benachrichtigung
        await notifyThesisParticipants({
          thesisRequestId: payload.thesisRequestId,
          studentId: thesis.studentId,
          examinerId: payload.examinerId,
          title: input.action === "accept" ? "Anfrage angenommen" : "Anfrage abgelehnt",
          message: `Ihre Anfrage "${thesis.title}" wurde ${input.action === "accept" ? "angenommen" : "abgelehnt"}.`,
          type: "status_change",
        });
        return { success: true, action: input.action };
      }),

    // Öffentlich: Einzelnes Prüfer-Profil abrufen (für Profilseite)
    getPublicProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const rows = await getAllExaminers();
        const found = rows.find((r) => r.user.id === input.userId);
        if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "Prüfer:in nicht gefunden" });
        return found;
      }),
    // Prüfer: Erweiterte Profil-Felder aktualisieren
    updateProfileExtended: examinerProcedure
      .input(
        z.object({
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
          maxSupervisions: z.number().optional(),
          researchFocus: z.string().optional(),
          officeHours: z.string().optional(),
          websiteUrl: z.string().optional(),
          phone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertExaminerProfile({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
    // Prüfer:in: Alternative E-Mail-Adresse setzen (für Zweitprüfer:innen mit externer E-Mail)
    setAlternativeEmail: examinerProcedure
      .input(
        z.object({
          alternativeEmail: z.string().email().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateExaminerAlternativeEmail(ctx.user.id, input.alternativeEmail ?? null);
        return { success: true };
      }),

    // Prüfer:in oder Admin: Zweitprüfer:in-Flag setzen
    // Admins können userId angeben, Prüfer:innen setzen ihr eigenes Flag
    setSecondExaminerFlag: examinerProcedure
      .input(
        z.object({
          isSecondExaminer: z.boolean(),
          userId: z.number().optional(), // nur für Admins
        })
      )
      .mutation(async ({ ctx, input }) => {
        const targetUserId = (input.userId && (ctx.user.role === "admin" || ctx.user.role === "superadmin"))
          ? input.userId
          : ctx.user.id;
        await updateExaminerSecondExaminerFlag(targetUserId, input.isSecondExaminer);
        return { success: true };
      }),

    // Prüfer:in: Onboarding abschließen (vollständiger 5-Schritt-Assistent)
    completeOnboarding: examinerProcedure
      .input(
        z.object({
          isSecondExaminer: z.boolean(),
          alternativeEmail: z.string().email().optional().nullable(),
          // Erweiterte Profildaten
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          researchFocus: z.string().optional(),
          officeHours: z.string().optional(),
          websiteUrl: z.string().optional(),
          phone: z.string().optional(),
          languages: z.array(z.string()).optional(),
          maxSupervisions: z.number().int().min(0).max(20).optional(),
          programmeIds: z.array(z.number().int().positive()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { programmeIds, isSecondExaminer, alternativeEmail, ...profileFields } = input;
        await upsertExaminerProfile({
          userId: ctx.user.id,
          ...profileFields,
          alternativeEmail: alternativeEmail ?? null,
          isSecondExaminer: isSecondExaminer ? 1 : 0,
          onboardingCompleted: 1,
        });
        if (programmeIds && programmeIds.length > 0) {
          await setExaminerProgrammes(ctx.user.id, programmeIds);
        }
        return { success: true };
      }),

    // Admin: JWT-Token für Prüfer generieren (für E-Mail-CTA)
    generateActionToken: adminProcedure
      .input(
        z.object({
          thesisRequestId: z.number(),
          examinerId: z.number(),
          action: z.enum(["accept", "reject"]),
          studentName: z.string(),
          thesisTitle: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const token = await signExaminerActionToken(input);
        return { token };
      }),
  }),

  // --- Audit Log ------------------------------------------------------------

  auditLog: router({
    all: adminProcedure.query(async () => {
      return getAllAuditLogs();
    }),
    byThesis: protectedProcedure
      .input(z.object({ thesisRequestId: z.number() }))
      .query(async ({ input }) => {
        return getAuditLogByThesis(input.thesisRequestId);
      }),
  }),

  // --- Notifications --------------------------------------------------------

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationsByUser(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadCount(ctx.user.id);
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // -  // --- Admin: User-Management & Prüfer-CRUD -------------------------------------------
  admin: router({
    users: adminProcedure.query(async () => {
      return getAllUsersWithProfiles();
    }),
    updateUserRole: superadminProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["student", "examiner", "admin", "user", "superadmin"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserRole(input.userId, input.role as any);
        await createAuditLogEntry({
          action: "ROLE_CHANGED",
          actorId: ctx.user.id,
          metadata: { userId: input.userId, newRole: input.role },
        });
        return { success: true };
      }),
    createExaminer: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          maxSupervisions: z.number().min(1).max(20).optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createExaminerByAdmin(input);
        await createAuditLogEntry({
          action: "EXAMINER_CREATED",
          actorId: ctx.user.id,
          metadata: { ...result, email: input.email, name: input.name },
        });
        return result;
      }),
    updateExaminer: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          name: z.string().min(2).optional(),
          title: z.string().optional(),
          department: z.string().optional(),
          bio: z.string().optional(),
          maxSupervisions: z.number().min(1).max(20).optional(),
          tags: z.array(z.string()).optional(),
          languages: z.array(z.string()).optional(),
          studyPrograms: z.array(z.string()).optional(),
          role: z.enum(["examiner", "admin", "student", "user"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { userId, ...data } = input;
        await updateExaminerByAdmin(userId, data);
        await createAuditLogEntry({
          action: "EXAMINER_UPDATED",
          actorId: ctx.user.id,
          metadata: { userId, changes: data },
        });
        return { success: true };
      }),
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Sie können sich nicht selbst löschen." });
        }
        await deleteUserByAdmin(input.userId);
        await createAuditLogEntry({
          action: "USER_DELETED",
          actorId: ctx.user.id,
          metadata: { deletedUserId: input.userId },
        });
        return { success: true };
      }),
    setDeadline: adminProcedure
      .input(
        z.object({
          thesisId: z.number(),
          deadline: z.string().nullable(), // ISO-String oder null
        })
      )
      .mutation(async ({ ctx, input }) => {
        const thesis = await getThesisRequestById(input.thesisId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND" });
        const deadlineDate = input.deadline ? new Date(input.deadline) : null;
        await updateThesisDeadline(input.thesisId, deadlineDate);
        await createAuditLogEntry({
          thesisRequestId: input.thesisId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: deadlineDate ? "DEADLINE_SET" : "DEADLINE_REMOVED",
          metadata: { deadline: input.deadline },
        });
        // Benachrichtigungen an Beteiligte
        await notifyThesisParticipants({
          thesisRequestId: input.thesisId,
          studentId: thesis.studentId,
          examinerId: thesis.examinerId,
          secondExaminerId: thesis.secondExaminerId,
          title: deadlineDate ? "Deadline gesetzt" : "Deadline entfernt",
          message: deadlineDate
            ? `Für Ihre Anfrage "${thesis.title}" wurde eine Deadline gesetzt: ${deadlineDate.toLocaleDateString("de-DE")}.`
            : `Die Deadline für Ihre Anfrage "${thesis.title}" wurde entfernt.`,
          type: "status_change",
        });
        return { success: true };
      }),
    sendInvite: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          role: z.enum(["student", "examiner"]),
          origin: z.string().url(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { sendMagicLink: sendLink } = await import("./magicLinkAuth");
        const result = await sendLink(input.email, input.role, input.origin);
        await createAuditLogEntry({
          action: "INVITE_SENT",
          actorId: ctx.user.id,
          metadata: { email: input.email, role: input.role },
        });
        return result;
      }),
    stats: adminProcedure.query(async () => {
      return getThesisStats();
    }),
  }),

  // --- Onboarding: Rolle nach erstem Login setzen ---
  onboarding: router({
    setRole: protectedProcedure
      .input(z.object({ role: z.enum(["student", "examiner"]) }))
      .mutation(async ({ ctx, input }) => {
        await updateUserRole(ctx.user.id, input.role);
        return { success: true, role: input.role };
      }),
  }),
  // --- Kolloquien ---
  colloquium: router({
    all: adminProcedure.query(async () => getAllColloquiums()),
    byThesis: protectedProcedure
      .input(z.object({ thesisRequestId: z.number().int().positive() }))
      .query(async ({ input }) => getColloquiumsByThesis(input.thesisRequestId)),
    create: adminProcedure
      .input(z.object({
        thesisRequestId: z.number().int().positive(),
        title: z.string().min(3).max(512),
        scheduledAt: z.number(),
        location: z.string().max(512).optional(),
        room: z.string().max(256).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createColloquium({
          thesisRequestId: input.thesisRequestId,
          title: input.title,
          scheduledAt: new Date(input.scheduledAt),
          location: input.location ?? null,
          room: input.room ?? null,
          notes: input.notes ?? null,
          createdById: ctx.user.id,
        });
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "COLLOQUIUM_CREATED",
          metadata: { colloquiumId: id, title: input.title },
        });
        return { id };
      }),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]),
      }))
      .mutation(async ({ input }) => {
        await updateColloquiumStatus(input.id, input.status);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await deleteColloquium(input.id);
        return { success: true };
      }),
    getIcs: protectedProcedure
      .input(z.object({ colloquiumId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const all = await getAllColloquiums();
        const col = all.find(c => c.id === input.colloquiumId);
        if (!col) throw new TRPCError({ code: "NOT_FOUND", message: "Kolloquium nicht gefunden" });
        const icsContent = createIcsEvent({
          title: col.title,
          start: col.scheduledAt,
          durationMinutes: 60,
          location: [col.location, col.room].filter(Boolean).join(" – ") || undefined,
          description: col.notes || undefined,
        });
        return { icsContent, filename: `kolloquium-${col.id}.ics` };
      }),
    // Studierende: Eigene Kolloquien abrufen
    myStudentColloquiums: studentProcedure.query(async ({ ctx }) => {
      return getColloquiumsByStudent(ctx.user.id);
    }),
    // Prüfer:innen: Eigene Kolloquien abrufen
    myExaminerColloquiums: examinerProcedure.query(async ({ ctx }) => {
      return getColloquiumsByExaminer(ctx.user.id);
    }),
  }),
  // --- Superadmin: Systemkonfiguration ---
  superadmin: router({
    getSettings: superadminProcedure.query(async () => {
      const rows = await getSystemSettings();
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      return {
        systemName: map["systemName"] ?? "HTW Berlin Thesis Match Maker",
        contactEmail: map["contactEmail"] ?? "",
        maintenanceMode: map["maintenanceMode"] ?? "false",
        maxSupervisionDefault: map["maxSupervisionDefault"] ?? "5",
        allowStudentRegistration: map["allowStudentRegistration"] ?? "true",
        footerText: map["footerText"] ?? "",
        thesisDeadlineWarningDays: map["thesisDeadlineWarningDays"] ?? "14",
      };
    }),
    updateSettings: superadminProcedure
      .input(
        z.object({
          systemName: z.string().min(1).max(128).optional(),
          contactEmail: z.string().email().or(z.literal("")).optional(),
          maintenanceMode: z.enum(["true", "false"]).optional(),
          maxSupervisionDefault: z.string().optional(),
          allowStudentRegistration: z.enum(["true", "false"]).optional(),
          footerText: z.string().max(512).optional(),
          thesisDeadlineWarningDays: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const entries = Object.entries(input).filter(([, v]) => v !== undefined) as [string, string][];
        for (const [key, value] of entries) {
          await upsertSystemSetting(key, value, ctx.user.id);
        }
        return { success: true };
      }),

    /** Alle Nutzer:innen mit Rollen (SuperAdmin) */
    listAllUsers: superadminProcedure.query(async () => {
      return getAllUsersWithRoles();
    }),

    /** Rolle eines Nutzers setzen (SuperAdmin) */
    setUserRole: superadminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          role: z.enum(["student", "examiner", "pav", "admin", "dean", "vice_dean", "superadmin"]),
        })
      )
      .mutation(async ({ input }) => {
        await setUserRole(input.userId, input.role);
        return { success: true };
      }),

    /** Onboarding-Reset für Prüfer:in (SuperAdmin) */
    resetExaminerOnboarding: superadminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await resetExaminerOnboarding(input.userId);
        return { success: true };
      }),
    /** Alle PAV-Nutzer:innen mit Studiengaengen */
    getPavUsers: superadminProcedure.query(async () => {
      return getAllPavUsersWithProgrammes();
    }),
    /** PAV einem Studiengang zuweisen */
    assignPavProgramme: superadminProcedure
      .input(z.object({ userId: z.number().int().positive(), programmeId: z.number().int().positive(), origin: z.string().url().optional() }))
      .mutation(async ({ input }) => {
        await superadminAssignPavProgramme(input.userId, input.programmeId);
        // E-Mail an PAV senden
        const pavUser = await getUserById(input.userId);
        const allProgs = await getAllProgrammes();
        const prog = allProgs.find((p) => p.id === input.programmeId);
        if (pavUser?.email && prog) {
          const dashboardUrl = `${input.origin ?? "https://thesismatch.manus.space"}/pav`;
          await sendPavProgrammeAssignmentEmail({
            to: pavUser.email,
            pavName: pavUser.name ?? pavUser.email,
            programmeName: prog.name,
            programmeLevel: prog.level,
            dashboardUrl,
            removed: false,
          });
        }
        return { success: true };
      }),
    /** PAV-Studiengang-Zuweisung entfernen */
    removePavProgramme: superadminProcedure
      .input(z.object({ userId: z.number().int().positive(), programmeId: z.number().int().positive(), origin: z.string().url().optional() }))
      .mutation(async ({ input }) => {
        await superadminRemovePavProgramme(input.userId, input.programmeId);
        // E-Mail an PAV senden
        const pavUser = await getUserById(input.userId);
        const allProgs = await getAllProgrammes();
        const prog = allProgs.find((p) => p.id === input.programmeId);
        if (pavUser?.email && prog) {
          const dashboardUrl = `${input.origin ?? "https://thesismatch.manus.space"}/pav`;
          await sendPavProgrammeAssignmentEmail({
            to: pavUser.email,
            pavName: pavUser.name ?? pavUser.email,
            programmeName: prog.name,
            programmeLevel: prog.level,
            dashboardUrl,
            removed: true,
          });
        }
        return { success: true };
      }),
  }),
  // --- System: SMTP-Verbindungstest ---
  system2: router({
    testSmtp: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        try {
          const ok = await sendEmail({
            to: input.email,
            subject: "HTW Berlin Thesis Match Maker – SMTP-Test",
            html: `<div style="font-family:sans-serif;padding:24px"><h2 style="color:#76B900">SMTP-Verbindungstest erfolgreich</h2><p>Diese E-Mail bestätigt, dass der SMTP-Server korrekt konfiguriert ist.</p><p style="color:#888;font-size:12px">HTW Berlin &ndash; Thesis Match Maker</p></div>`,
            text: "SMTP-Verbindungstest erfolgreich. Der SMTP-Server ist korrekt konfiguriert.",
          });
          return { success: ok, message: ok ? "Test-E-Mail erfolgreich versendet." : "SMTP nicht konfiguriert." };
        } catch (err: unknown) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "SMTP-Fehler" });
        }
      }),
  }),
  // --- Studiengänge ---
  programmes: router({
    list: publicProcedure.query(async () => {
      return getAllProgrammes();
    }),
    setStudentProgramme: protectedProcedure
      .input(z.object({ programmeId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'student') throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Studierende können einen Studiengang wählen.' });
        const success = await setStudentProgramme(ctx.user.id, input.programmeId);
        if (!success) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Studiengang wurde bereits gesetzt und kann nicht geändert werden.' });
        return { success: true };
      }),
    getMyProgramme: protectedProcedure.query(async ({ ctx }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT p.* FROM programmes p INNER JOIN users u ON u.programme_id = p.id WHERE u.id = ?',
        [ctx.user.id]
      ) as any;
      await conn.end();
      return (rows as any[])[0] ?? null;
    }),
    getExaminerProgrammes: protectedProcedure.query(async ({ ctx }) => {
      return getExaminerProgrammes(ctx.user.id);
    }),
    setExaminerProgrammes: protectedProcedure
      .input(z.object({ programmeIds: z.array(z.number().int().positive()) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'examiner' && ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin')
          throw new TRPCError({ code: 'FORBIDDEN' });
        await setExaminerProgrammes(ctx.user.id, input.programmeIds);
        return { success: true };
      }),
  }),

  // ─── PAV Router ────────────────────────────────────────────────────────────
  pav: router({
    /** Unzugeteilte Studierende (kein Erst-/Zweitprüfer:in) */
    getUnassignedStudents: pavProcedure.query(async () => {
      return getUnassignedStudents();
    }),

    /** Eigene Vorschläge des PAV */
    getProposals: pavProcedure.query(async ({ ctx }) => {
      return getPavProposalsByPav(ctx.user.id);
    }),

    /** PAV-Studiengang-Zuordnungen lesen */
    getProgrammes: pavProcedure.query(async ({ ctx }) => {
      return getPavProgrammes(ctx.user.id);
    }),

    /** Studiengang hinzufügen */
    addProgramme: pavProcedure
      .input(z.object({ programmeId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await addPavProgramme(ctx.user.id, input.programmeId);
        return { success: true };
      }),

    /** Studiengang entfernen */
    removeProgramme: pavProcedure
      .input(z.object({ programmeId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await removePavProgramme(ctx.user.id, input.programmeId);
        return { success: true };
      }),

    /** Unzugeteilte Studierende (gefiltert nach PAV-Studiengängen) */
    getUnassignedStudentsFiltered: pavProcedure.query(async ({ ctx }) => {
      return getUnassignedStudentsByPavProgrammes(ctx.user.id);
    }),

    /** Prüfer:in vorschlagen (max. 3 offene Anfragen pro Antrag) */
    proposeExaminer: pavProcedure
      .input(
        z.object({
          thesisRequestId: z.number().int().positive(),
          examinerId: z.number().int().positive(),
          examinerRole: z.enum(["first", "second"]),
          origin: z.string().url(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Maximal 3 offene Anfragen gleichzeitig
        const openCount = await countOpenPavProposals(input.thesisRequestId);
        if (openCount >= 3) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Es sind bereits 3 offene Anfragen für diesen Antrag vorhanden. Bitte warten Sie auf eine Antwort.",
          });
        }
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        await createPavProposal({
          thesisRequestId: input.thesisRequestId,
          proposedByPavId: ctx.user.id,
          examinerId: input.examinerId,
          examinerRole: input.examinerRole,
          actionToken: token,
          emailSentAt: new Date(),
        });
        // E-Mail an Prüfer:in
        const examinerEmail = await resolveExaminerEmail(input.examinerId);
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (examinerEmail && thesis) {
          const { sendEmail } = await import("./emailHelper");
          const acceptUrl = `${input.origin}/pav/respond?token=${token}&action=accept`;
          const declineUrl = `${input.origin}/pav/respond?token=${token}&action=decline`;
          await sendEmail({
            to: examinerEmail,
            subject: `HTW Berlin – Anfrage als ${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}: ${thesis.title}`,
            html: `<p>Sehr geehrte Damen und Herren,</p>
<p>der Prüfungsausschuss hat Sie als <strong>${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}</strong> für folgende Abschlussarbeit vorgeschlagen:</p>
<p><strong>${thesis.title}</strong></p>
<p>Bitte nehmen Sie die Anfrage an oder lehnen Sie sie ab:</p>
<p><a href="${acceptUrl}">Anfrage annehmen</a> &nbsp;|&nbsp; <a href="${declineUrl}">Anfrage ablehnen</a></p>
<p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsausschuss</p>`,
          });
        }
        return { success: true };
      }),

    /** Prüfer:in antwortet auf Vorschlag (per Token-Link) */
    respondToProposal: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
          action: z.enum(["accept", "decline"]),
          declineReason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const proposal = await getPavProposalByToken(input.token);
        if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Ungültiger oder abgelaufener Link." });
        if (proposal.status !== "pending") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Diese Anfrage wurde bereits beantwortet." });
        }
        if (input.action === "accept") {
          await updatePavProposalStatus(proposal.id, "accepted");
          await assignExaminerFromProposal(proposal.thesisRequestId, proposal.examinerId, proposal.examinerRole);
        } else {
          await updatePavProposalStatus(proposal.id, "declined", input.declineReason);
        }
        return { success: true, action: input.action };
      }),

    /** PAV weist Prüfer:in direkt zu (ohne Rückfrage-E-Mail) */
    directAssignExaminer: pavProcedure
      .input(
        z.object({
          thesisRequestId: z.number().int().positive(),
          examinerId: z.number().int().positive(),
          examinerRole: z.enum(["first", "second"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const thesis = await getThesisRequestById(input.thesisRequestId);
        if (!thesis) throw new TRPCError({ code: "NOT_FOUND", message: "Antrag nicht gefunden." });
        if (input.examinerRole === "first" && thesis.examinerId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Dieser Antrag hat bereits eine Erstprüfer:in." });
        }
        if (input.examinerRole === "second" && thesis.secondExaminerId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Dieser Antrag hat bereits eine Zweitprüfer:in." });
        }
        await assignExaminerFromProposal(input.thesisRequestId, input.examinerId, input.examinerRole);
        await createAuditLogEntry({
          thesisRequestId: input.thesisRequestId,
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "EXAMINER_ASSIGNED",
          metadata: { examinerId: input.examinerId, slot: input.examinerRole, assignedByPav: true, directAssignment: true },
        });
        // Benachrichtigungs-E-Mail an Prüfer:in
        const examinerEmail = await resolveExaminerEmail(input.examinerId);
        if (examinerEmail) {
          await sendEmail({
            to: examinerEmail,
            subject: `HTW Berlin – Sie wurden als ${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"} zugewiesen: ${thesis.title ?? "Abschlussarbeit"}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
<div style="background:#006937;padding:24px;text-align:center"><h1 style="color:white;margin:0;font-size:20px">HTW Berlin – Thesis Match Maker</h1></div>
<div style="padding:32px;background:#f9f9f9">
<p>Sehr geehrte Damen und Herren,</p>
<p>der Prüfungsausschuss hat Sie als <strong>${input.examinerRole === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}</strong> für folgende Abschlussarbeit direkt zugewiesen:</p>
<p><strong>${thesis.title ?? "Abschlussarbeit"}</strong></p>
<p>Diese Zuweisung ist verbindlich und erfordert keine weitere Bestätigung Ihrerseits. Bei Rückfragen wenden Sie sich bitte an den Prüfungsausschuss.</p>
<p>Mit freundlichen Grüßen<br>HTW Berlin – Prüfungsausschuss</p>
</div></div>`,
          });
        }
        return { success: true };
      }),
  }),

  // ─── Dekanat Router ────────────────────────────────────────────────────────
  dean: router({
    /** Alle Anträge lesen (Lesezugriff für Dekan/Prodekan) */
    getAllRequests: deanProcedure.query(async () => {
      return getAllThesisRequestsForDean();
    }),

    /** Einzelner Antrag mit Details (Prüfer:innen, Statushistorie, Kolloquium) */
    getRequestDetail: deanProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getThesisRequestDetailForDean(input.requestId);
      }),
    /** Statistiken für das Dekanat-Dashboard */
    stats: deanProcedure.query(async () => {
      return getDeanStats();
    }),

    /** CSV-Export – optional gefiltert nach Status und Suchbegriff */
    exportCsv: deanProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const rows = await getAllThesisRequestsForCsv();
        // Filtern
        const filtered = rows.filter((r) => {
          const matchesStatus = !input?.status || input.status === "all" || r.status === input.status;
          const q = (input?.search ?? "").toLowerCase();
          const matchesSearch = !q ||
            (r.title ?? "").toLowerCase().includes(q) ||
            (r.studentName ?? "").toLowerCase().includes(q) ||
            (r.department ?? "").toLowerCase().includes(q);
          return matchesStatus && matchesSearch;
        });
        const header = [
          "ID","Titel","Studiengang","Abschluss","Status","Sprache","Eigenes Thema","Erstellt am","Abgabefrist","Letzte Status\u00e4nderung","Anzahl Status\u00e4nderungen","Studierende:r","E-Mail"
        ].join(";");
        const csvRows = filtered.map((r) => [
          r.id,
          `"${(r.title ?? "").replace(/"/g, '""')}"`,
          `"${(r.department ?? "").replace(/"/g, '""')}"`,
          r.degreeType,
          r.status,
          r.language,
          r.hasOwnTopic ? "Ja" : "Nein",
          r.createdAt ? new Date(r.createdAt).toLocaleDateString("de-DE") : "",
          r.deadline ? new Date(r.deadline).toLocaleDateString("de-DE") : "",
          (r as any).lastStatusChange ? new Date((r as any).lastStatusChange).toLocaleDateString("de-DE") : "",
          (r as any).statusChangeCount ?? 0,
          `"${(r.studentName ?? "").replace(/"/g, '""')}"`,
          r.studentEmail,
        ].join(";"));
        return { csv: [header, ...csvRows].join("\n"), count: filtered.length };
      }),
  }),

  // ─── E-Mail-Vorlagen (Superadmin) ─────────────────────────────────────────
  emailTemplates: router({
    /** Alle Vorlagen abrufen */
    getAll: superadminProcedure.query(async () => {
      return getAllEmailTemplates();
    }),

    /** Einzelne Vorlage abrufen */
    getByKey: superadminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return getEmailTemplateByKey(input.key);
      }),

    /** Vorlage aktualisieren */
    update: superadminProcedure
      .input(z.object({
        key: z.string(),
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        textBody: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateEmailTemplate(
          input.key,
          { subject: input.subject, htmlBody: input.htmlBody, textBody: input.textBody },
          ctx.user.id
        );
        return { success: true };
      }),
  }),

  // ─── Admin-Erweiterung: Onboarding-Reset ──────────────────────────────────
  adminExtra: router({
    resetExaminerOnboarding: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await resetExaminerOnboarding(input.userId);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
