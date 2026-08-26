import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getAbstractReviewQueue, getAbstractSubmissionPrefill, getMyThesisAbstract, getPublicThesisAbstracts, reviewThesisAbstract, submitThesisAbstract, withdrawThesisAbstract } from "../db/abstractCollection";

const semesterInput = z.string().trim().regex(/^(SS|WS)\s?20\d{2}(\/\d{2})?$/, "Bitte verwenden Sie ein Semester wie SS 2026 oder WS 2026/27.");

const studentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "Nur Studierende können einen Abstract einreichen oder zurückziehen." });
  return next({ ctx });
});

const abstractModeratorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "superadmin"].includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Nur Verwaltung und Superadmins dürfen Abstracts freigeben." });
  return next({ ctx });
});

/** Einwilligungsbasiertes Abstract-Repository: öffentliche Liste enthält nur vier fachliche Felder. */
export const abstractCollectionRouter = router({
  publicList: publicProcedure.input(z.object({
    department: z.enum(["FB1", "FB2", "FB3", "FB4", "FB5"]).optional(),
    semester: semesterInput.optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }).optional()).query(({ input }) => getPublicThesisAbstracts(input ?? {})),
  publicExport: publicProcedure.input(z.object({
    department: z.enum(["FB1", "FB2", "FB3", "FB4", "FB5"]).optional(),
    semester: semesterInput.optional(),
  }).optional()).query(async ({ input }) => ({
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    entries: await getPublicThesisAbstracts({ ...(input ?? {}), limit: 100 }),
  })),
  prefill: studentProcedure.input(z.object({ thesisRequestId: z.number().int().positive() })).query(({ ctx, input }) => getAbstractSubmissionPrefill(input.thesisRequestId, ctx.user.id)),
  mine: studentProcedure.input(z.object({ thesisRequestId: z.number().int().positive() })).query(({ ctx, input }) => getMyThesisAbstract(input.thesisRequestId, ctx.user.id)),
  submit: studentProcedure.input(z.object({
    thesisRequestId: z.number().int().positive(),
    abstractDe: z.string().trim().min(80).max(3500),
    abstractEn: z.string().trim().min(80).max(3500),
    keywords: z.array(z.string().trim().min(2).max(64)).min(1).max(15),
    publicationConsent: z.literal(true),
  })).mutation(({ ctx, input }) => submitThesisAbstract({ ...input, studentId: ctx.user.id })),
  withdraw: studentProcedure.input(z.object({ thesisRequestId: z.number().int().positive() })).mutation(({ ctx, input }) => withdrawThesisAbstract({ ...input, studentId: ctx.user.id })),
  reviewQueue: abstractModeratorProcedure.query(() => getAbstractReviewQueue()),
  review: abstractModeratorProcedure.input(z.object({ id: z.number().int().positive(), approve: z.boolean(), note: z.string().trim().max(1000).optional() })).mutation(({ ctx, input }) => reviewThesisAbstract({ ...input, reviewerId: ctx.user.id })),
});
