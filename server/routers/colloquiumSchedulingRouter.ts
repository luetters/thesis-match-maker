import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createHeartbeatJob } from "../_core/heartbeat";
import { createAuditLogEntry } from "../db";
import { cancelColloquiumSchedulingPoll, confirmColloquiumSchedulingSlot, createColloquiumSchedulingPoll, findColloquiumRoomConflicts, getColloquiumSchedulingPollForUser, getMyColloquiumSchedulingPolls, selectColloquiumSchedulingSlot, setPollReminderTaskUid, submitColloquiumSchedulingAvailability } from "../colloquiumScheduling";

const schedulingExaminerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.user.role;
  if (!["examiner", "second_examiner", "programme_director", "admin", "superadmin"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nur Prüfer:innen haben Zugriff." });
  }
  return next({ ctx });
});

const pollIdInput = z.object({ pollId: z.number().int().positive() });

/** API für die dreiseitige Terminabstimmung von Kolloquien. */
export const colloquiumSchedulingRouter = router({
  myPolls: protectedProcedure.query(({ ctx }) => getMyColloquiumSchedulingPolls(ctx.user.id)),
  byId: protectedProcedure.input(pollIdInput).query(async ({ ctx, input }) => {
    try { return await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role); }
    catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Zugriff nicht erlaubt" }); }
  }),
  roomConflicts: schedulingExaminerProcedure.input(z.object({ room: z.string().trim().max(256).optional(), location: z.string().trim().max(512).optional(), slots: z.array(z.object({ startsAt: z.number().int().positive(), endsAt: z.number().int().positive() })).max(10) })).query(({ input }) => findColloquiumRoomConflicts(input)),
  create: schedulingExaminerProcedure.input(z.object({ thesisRequestId: z.number().int().positive(), responseDeadline: z.number().int().positive(), durationMinutes: z.number().int().min(30).max(180), location: z.string().trim().max(512).optional(), room: z.string().trim().max(256).optional(), onlineLink: z.union([z.string().trim().url().max(1024), z.literal("")]).optional(), slots: z.array(z.object({ startsAt: z.number().int().positive(), endsAt: z.number().int().positive() }).refine((slot) => slot.endsAt > slot.startsAt, { message: "Das Zeitfenster muss nach dem Start enden." })).min(3).max(10) })).mutation(async ({ ctx, input }) => {
    try {
      const { pollId } = await createColloquiumSchedulingPoll({ ...input, createdById: ctx.user.id, onlineLink: input.onlineLink || null });
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob({ name: `colloquium-scheduling-poll-${pollId}`, cron: "0 0 8 * * *", path: "/api/scheduled/colloquium-scheduling-reminders", payload: {}, description: `Automatische E-Mail-Erinnerungen für Kolloquiums-Terminabstimmung ${pollId}` }, sessionToken);
      await setPollReminderTaskUid(pollId, job.taskUid);
      await createAuditLogEntry({ thesisRequestId: input.thesisRequestId, actorId: ctx.user.id, actorRole: ctx.user.role, action: "COLLOQUIUM_SCHEDULING_OPENED", metadata: { pollId, responseDeadline: input.responseDeadline, slotCount: input.slots.length, hasOnlineLink: Boolean(input.onlineLink), room: input.room ?? null } });
      return { pollId, nextReminderRun: job.nextExecutionAt ?? null };
    } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Terminabstimmung konnte nicht gestartet werden" }); }
  }),
  respond: protectedProcedure.input(z.object({ pollId: z.number().int().positive(), responses: z.array(z.object({ slotId: z.number().int().positive(), availability: z.enum(["YES", "MAYBE", "NO"]) })).min(1) })).mutation(async ({ ctx, input }) => {
    try { const result = await submitColloquiumSchedulingAvailability({ ...input, userId: ctx.user.id, role: ctx.user.role }); const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role); await createAuditLogEntry({ thesisRequestId: poll.thesis.id, actorId: ctx.user.id, actorRole: ctx.user.role, action: "COLLOQUIUM_SCHEDULING_AVAILABILITY_SET", metadata: { pollId: input.pollId, hasMatch: result.hasMatch } }); return result; }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Verfügbarkeit konnte nicht gespeichert werden" }); }
  }),
  selectSlot: schedulingExaminerProcedure.input(z.object({ pollId: z.number().int().positive(), slotId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try { await selectColloquiumSchedulingSlot({ ...input, userId: ctx.user.id, role: ctx.user.role }); const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role); await createAuditLogEntry({ thesisRequestId: poll.thesis.id, actorId: ctx.user.id, actorRole: ctx.user.role, action: "COLLOQUIUM_SCHEDULING_SLOT_SELECTED", metadata: { pollId: input.pollId, slotId: input.slotId } }); return { success: true }; }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Termin konnte nicht vorgeschlagen werden" }); }
  }),
  confirm: protectedProcedure.input(pollIdInput.extend({ confirmed: z.boolean(), reason: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    try { const result = await confirmColloquiumSchedulingSlot({ ...input, userId: ctx.user.id, role: ctx.user.role }); const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role); await createAuditLogEntry({ thesisRequestId: poll.thesis.id, actorId: ctx.user.id, actorRole: ctx.user.role, action: input.confirmed ? (result.finalized ? "COLLOQUIUM_SCHEDULING_CONFIRMED" : "COLLOQUIUM_SCHEDULING_CONFIRMATION_GIVEN") : "COLLOQUIUM_SCHEDULING_CONFIRMATION_DECLINED", metadata: { pollId: input.pollId, finalized: result.finalized, reason: input.reason ?? null } }); return result; }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Bestätigung konnte nicht gespeichert werden" }); }
  }),
  cancel: schedulingExaminerProcedure.input(pollIdInput.extend({ reason: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
    try { await cancelColloquiumSchedulingPoll(input.pollId, ctx.user.id, ctx.user.role, input.reason); const poll = await getColloquiumSchedulingPollForUser(input.pollId, ctx.user.id, ctx.user.role); await createAuditLogEntry({ thesisRequestId: poll.thesis.id, actorId: ctx.user.id, actorRole: ctx.user.role, action: "COLLOQUIUM_SCHEDULING_CANCELLED", reason: input.reason ?? null, metadata: { pollId: input.pollId } }); return { success: true }; }
    catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Abstimmung konnte nicht abgesagt werden" }); }
  }),
});
