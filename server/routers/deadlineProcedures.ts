import { z } from "zod";
import type { pavProcedure as PavProcedure } from "../routers";
import { closeCase, extendDeadline, getDeadlineChanges, setDefenseDate } from "../db/deadlines";

export function createPavDeadlineProcedures(pavProcedure: typeof PavProcedure, createAuditLogEntry: (entry: any) => Promise<unknown>) {
  return {
    extendDeadline: pavProcedure.input(z.object({ thesisRequestId: z.number().int().positive(), newDeadline: z.string(), reason: z.string().min(1) })).mutation(async ({ input, ctx }: any) => {
      await extendDeadline(input.thesisRequestId, ctx.user.id, input.newDeadline, input.reason);
      await createAuditLogEntry({ thesisRequestId: input.thesisRequestId, actorId: ctx.user.id, actorRole: ctx.user.role, action: "STATUS_CHANGED", metadata: { action: "deadline_extended", newDeadline: input.newDeadline, reason: input.reason } });
      return { success: true };
    }),
    setDefenseDate: pavProcedure.input(z.object({ thesisRequestId: z.number().int().positive(), defenseDate: z.string() })).mutation(async ({ input, ctx }: any) => {
      await setDefenseDate(input.thesisRequestId, ctx.user.id, input.defenseDate);
      await createAuditLogEntry({ thesisRequestId: input.thesisRequestId, actorId: ctx.user.id, actorRole: ctx.user.role, action: "STATUS_CHANGED", metadata: { action: "defense_date_set", defenseDate: input.defenseDate } });
      return { success: true };
    }),
    closeCase: pavProcedure.input(z.object({ thesisRequestId: z.number().int().positive() })).mutation(async ({ input, ctx }: any) => {
      await closeCase(input.thesisRequestId, ctx.user.id);
      await createAuditLogEntry({ thesisRequestId: input.thesisRequestId, actorId: ctx.user.id, actorRole: ctx.user.role, action: "STATUS_CHANGED", metadata: { officialStatus: "case_closed", note: "Akte vollständig übermittelt" } });
      return { success: true };
    }),
    getDeadlineChanges: pavProcedure.input(z.object({ thesisRequestId: z.number().int().positive() })).query(async ({ input }: any) => getDeadlineChanges(input.thesisRequestId)),
  };
}
