import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, tinyint, varchar, text, json, timestamp, foreignKey, datetime, mysqlEnum, index } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const auditLog = mysqlTable("audit_log", {
	id: int().autoincrement().notNull(),
	thesisRequestId: int().notNull(),
	actorId: int(),
	actorRole: varchar({ length: 32 }),
	action: varchar({ length: 128 }).notNull(),
	fromStatus: varchar({ length: 32 }),
	toStatus: varchar({ length: 32 }),
	reason: text(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const colloquiums = mysqlTable("colloquiums", {
	id: int().autoincrement().notNull(),
	thesisRequestId: int("thesis_request_id").notNull().references(() => thesisRequests.id, { onDelete: "cascade" } ),
	title: varchar({ length: 512 }).notNull(),
	scheduledAt: datetime("scheduled_at", { mode: 'string'}).notNull(),
	location: varchar({ length: 512 }),
	room: varchar({ length: 256 }),
	notes: text(),
	status: mysqlEnum(['SCHEDULED','CANCELLED','COMPLETED']).default('SCHEDULED').notNull(),
	createdById: int("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emailTemplates = mysqlTable("email_templates", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 64 }).notNull(),
	label: varchar({ length: 128 }).notNull(),
	subject: varchar({ length: 255 }).notNull(),
	htmlBody: text("html_body").notNull(),
	textBody: text("text_body").notNull(),
	placeholders: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedByUserId: int("updated_by_user_id"),
},
(table) => [
	index("key").on(table.key),
]);

export const examinerActionTokens = mysqlTable("examiner_action_tokens", {
	id: int().autoincrement().notNull(),
	thesisRequestId: int("thesis_request_id").notNull(),
	examinerId: int("examiner_id").notNull(),
	token: varchar({ length: 128 }).notNull(),
	action: mysqlEnum(['accept','reject']),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);

export const examinerProfiles = mysqlTable("examiner_profiles", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	title: varchar({ length: 64 }),
	department: varchar({ length: 255 }),
	tags: json(),
	languages: json(),
	studyPrograms: json(),
	bio: text(),
	maxSupervisions: int().default(5),
	phone: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	photoUrl: text(),
	photoKey: varchar({ length: 512 }),
	researchFocus: text(),
	officeHours: varchar({ length: 255 }),
	websiteUrl: varchar({ length: 512 }),
	alternativeEmail: varchar({ length: 320 }),
	isSecondExaminer: int().default(0).notNull(),
	onboardingCompleted: int().default(0).notNull(),
});

export const examinerProgrammes = mysqlTable("examiner_programmes", {
	id: int().autoincrement().notNull(),
	examinerId: int("examiner_id").notNull(),
	programmeId: int("programme_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("uq_ep").on(table.examinerId, table.programmeId),
]);

export const magicLinks = mysqlTable("magic_links", {
	id: int().autoincrement().notNull(),
	email: varchar({ length: 320 }).notNull(),
	token: varchar({ length: 128 }).notNull(),
	role: mysqlEnum(['student','examiner','admin','user']).default('student').notNull(),
	used: int().default(0).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);

export const notifications = mysqlTable("notifications", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	type: mysqlEnum(['status_change','examiner_assigned','expose_uploaded','system']).default('system').notNull(),
	read: int().default(0).notNull(),
	thesisRequestId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
	id: int().autoincrement().notNull(),
	token: varchar({ length: 128 }).notNull(),
	userId: int("user_id").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: int().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("token").on(table.token),
]);

export const pavExaminerProposals = mysqlTable("pav_examiner_proposals", {
	id: int().autoincrement().notNull(),
	thesisRequestId: int("thesis_request_id").notNull(),
	proposedByPavId: int("proposed_by_pav_id").notNull(),
	examinerId: int("examiner_id").notNull(),
	examinerRole: mysqlEnum("examiner_role", ['first','second']).notNull(),
	status: mysqlEnum(['pending','accepted','declined']).default('pending').notNull(),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	respondedAt: timestamp("responded_at", { mode: 'string' }),
	declineReason: text("decline_reason"),
	actionToken: varchar("action_token", { length: 128 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const pavProgrammes = mysqlTable("pav_programmes", {
	id: int().autoincrement().notNull(),
	pavUserId: int("pav_user_id").notNull(),
	programmeId: int("programme_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const programmes = mysqlTable("programmes", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	abbreviation: varchar({ length: 32 }).notNull(),
	level: mysqlEnum(['bachelor','master']).notNull(),
	pictogramUrl: varchar("pictogram_url", { length: 512 }),
	sortOrder: int("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("abbreviation").on(table.abbreviation),
]);

export const systemSettings = mysqlTable("system_settings", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 128 }).notNull(),
	value: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
	updatedById: int("updated_by_id"),
},
(table) => [
	index("key").on(table.key),
]);

export const thesisRequests = mysqlTable("thesis_requests", {
	id: int().autoincrement().notNull(),
	studentId: int().notNull(),
	examinerId: int(),
	secondExaminerId: int(),
	title: varchar({ length: 512 }).notNull(),
	description: text().notNull(),
	department: varchar({ length: 255 }).notNull(),
	abstract: text(),
	targetSemester: varchar({ length: 32 }),
	language: varchar({ length: 8 }).default('de'),
	degreeType: mysqlEnum(['bachelor','master']).default('bachelor'),
	status: mysqlEnum(['PENDING','ACCEPTED','REJECTED','MATCHED','PENDING_FIRST_EXAMINER','PENDING_SECOND_EXAMINER','FIRST_EXAMINER_ACCEPTED','FIRST_EXAMINER_REJECTED','FIRST_EXAMINER_ASSIGNED','SECOND_EXAMINER_ACCEPTED','SECOND_EXAMINER_ASSIGNED','SECOND_EXAMINER_SET','COMPLETED','WITHDRAWN','CANCELLED']).default('PENDING').notNull(),
	deadline: datetime({ mode: 'string'}),
	rejectionReason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	exposeUrl: text(),
	exposeKey: varchar({ length: 512 }),
	hasOwnTopic: int().default(1).notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','student','examiner','superadmin','pav','dean','vice_dean']).default('student').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	passwordHash: varchar({ length: 255 }),
	programmeId: int("programme_id"),
	preferredLanguage: mysqlEnum(['de','en']).default('de').notNull(),
	roleStatus: mysqlEnum(['approved','pending','rejected']).default('approved').notNull(),
	requestedRole: mysqlEnum(['user','admin','student','examiner','superadmin','pav','dean','vice_dean']),
	roleConfirmedBy: int(),
	roleConfirmedAt: timestamp({ mode: 'string' }),
	avatarUrl: text(),
	avatarKey: varchar({ length: 512 }),
	bio: text(),
	phone: varchar({ length: 64 }),
	department: varchar({ length: 255 }),
	// Studierende
	matrikelNr: varchar("matrikel_nr", { length: 32 }),
	thesisType: mysqlEnum("thesis_type", ['bachelor','master']),
	enrollmentSemester: varchar("enrollment_semester", { length: 32 }),
	// Prüfer:innen (Kurzfelder; Details in examinerProfiles)
	academicTitle: varchar("academic_title", { length: 64 }),
	officeRoom: varchar("office_room", { length: 64 }),
  // Studierende – erweitert
  targetSemester: varchar("target_semester", { length: 20 }),
  // Prüfer:innen – erweitert (Details in examinerProfiles)
  officeHours: text("office_hours"),
  researchTags: text("research_tags"),
  // Verwaltung
  staffId: varchar("staff_id", { length: 32 }),
  responsibilityArea: varchar("responsibility_area", { length: 255 }),
  officeLocation: varchar("office_location", { length: 255 }),
  // Kontakt & Online-Präsenz
  secondEmail: varchar("second_email", { length: 320 }),
  website: varchar("website", { length: 512 }),
  linkedIn: varchar("linked_in", { length: 512 }),
  researchGate: varchar("research_gate", { length: 512 }),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

// ─── Fehlende Tabellen (wurden in db.ts referenziert, aber nicht definiert) ───

export const reminderSchedules = mysqlTable("reminder_schedules", {
  id: int().autoincrement().notNull(),
  thesisRequestId: int("thesis_request_id").notNull(),
  reminderType: varchar("reminder_type", { length: 64 }).notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: "date" }).notNull(),
  status: mysqlEnum(["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sent_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
});

export const reminderTemplates = mysqlTable("reminder_templates", {
  id: int().autoincrement().notNull(),
  type: varchar({ length: 64 }).notNull(),
  subject: varchar({ length: 512 }).notNull(),
  htmlBody: text("html_body"),
  textBody: text("text_body"),
  delayDays: int("delay_days").default(0).notNull(),
  isActive: int("is_active").default(1).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow(),
});

export const savedFilters = mysqlTable("saved_filters", {
  id: int().autoincrement().notNull(),
  userId: int("user_id").notNull(),
  name: varchar({ length: 255 }).notNull(),
  filterConfig: text("filter_config").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
});

// ─── Insert-Typen (werden in db.ts importiert) ────────────────────────────────
import { InferInsertModel } from "drizzle-orm";

export type InsertUser = InferInsertModel<typeof users>;
export type InsertAuditLogEntry = InferInsertModel<typeof auditLog>;
export type InsertExaminerProfile = InferInsertModel<typeof examinerProfiles>;
export type InsertNotification = InferInsertModel<typeof notifications>;
export type InsertPavExaminerProposal = InferInsertModel<typeof pavExaminerProposals>;
export type InsertThesisRequest = InferInsertModel<typeof thesisRequests>;

export type InsertColloquium = InferInsertModel<typeof colloquiums>;
export type InsertPasswordResetToken = InferInsertModel<typeof passwordResetTokens>;
export type InsertSystemSetting = InferInsertModel<typeof systemSettings>;

// User-Typ (wird in server/_core/context.ts und sdk.ts verwendet)
import { InferSelectModel } from "drizzle-orm";
export type User = InferSelectModel<typeof users>;
