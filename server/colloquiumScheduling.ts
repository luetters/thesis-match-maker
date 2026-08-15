import { and, eq, inArray } from "drizzle-orm";
import {
  colloquiumSchedulingParticipants,
  colloquiumSchedulingPolls,
  colloquiumSchedulingResponses,
  colloquiumSchedulingSlots,
  colloquiums,
  thesisRequests,
  users,
} from "../drizzle/schema";
import { createNotification, getDb, isNotificationEnabled } from "./db";
import { sendEmail } from "./emailHelper";

const PORTAL_URL = process.env.SITE_URL ?? "https://thesis.htw-berlin.com";
const ACTIVE_POLL_STATUSES = ["DRAFT", "OPEN", "MATCH_FOUND", "AWAITING_CONFIRMATION"] as const;
type ParticipantRole = "student" | "first_examiner" | "second_examiner";
type Availability = "YES" | "MAYBE" | "NO";
const EXISTING_COLLOQUIUM_DURATION_MS = 60 * 60 * 1000;

function toDbDate(value: Date | number): string {
  const date = typeof value === "number" ? new Date(value) : value;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function fromDbDate(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}

function participantDashboardPath(role: ParticipantRole): string {
  return role === "student" ? "/student/scheduling" : "/examiner/scheduling";
}

function schedulingEmail(opts: {
  kind: "invitation" | "reminder" | "confirmation" | "confirmed" | "expired";
  recipientName: string;
  recipientRole: ParticipantRole;
  lang?: "de" | "en";
  thesisTitle: string;
  deadline?: string;
  selectedSlot?: string;
  locationLabel?: string;
}): { subject: string; html: string; text: string } {
  const lang = opts.lang === "en" ? "en" : "de";
  const dashboardUrl = `${PORTAL_URL}${participantDashboardPath(opts.recipientRole)}`;
  const greeting = lang === "en" ? `Dear ${escapeHtml(opts.recipientName)},` : `Sehr geehrte:r ${escapeHtml(opts.recipientName)},`;
  const dateLocale = lang === "en" ? "en-GB" : "de-DE";
  const deadline = opts.deadline
    ? lang === "en"
      ? `The poll remains open until <strong>${escapeHtml(new Date(opts.deadline).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" }))}</strong>.`
      : `Die Abstimmung läuft bis <strong>${escapeHtml(new Date(opts.deadline).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" }))}</strong>.`
    : "";
  const slot = opts.selectedSlot ? (lang === "en" ? `Proposed date: <strong>${escapeHtml(opts.selectedSlot)}</strong>.` : `Vorgeschlagener Termin: <strong>${escapeHtml(opts.selectedSlot)}</strong>.`) : "";
  const location = opts.locationLabel ? (lang === "en" ? `Location / online participation: <strong>${escapeHtml(opts.locationLabel)}</strong>.` : `Ort / Online-Teilnahme: <strong>${escapeHtml(opts.locationLabel)}</strong>.`) : "";
  const content = {
    de: {
    invitation: {
      subject: "HTW Berlin – Bitte stimmen Sie einen Kolloquiumstermin ab",
      headline: "Kolloquiumstermin abstimmen",
      message: "Für die Abschlussarbeit wurde eine gemeinsame Terminabstimmung eröffnet. Bitte geben Sie Ihre Verfügbarkeit für die vorgeschlagenen Zeitfenster an.",
      cta: "Zur Terminabstimmung",
    },
    reminder: {
      subject: "HTW Berlin – Erinnerung: Bitte stimmen Sie den Kolloquiumstermin ab",
      headline: "Erinnerung zur Terminabstimmung",
      message: "Ihre Verfügbarkeit für die Terminabstimmung steht noch aus. Bitte antworten Sie, damit ein verbindlicher Kolloquiumstermin gefunden werden kann.",
      cta: "Jetzt Verfügbarkeit angeben",
    },
    confirmation: {
      subject: "HTW Berlin – Bitte bestätigen Sie den Kolloquiumstermin",
      headline: "Termin zur Schlussbestätigung",
      message: "Alle Beteiligten sind für einen Termin verfügbar. Bitte bestätigen Sie den vorgeschlagenen Termin verbindlich.",
      cta: "Termin bestätigen",
    },
    confirmed: {
      subject: "HTW Berlin – Kolloquiumstermin verbindlich bestätigt",
      headline: "Kolloquium verbindlich bestätigt",
      message: "Alle drei Beteiligten haben den Termin bestätigt. Das Kolloquium wurde verbindlich im System eingetragen.",
      cta: "Termin anzeigen",
    },
    expired: {
      subject: "HTW Berlin – Frist der Kolloquiums-Terminabstimmung abgelaufen",
      headline: "Terminabstimmung abgelaufen",
      message: "Die Frist für die Terminabstimmung ist abgelaufen. Die Erstprüferin oder der Erstprüfer kann eine neue Abstimmungsrunde eröffnen.",
      cta: "Abstimmung anzeigen",
    },
    },
    en: {
      invitation: { subject: "HTW Berlin – Please coordinate a colloquium date", headline: "Coordinate a colloquium date", message: "A joint scheduling poll has been opened for this thesis. Please share your availability for the proposed time slots.", cta: "Open scheduling poll" },
      reminder: { subject: "HTW Berlin – Reminder: Please coordinate the colloquium date", headline: "Scheduling reminder", message: "Your availability for the scheduling poll is still outstanding. Please respond so that a binding colloquium date can be found.", cta: "Provide availability" },
      confirmation: { subject: "HTW Berlin – Please confirm the colloquium date", headline: "Final date confirmation", message: "All participants are available for a date. Please confirm the proposed date as binding.", cta: "Confirm date" },
      confirmed: { subject: "HTW Berlin – Colloquium date confirmed", headline: "Colloquium confirmed", message: "All three participants have confirmed the date. The colloquium has been entered in the system as binding.", cta: "View date" },
      expired: { subject: "HTW Berlin – Colloquium scheduling deadline has expired", headline: "Scheduling poll expired", message: "The deadline for the scheduling poll has expired. The first examiner can start a new scheduling round.", cta: "View poll" },
    },
  }[lang][opts.kind];
  const thesis = escapeHtml(opts.thesisTitle);
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;line-height:1.55">
      <h2 style="color:#006937">${content.headline}</h2>
      <p>${greeting}</p>
      <p>${content.message}</p>
      <div style="background:#f0f7e6;border-left:4px solid #76B900;padding:14px 16px;margin:18px 0;border-radius:0 8px 8px 0">
        <strong>${lang === "en" ? "Thesis" : "Abschlussarbeit"}</strong><br>${thesis}
      </div>
      ${deadline ? `<p>${deadline}</p>` : ""}
      ${slot ? `<p>${slot}</p>` : ""}
      ${location ? `<p>${location}</p>` : ""}
      <p style="margin:24px 0"><a href="${dashboardUrl}" style="display:inline-block;background:#76B900;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${content.cta}</a></p>
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="font-size:12px;color:#6b7280">HTW Berlin – Thesis Match Maker</p>
    </div>`;
  const text = `${content.headline}\n\n${content.message}\n\n${lang === "en" ? "Thesis" : "Abschlussarbeit"}: ${opts.thesisTitle}${opts.deadline ? `\n${lang === "en" ? "Deadline" : "Frist"}: ${opts.deadline}` : ""}${opts.selectedSlot ? `\n${lang === "en" ? "Date" : "Termin"}: ${opts.selectedSlot}` : ""}${opts.locationLabel ? `\n${lang === "en" ? "Location / online participation" : "Ort / Online-Teilnahme"}: ${opts.locationLabel}` : ""}\n\n${dashboardUrl}`;
  return { subject: content.subject, html, text };
}

async function notifyAndEmailParticipant(opts: {
  user: { id: number; name: string | null; email: string | null; preferredLanguage?: string | null };
  role: ParticipantRole;
  thesisRequestId: number;
  thesisTitle: string;
  kind: "invitation" | "reminder" | "confirmation" | "confirmed" | "expired";
  notificationTitle: string;
  notificationMessage: string;
  deadline?: string;
  selectedSlot?: string;
  locationLabel?: string;
}) {
  const lang = opts.user.preferredLanguage === "en" ? "en" : "de";
  const notification = schedulingEmail({
    kind: opts.kind,
    recipientName: opts.user.name ?? (lang === "en" ? "User" : "Nutzende:r"),
    recipientRole: opts.role,
    lang,
    thesisTitle: opts.thesisTitle,
    deadline: opts.deadline,
    selectedSlot: opts.selectedSlot,
    locationLabel: opts.locationLabel,
  });
  await createNotification({
    userId: opts.user.id,
    title: notification.subject.replace("HTW Berlin – ", ""),
    message: notification.text.split("\n\n")[1] ?? notification.text,
    type: "info" as any,
    thesisRequestId: opts.thesisRequestId,
  });
  if (!opts.user.email) return;
  if (!(await isNotificationEnabled(opts.user.id, "colloquium_scheduling"))) return;
  await sendEmail({ to: opts.user.email, subject: notification.subject, html: notification.html, text: notification.text });
}

async function getPollContext(pollId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const poll = (await db.select().from(colloquiumSchedulingPolls).where(eq(colloquiumSchedulingPolls.id, pollId)).limit(1))[0];
  if (!poll) throw new Error("Terminabstimmung nicht gefunden");
  const thesis = (await db.select().from(thesisRequests).where(eq(thesisRequests.id, poll.thesisRequestId)).limit(1))[0];
  if (!thesis) throw new Error("Abschlussarbeit nicht gefunden");
  const participants = await db.select().from(colloquiumSchedulingParticipants).where(eq(colloquiumSchedulingParticipants.pollId, pollId));
  const slots = await db.select().from(colloquiumSchedulingSlots).where(eq(colloquiumSchedulingSlots.pollId, pollId));
  const responses = slots.length
    ? await db.select().from(colloquiumSchedulingResponses).where(inArray(colloquiumSchedulingResponses.slotId, slots.map((slot) => slot.id)))
    : [];
  const participantUsers = participants.length
    ? await db.select().from(users).where(inArray(users.id, participants.map((participant) => participant.userId)))
    : [];
  const usersById = new Map(participantUsers.map((user) => [user.id, user]));
  return { db, poll, thesis, participants, slots, responses, usersById };
}

function assertParticipant(thesis: typeof thesisRequests.$inferSelect, userId: number, role: string) {
  const isParticipant = thesis.studentId === userId || thesis.examinerId === userId || thesis.secondExaminerId === userId;
  const isAdmin = ["admin", "superadmin", "pav"].includes(role);
  if (!isParticipant && !isAdmin) throw new Error("Sie sind nicht an dieser Terminabstimmung beteiligt");
}

export function derivePollStatus(slots: Array<{ id: number }>, responses: Array<{ slotId: number; availability: string }>, participantCount: number): "OPEN" | "MATCH_FOUND" {
  const hasMatch = slots.some((slot) => responses.filter((response) => response.slotId === slot.id && response.availability === "YES").length === participantCount);
  return hasMatch ? "MATCH_FOUND" : "OPEN";
}

export function hasThreeWayConfirmation(participants: Array<{ confirmedAt: string | null }>): boolean {
  return participants.length === 3 && participants.every((participant) => Boolean(participant.confirmedAt));
}

/** Vergleichbar machen, ohne die Bezeichnung des belegten Kolloquiums offenzulegen. */
export function normalizeRoomValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
}

export function timeRangesOverlap(startsAt: number, endsAt: number, otherStartsAt: number, otherEndsAt: number): boolean {
  return startsAt < otherEndsAt && endsAt > otherStartsAt;
}

export function roomLabelsConflict(candidate: { room?: string | null; location?: string | null }, existing: { room?: string | null; location?: string | null }): boolean {
  if (!normalizeRoomValue(candidate.room) || normalizeRoomValue(candidate.room) !== normalizeRoomValue(existing.room)) return false;
  // Wenn eine der beiden Ortsangaben fehlt, behandeln wir den identischen Raum
  // vorsorglich als Konflikt. Andernfalls muss auch der Campus/Ort übereinstimmen.
  const candidateLocation = normalizeRoomValue(candidate.location);
  const existingLocation = normalizeRoomValue(existing.location);
  return !candidateLocation || !existingLocation || candidateLocation === existingLocation;
}

export type RoomConflict = { scheduledAt: string; endsAt: string; room: string; location: string | null };

export async function findColloquiumRoomConflicts(input: {
  room?: string | null;
  location?: string | null;
  slots: Array<{ startsAt: number | string; endsAt: number | string }>;
  db?: any;
}): Promise<RoomConflict[]> {
  if (!normalizeRoomValue(input.room)) return [];
  const db = input.db ?? await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const scheduled = await db.select({
    scheduledAt: colloquiums.scheduledAt,
    room: colloquiums.room,
    location: colloquiums.location,
  }).from(colloquiums).where(eq(colloquiums.status, "SCHEDULED"));
  const conflicts = new Map<string, RoomConflict>();
  for (const existing of scheduled) {
    if (!roomLabelsConflict(input, existing)) continue;
    const existingStartsAt = fromDbDate(existing.scheduledAt).getTime();
    const existingEndsAt = existingStartsAt + EXISTING_COLLOQUIUM_DURATION_MS;
    for (const candidate of input.slots) {
      const candidateStartsAt = typeof candidate.startsAt === "number" ? candidate.startsAt : fromDbDate(candidate.startsAt).getTime();
      const candidateEndsAt = typeof candidate.endsAt === "number" ? candidate.endsAt : fromDbDate(candidate.endsAt).getTime();
      if (!timeRangesOverlap(candidateStartsAt, candidateEndsAt, existingStartsAt, existingEndsAt)) continue;
      const key = `${existing.scheduledAt}:${existing.room ?? ""}:${existing.location ?? ""}`;
      conflicts.set(key, {
        scheduledAt: existing.scheduledAt,
        endsAt: toDbDate(existingEndsAt),
        room: existing.room ?? input.room ?? "",
        location: existing.location ?? null,
      });
    }
  }
  return Array.from(conflicts.values()).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

function describeRoomConflict(conflicts: RoomConflict[]): string {
  const first = conflicts[0];
  const date = fromDbDate(first.scheduledAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
  return `Der Raum „${first.room}“${first.location ? ` am Ort „${first.location}“` : ""} ist am ${date} bereits belegt. Bitte wählen Sie einen anderen Raum oder ein anderes Zeitfenster.`;
}

export async function createColloquiumSchedulingPoll(input: {
  thesisRequestId: number;
  createdById: number;
  responseDeadline: number;
  durationMinutes: number;
  location?: string | null;
  room?: string | null;
  onlineLink?: string | null;
  slots: Array<{ startsAt: number; endsAt: number }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const thesis = (await db.select().from(thesisRequests).where(eq(thesisRequests.id, input.thesisRequestId)).limit(1))[0];
  if (!thesis) throw new Error("Abschlussarbeit nicht gefunden");
  if (thesis.examinerId !== input.createdById) throw new Error("Nur die Erstprüferin oder der Erstprüfer kann die Terminabstimmung starten");
  if (!thesis.secondExaminerId) throw new Error("Eine Zweitprüferin oder ein Zweitprüfer muss vor der Terminabstimmung zugeordnet sein");
  if (thesis.defenseEligibility !== "approved") throw new Error("Die Abschlussarbeit ist noch nicht für das Kolloquium zugelassen");
  if (input.slots.length < 3 || input.slots.length > 10) throw new Error("Bitte geben Sie zwischen drei und zehn Terminoptionen an");
  if (input.durationMinutes < 30 || input.durationMinutes > 180) throw new Error("Die Termindauer muss zwischen 30 und 180 Minuten liegen");
  if (input.responseDeadline <= Date.now()) throw new Error("Die Abstimmungsfrist muss in der Zukunft liegen");
  if (!input.room && !input.onlineLink) throw new Error("Bitte geben Sie mindestens einen Raum oder einen Online-Link an");
  const roomConflicts = await findColloquiumRoomConflicts({ room: input.room, location: input.location, slots: input.slots, db });
  if (roomConflicts.length) throw new Error(describeRoomConflict(roomConflicts));
  const existing = await db.select().from(colloquiumSchedulingPolls)
    .where(and(eq(colloquiumSchedulingPolls.thesisRequestId, input.thesisRequestId), inArray(colloquiumSchedulingPolls.status, [...ACTIVE_POLL_STATUSES] as any)));
  if (existing.length) throw new Error("Für diese Abschlussarbeit läuft bereits eine Terminabstimmung");
  const [result] = await db.insert(colloquiumSchedulingPolls).values({
    thesisRequestId: input.thesisRequestId,
    createdById: input.createdById,
    status: "OPEN",
    responseDeadline: toDbDate(input.responseDeadline),
    durationMinutes: input.durationMinutes,
    location: input.location ?? null,
    room: input.room ?? null,
    onlineLink: input.onlineLink ?? null,
  });
  const pollId = Number((result as any).insertId);
  await db.insert(colloquiumSchedulingParticipants).values([
    { pollId, userId: thesis.studentId, participantRole: "student" },
    { pollId, userId: thesis.examinerId, participantRole: "first_examiner" },
    { pollId, userId: thesis.secondExaminerId, participantRole: "second_examiner" },
  ]);
  await db.insert(colloquiumSchedulingSlots).values(input.slots.map((slot) => ({
    pollId,
    startsAt: toDbDate(slot.startsAt),
    endsAt: toDbDate(slot.endsAt),
    createdById: input.createdById,
  })));
  const context = await getPollContext(pollId);
  for (const participant of context.participants) {
    if (participant.userId === input.createdById) continue;
    const user = context.usersById.get(participant.userId);
    if (!user) continue;
    await notifyAndEmailParticipant({
      user,
      role: participant.participantRole as ParticipantRole,
      thesisRequestId: input.thesisRequestId,
      thesisTitle: thesis.title,
      kind: "invitation",
      notificationTitle: "Kolloquiumstermin abstimmen",
      notificationMessage: "Bitte geben Sie Ihre Verfügbarkeit für die vorgeschlagenen Terminoptionen an.",
      deadline: context.poll.responseDeadline,
    });
  }
  return { pollId, thesis };
}

export async function setPollReminderTaskUid(pollId: number, taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  await db.update(colloquiumSchedulingPolls).set({ scheduleCronTaskUid: taskUid }).where(eq(colloquiumSchedulingPolls.id, pollId));
}

export async function cancelColloquiumSchedulingPoll(pollId: number, actorId: number, actorRole: string, reason?: string) {
  const { db, poll, thesis } = await getPollContext(pollId);
  assertParticipant(thesis, actorId, actorRole);
  if (thesis.examinerId !== actorId && !["admin", "superadmin", "pav"].includes(actorRole)) throw new Error("Nur die Erstprüferin oder der Erstprüfer kann die Abstimmung absagen");
  if (["CONFIRMED", "CANCELLED"].includes(poll.status)) throw new Error("Diese Terminabstimmung kann nicht mehr abgesagt werden");
  await db.update(colloquiumSchedulingPolls).set({ status: "CANCELLED", cancellationReason: reason ?? null }).where(eq(colloquiumSchedulingPolls.id, pollId));
}

export async function getColloquiumSchedulingPollForUser(pollId: number, userId: number, role: string) {
  const context = await getPollContext(pollId);
  assertParticipant(context.thesis, userId, role);
  return {
    poll: context.poll,
    thesis: { id: context.thesis.id, title: context.thesis.title, studentId: context.thesis.studentId, examinerId: context.thesis.examinerId, secondExaminerId: context.thesis.secondExaminerId },
    participants: context.participants.map((participant) => ({
      ...participant,
      user: context.usersById.get(participant.userId) ? {
        id: participant.userId,
        name: context.usersById.get(participant.userId)?.name ?? "Unbekannt",
        email: context.usersById.get(participant.userId)?.email ?? null,
      } : null,
    })),
    slots: context.slots.map((slot) => ({
      ...slot,
      responses: context.responses.filter((response) => response.slotId === slot.id).map((response) => ({
        participantId: response.participantId,
        availability: response.availability,
      })),
    })),
  };
}

export async function getMyColloquiumSchedulingPolls(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const participations = await db.select().from(colloquiumSchedulingParticipants).where(eq(colloquiumSchedulingParticipants.userId, userId));
  if (!participations.length) return [];
  const polls = await db.select().from(colloquiumSchedulingPolls).where(inArray(colloquiumSchedulingPolls.id, participations.map((participant) => participant.pollId)));
  const thesisRows = await db.select({ id: thesisRequests.id, title: thesisRequests.title }).from(thesisRequests).where(inArray(thesisRequests.id, polls.map((poll) => poll.thesisRequestId)));
  const thesisById = new Map(thesisRows.map((thesis) => [thesis.id, thesis]));
  return polls.map((poll) => ({ ...poll, thesisTitle: thesisById.get(poll.thesisRequestId)?.title ?? "Abschlussarbeit", myRole: participations.find((participant) => participant.pollId === poll.id)?.participantRole ?? null }));
}

export async function submitColloquiumSchedulingAvailability(input: { pollId: number; userId: number; role: string; responses: Array<{ slotId: number; availability: Availability }> }) {
  const { db, poll, thesis, participants, slots, responses } = await getPollContext(input.pollId);
  assertParticipant(thesis, input.userId, input.role);
  if (!["OPEN", "MATCH_FOUND"].includes(poll.status)) throw new Error("Die Abstimmung nimmt aktuell keine Verfügbarkeiten entgegen");
  if (fromDbDate(poll.responseDeadline).getTime() < Date.now()) throw new Error("Die Abstimmungsfrist ist bereits abgelaufen");
  const participant = participants.find((item) => item.userId === input.userId);
  if (!participant) throw new Error("Sie sind nicht als teilnehmende Person hinterlegt");
  if (input.responses.length !== slots.length) throw new Error("Bitte bewerten Sie jede Terminoption");
  const slotIds = new Set(slots.map((slot) => slot.id));
  if (input.responses.some((response) => !slotIds.has(response.slotId))) throw new Error("Ungültige Terminoption");
  for (const response of input.responses) {
    await db.insert(colloquiumSchedulingResponses).values({ slotId: response.slotId, participantId: participant.id, availability: response.availability })
      .onDuplicateKeyUpdate({ set: { availability: response.availability } });
  }
  await db.update(colloquiumSchedulingParticipants).set({ lastRespondedAt: toDbDate(new Date()) }).where(eq(colloquiumSchedulingParticipants.id, participant.id));
  const refreshed = await db.select().from(colloquiumSchedulingResponses).where(inArray(colloquiumSchedulingResponses.slotId, slots.map((slot) => slot.id)));
  const nextStatus = derivePollStatus(slots, refreshed, participants.length);
  await db.update(colloquiumSchedulingPolls).set({ status: nextStatus }).where(eq(colloquiumSchedulingPolls.id, input.pollId));
  return { status: nextStatus, hasMatch: nextStatus === "MATCH_FOUND" };
}

export async function selectColloquiumSchedulingSlot(input: { pollId: number; slotId: number; userId: number; role: string }) {
  const { db, poll, thesis, participants, slots, responses, usersById } = await getPollContext(input.pollId);
  if (thesis.examinerId !== input.userId && !["admin", "superadmin", "pav"].includes(input.role)) throw new Error("Nur die Erstprüferin oder der Erstprüfer kann einen Termin vorschlagen");
  if (!["OPEN", "MATCH_FOUND"].includes(poll.status)) throw new Error("In diesem Status kann kein Termin vorgeschlagen werden");
  const slot = slots.find((item) => item.id === input.slotId);
  if (!slot) throw new Error("Terminoption nicht gefunden");
  const allAvailable = responses.filter((response) => response.slotId === slot.id && response.availability === "YES").length === participants.length;
  if (!allAvailable) throw new Error("Der ausgewählte Termin ist nicht für alle drei Personen verfügbar");
  await db.update(colloquiumSchedulingSlots).set({ isSelected: 0 }).where(eq(colloquiumSchedulingSlots.pollId, input.pollId));
  await db.update(colloquiumSchedulingSlots).set({ isSelected: 1 }).where(eq(colloquiumSchedulingSlots.id, input.slotId));
  await db.update(colloquiumSchedulingParticipants).set({ confirmedAt: null, declinedAt: null, declineReason: null }).where(eq(colloquiumSchedulingParticipants.pollId, input.pollId));
  await db.update(colloquiumSchedulingPolls).set({ status: "AWAITING_CONFIRMATION", selectedSlotId: input.slotId }).where(eq(colloquiumSchedulingPolls.id, input.pollId));
  const selectedSlot = fromDbDate(slot.startsAt).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" });
  const locationLabel = [poll.location, poll.room, poll.onlineLink].filter(Boolean).join(" · ");
  for (const participant of participants) {
    const user = usersById.get(participant.userId);
    if (!user) continue;
    await notifyAndEmailParticipant({
      user,
      role: participant.participantRole as ParticipantRole,
      thesisRequestId: thesis.id,
      thesisTitle: thesis.title,
      kind: "confirmation",
      notificationTitle: "Kolloquiumstermin bestätigen",
      notificationMessage: "Bitte bestätigen Sie den gemeinsamen Terminvorschlag verbindlich.",
      selectedSlot,
      locationLabel,
    });
  }
}

export async function confirmColloquiumSchedulingSlot(input: { pollId: number; userId: number; role: string; confirmed: boolean; reason?: string }) {
  const context = await getPollContext(input.pollId);
  const { db, poll, thesis, participants, slots, usersById } = context;
  assertParticipant(thesis, input.userId, input.role);
  if (poll.status !== "AWAITING_CONFIRMATION" || !poll.selectedSlotId) throw new Error("Es liegt kein Terminvorschlag zur Bestätigung vor");
  const participant = participants.find((item) => item.userId === input.userId);
  if (!participant) throw new Error("Sie sind nicht als teilnehmende Person hinterlegt");
  const now = toDbDate(new Date());
  if (!input.confirmed) {
    await db.update(colloquiumSchedulingParticipants).set({ declinedAt: now, declineReason: input.reason ?? null, confirmedAt: null }).where(eq(colloquiumSchedulingParticipants.id, participant.id));
    await db.update(colloquiumSchedulingSlots).set({ isSelected: 0 }).where(eq(colloquiumSchedulingSlots.pollId, poll.id));
    await db.update(colloquiumSchedulingPolls).set({ status: "OPEN", selectedSlotId: null }).where(eq(colloquiumSchedulingPolls.id, poll.id));
    return { finalized: false, status: "OPEN" as const };
  }
  const isLastRequiredConfirmation = participants
    .filter((item) => item.id !== participant.id)
    .every((item) => Boolean(item.confirmedAt));
  if (isLastRequiredConfirmation) {
    const selectedSlotBeforeConfirmation = slots.find((slot) => slot.id === poll.selectedSlotId);
    if (!selectedSlotBeforeConfirmation) throw new Error("Ausgewählte Terminoption nicht gefunden");
    const roomConflicts = await findColloquiumRoomConflicts({
      room: poll.room,
      location: poll.location,
      slots: [{ startsAt: selectedSlotBeforeConfirmation.startsAt, endsAt: selectedSlotBeforeConfirmation.endsAt }],
      db,
    });
    if (roomConflicts.length) throw new Error(describeRoomConflict(roomConflicts));
  }
  await db.update(colloquiumSchedulingParticipants).set({ confirmedAt: now, declinedAt: null, declineReason: null }).where(eq(colloquiumSchedulingParticipants.id, participant.id));
  const updatedParticipants = await db.select().from(colloquiumSchedulingParticipants).where(eq(colloquiumSchedulingParticipants.pollId, poll.id));
  if (!hasThreeWayConfirmation(updatedParticipants)) return { finalized: false, status: "AWAITING_CONFIRMATION" as const };
  const selectedSlot = slots.find((slot) => slot.id === poll.selectedSlotId);
  if (!selectedSlot) throw new Error("Ausgewählte Terminoption nicht gefunden");
  const [created] = await db.transaction(async (tx) => {
    const roomConflicts = await findColloquiumRoomConflicts({
      room: poll.room,
      location: poll.location,
      slots: [{ startsAt: selectedSlot.startsAt, endsAt: selectedSlot.endsAt }],
      db: tx,
    });
    if (roomConflicts.length) throw new Error(describeRoomConflict(roomConflicts));
    const result = await tx.insert(colloquiums).values({
      thesisRequestId: thesis.id,
      title: `Kolloquium: ${thesis.title}`,
      scheduledAt: selectedSlot.startsAt,
      location: poll.location,
      room: poll.room,
      onlineLink: poll.onlineLink,
      notes: "Termin durch gemeinsame Abstimmung bestätigt.",
      createdById: poll.createdById,
    });
    await tx.update(thesisRequests).set({ defenseDate: selectedSlot.startsAt, defenseDateSetAt: now, defenseDateSetBy: poll.createdById }).where(eq(thesisRequests.id, thesis.id));
    await tx.update(colloquiumSchedulingPolls).set({ status: "CONFIRMED", finalizedAt: now }).where(eq(colloquiumSchedulingPolls.id, poll.id));
    return [result] as const;
  });
  const selectedSlotLabel = fromDbDate(selectedSlot.startsAt).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" });
  const locationLabel = [poll.location, poll.room, poll.onlineLink].filter(Boolean).join(" · ");
  for (const item of updatedParticipants) {
    const user = usersById.get(item.userId);
    if (!user) continue;
    await notifyAndEmailParticipant({
      user,
      role: item.participantRole as ParticipantRole,
      thesisRequestId: thesis.id,
      thesisTitle: thesis.title,
      kind: "confirmed",
      notificationTitle: "Kolloquiumstermin verbindlich bestätigt",
      notificationMessage: `Das Kolloquium wurde für ${selectedSlotLabel} verbindlich eingetragen.`,
      selectedSlot: selectedSlotLabel,
      locationLabel,
    });
  }
  return { finalized: true, status: "CONFIRMED" as const, colloquiumId: Number((created as any).insertId) };
}

export async function processColloquiumSchedulingReminders(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar");
  const poll = (await db.select().from(colloquiumSchedulingPolls).where(eq(colloquiumSchedulingPolls.scheduleCronTaskUid, taskUid)).limit(1))[0];
  if (!poll) return { ok: true, skipped: "orphan" as const };
  if (!["OPEN", "MATCH_FOUND"].includes(poll.status)) return { ok: true, skipped: "inactive" as const };
  const context = await getPollContext(poll.id);
  const now = new Date();
  const deadline = fromDbDate(poll.responseDeadline);
  if (now.getTime() >= deadline.getTime()) {
    await db.update(colloquiumSchedulingPolls).set({ status: "EXPIRED" }).where(eq(colloquiumSchedulingPolls.id, poll.id));
    for (const participant of context.participants) {
      const user = context.usersById.get(participant.userId);
      if (!user) continue;
      await notifyAndEmailParticipant({ user, role: participant.participantRole as ParticipantRole, thesisRequestId: context.thesis.id, thesisTitle: context.thesis.title, kind: "expired", notificationTitle: "Kolloquiums-Terminabstimmung abgelaufen", notificationMessage: "Die Abstimmungsfrist ist abgelaufen. Die Erstprüferin oder der Erstprüfer kann eine neue Runde starten." });
    }
    return { ok: true, expired: true };
  }
  const hoursToDeadline = (deadline.getTime() - now.getTime()) / (60 * 60 * 1000);
  const missing = context.participants.filter((participant) => !participant.lastRespondedAt);
  let sent = 0;
  for (const participant of missing) {
    const shouldSendOneDay = hoursToDeadline <= 24 && !participant.reminderOneDaySentAt;
    const shouldSendThreeDays = hoursToDeadline <= 72 && !participant.reminderThreeDaysSentAt && !shouldSendOneDay;
    if (!shouldSendOneDay && !shouldSendThreeDays) continue;
    const user = context.usersById.get(participant.userId);
    if (!user) continue;
    await notifyAndEmailParticipant({
      user,
      role: participant.participantRole as ParticipantRole,
      thesisRequestId: context.thesis.id,
      thesisTitle: context.thesis.title,
      kind: "reminder",
      notificationTitle: "Erinnerung: Kolloquiumstermin abstimmen",
      notificationMessage: "Bitte geben Sie Ihre Verfügbarkeit vor Ablauf der Abstimmungsfrist an.",
      deadline: poll.responseDeadline,
    });
    await db.update(colloquiumSchedulingParticipants).set(shouldSendOneDay ? { reminderOneDaySentAt: toDbDate(now) } : { reminderThreeDaysSentAt: toDbDate(now) }).where(eq(colloquiumSchedulingParticipants.id, participant.id));
    sent++;
  }
  return { ok: true, sent };
}
