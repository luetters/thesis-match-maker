import { and, eq } from "drizzle-orm";
import { twoFactorReminderEmails } from "../drizzle/schema";
import { getDb, getSystemSetting, getUsersMissingRequiredTwoFactor } from "./db";
import { sendEmail } from "./emailHelper";

const TWO_FACTOR_REQUIREMENT_KEY = "twoFactorRequiredRoles";
const TWO_FACTOR_REMINDER_TASK_KEY = "twoFactorReminderScheduleTaskUid";
const TWO_FACTOR_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function parseRequiredTwoFactorRoles(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((role): role is string => typeof role === "string") : [];
  } catch {
    return [];
  }
}

export function isTwoFactorRequirementOverdue(updatedAt: string | null | undefined, now = new Date()): boolean {
  if (!updatedAt) return false;
  const activatedAt = new Date(updatedAt).getTime();
  return Number.isFinite(activatedAt) && now.getTime() >= activatedAt + TWO_FACTOR_GRACE_PERIOD_MS;
}

function buildReminderEmail(language: "de" | "en", name: string | null, role: string) {
  const baseUrl = process.env.PUBLIC_APP_URL ?? "https://thesis.htw-berlin.com";
  const setupUrl = `${baseUrl}/admin`;
  const safeName = name?.trim() || (language === "en" ? "Portal user" : "Portalnutzer:in");
  const roleLabel = role.replaceAll("_", " ");
  if (language === "en") {
    return {
      subject: "Action required: set up two-factor authentication – HTW Berlin",
      text: `Dear ${safeName},\n\nTwo-factor authentication is mandatory for your ${roleLabel} role and the 30-day setup period has expired. Please sign in and set up two-factor authentication immediately: ${setupUrl}\n\nIf you need assistance, please contact the administration of HTW Berlin.`,
      html: `<p>Dear ${safeName},</p><p>Two-factor authentication is mandatory for your <strong>${roleLabel}</strong> role and the 30-day setup period has expired.</p><p><a href="${setupUrl}">Sign in and set up two-factor authentication now</a></p><p>If you need assistance, please contact the administration of HTW Berlin.</p>`,
    };
  }
  return {
    subject: "Handlungsbedarf: Zwei-Faktor-Authentifizierung einrichten – HTW Berlin",
    text: `Guten Tag ${safeName},\n\nfür Ihre Rolle ${roleLabel} ist die Zwei-Faktor-Authentifizierung verpflichtend. Die 30-tägige Einrichtungsfrist ist abgelaufen. Bitte melden Sie sich an und richten Sie die Zwei-Faktor-Authentifizierung unverzüglich ein: ${setupUrl}\n\nBei Fragen wenden Sie sich bitte an die Verwaltung der HTW Berlin.`,
    html: `<p>Guten Tag ${safeName},</p><p>für Ihre Rolle <strong>${roleLabel}</strong> ist die Zwei-Faktor-Authentifizierung verpflichtend. Die 30-tägige Einrichtungsfrist ist abgelaufen.</p><p><a href="${setupUrl}">Jetzt anmelden und Zwei-Faktor-Authentifizierung einrichten</a></p><p>Bei Fragen wenden Sie sich bitte an die Verwaltung der HTW Berlin.</p>`,
  };
}

export async function processOverdueTwoFactorReminders(taskUid: string) {
  const [taskSetting, requirementSetting] = await Promise.all([
    getSystemSetting(TWO_FACTOR_REMINDER_TASK_KEY),
    getSystemSetting(TWO_FACTOR_REQUIREMENT_KEY),
  ]);
  if (!taskSetting || taskSetting.value !== taskUid) return { ok: true, skipped: "orphan" as const };
  if (!requirementSetting || !isTwoFactorRequirementOverdue(requirementSetting.updatedAt)) {
    return { ok: true, skipped: "not_due" as const };
  }

  const requiredRoles = parseRequiredTwoFactorRoles(requirementSetting.value);
  const recipients = await getUsersMissingRequiredTwoFactor(requiredRoles);
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");

  let sent = 0;
  let skipped = 0;
  const requirementUpdatedAt = requirementSetting.updatedAt!;
  for (const recipient of recipients) {
    if (!recipient.email) { skipped++; continue; }
    const alreadySent = await db.select({ id: twoFactorReminderEmails.id })
      .from(twoFactorReminderEmails)
      .where(and(eq(twoFactorReminderEmails.userId, recipient.id), eq(twoFactorReminderEmails.requirementUpdatedAt, requirementUpdatedAt)))
      .limit(1);
    if (alreadySent.length > 0) { skipped++; continue; }

    try {
      // Der eindeutige Index dient als atomare Reservierung und verhindert Doppelversand bei parallelen Cron-Läufen.
      await db.insert(twoFactorReminderEmails).values({ userId: recipient.id, requirementUpdatedAt });
    } catch {
      skipped++;
      continue;
    }

    const language = recipient.preferredLanguage === "en" ? "en" : "de";
    const message = buildReminderEmail(language, recipient.name, recipient.role ?? "user");
    const delivered = await sendEmail({ to: recipient.email, ...message });
    if (delivered) {
      sent++;
    } else {
      await db.delete(twoFactorReminderEmails)
        .where(and(eq(twoFactorReminderEmails.userId, recipient.id), eq(twoFactorReminderEmails.requirementUpdatedAt, requirementUpdatedAt)));
    }
  }
  return { ok: true, sent, skipped };
}
