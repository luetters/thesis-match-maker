import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const publicContext = { user: null, req: {}, res: {} } as unknown as TrpcContext;

describe("faq.recordGuideDownload", () => {
  it("weist ungültige Leitfadenschlüssel vor dem Datenbankzugriff zurück", async () => {
    const caller = appRouter.createCaller(publicContext);
    await expect(caller.faq.recordGuideDownload({ guideKey: "not-a-guide" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
