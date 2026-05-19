import { relations } from "drizzle-orm/relations";
import { thesisRequests, colloquiums } from "./schema";

export const colloquiumsRelations = relations(colloquiums, ({one}) => ({
	thesisRequest: one(thesisRequests, {
		fields: [colloquiums.thesisRequestId],
		references: [thesisRequests.id]
	}),
}));

export const thesisRequestsRelations = relations(thesisRequests, ({many}) => ({
	colloquiums: many(colloquiums),
}));