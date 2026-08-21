import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  answerAndPublishFaqFeedback,
  getFaqFeedbackOverview,
  recordGuideDownload,
  getPublishedFaqFeedback,
  getTopFaqRatings,
  recordFaqRating,
  submitFaqFeedback,
} from "../db/faq";
import { GUIDE_DOWNLOAD_KEYS } from "../../shared/guideAssets";

/** Öffentliche FAQ-Rückmeldungen und geschützte Redaktion. */
export const faqRouter = router({
  submitFeedback: publicProcedure
    .input(z.object({
      message: z.string().min(15).max(800),
      audience: z.enum(["general", "student", "firstExaminer", "secondExaminer", "admin"]),
      language: z.enum(["de", "en"]),
    }))
    .mutation(async ({ input }) => submitFaqFeedback(input)),
  rateAnswer: publicProcedure
    .input(z.object({ faqKey: z.string().regex(/^(general|student|firstExaminer|secondExaminer|admin|community):\d+$/), helpful: z.boolean() }))
    .mutation(async ({ input }) => recordFaqRating(input)),
  recordGuideDownload: publicProcedure
    .input(z.object({ guideKey: z.enum(GUIDE_DOWNLOAD_KEYS) }))
    .mutation(async ({ input }) => recordGuideDownload(input.guideKey)),
  published: publicProcedure
    .input(z.object({ language: z.enum(["de", "en"]) }))
    .query(async ({ input }) => getPublishedFaqFeedback(input.language)),
  topRated: publicProcedure.query(async () => getTopFaqRatings()),
  adminOverview: adminProcedure.query(async () => getFaqFeedbackOverview()),
  answerAndPublish: adminProcedure
    .input(z.object({ id: z.number().int().positive(), answer: z.string().min(15).max(1600), publish: z.boolean() }))
    .mutation(async ({ input }) => answerAndPublishFaqFeedback(input)),
});
