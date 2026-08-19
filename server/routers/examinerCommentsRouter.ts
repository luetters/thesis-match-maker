import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createExaminerComment,
  deleteExaminerComment,
  getExaminerComments,
  searchExaminerComments,
  setExaminerCommentCompletion,
  updateExaminerComment,
} from "../db/examinerComments";

/** API für private, ausschließlich der prüfenden Person sichtbare Anfragenotizen. */
export const examinerCommentsRouter = router({
  list: protectedProcedure
    .input(z.object({ thesisRequestId: z.number(), includeCompleted: z.boolean().optional() }))
    .query(async ({ ctx, input }) => getExaminerComments(input.thesisRequestId, ctx.user.id, input.includeCompleted)),

  search: protectedProcedure
    .input(z.object({
      search: z.string().trim().max(200).optional(),
      priority: z.enum(["normal", "important", "urgent"]).optional(),
      includeCompleted: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => searchExaminerComments({ examinerId: ctx.user.id, ...input })),

  setCompletion: protectedProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setExaminerCommentCompletion({ id: input.id, examinerId: ctx.user.id, completed: input.completed });
      return { success: true };
    }),

  create: protectedProcedure
    .input(z.object({
      thesisRequestId: z.number(),
      content: z.string().min(1).max(4000),
      priority: z.enum(["normal", "important", "urgent"]).default("normal"),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createExaminerComment({
        thesisRequestId: input.thesisRequestId,
        examinerId: ctx.user.id,
        content: input.content,
        priority: input.priority,
        dueAt: input.priority === "urgent" && input.dueDate ? `${input.dueDate} 23:59:59` : null,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1).max(4000),
      priority: z.enum(["normal", "important", "urgent"]).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateExaminerComment({
        id: input.id,
        examinerId: ctx.user.id,
        content: input.content,
        priority: input.priority,
        dueAt: input.priority === "urgent" && input.dueDate ? `${input.dueDate} 23:59:59` : null,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteExaminerComment({ id: input.id, examinerId: ctx.user.id });
      return { success: true };
    }),
});
