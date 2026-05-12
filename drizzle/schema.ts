import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "student", "examiner", "superadmin", "pav", "dean", "vice_dean"]).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  preferredLanguage: mysqlEnum("preferredLanguage", ["de", "en"]).default("de").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Examiner Profiles ───────────────────────────────────────────────────────

export const examinerProfiles = mysqlTable("examiner_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 64 }),
  department: varchar("department", { length: 255 }),
  tags: json("tags").$type<string[]>(),
  languages: json("languages").$type<string[]>(),
  studyPrograms: json("studyPrograms").$type<string[]>(),
  bio: text("bio"),
  maxSupervisions: int("maxSupervisions").default(5),
  phone: varchar("phone", { length: 64 }),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 512 }),
  researchFocus: text("researchFocus"),
  officeHours: varchar("officeHours", { length: 255 }),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  alternativeEmail: varchar("alternativeEmail", { length: 320 }),
  isSecondExaminer: int("isSecondExaminer").default(0).notNull(),
  onboardingCompleted: int("onboardingCompleted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExaminerProfile = typeof examinerProfiles.$inferSelect;
export type InsertExaminerProfile = typeof examinerProfiles.$inferInsert;

// ─── Thesis Requests ─────────────────────────────────────────────────────────

export const thesisRequests = mysqlTable("thesis_requests", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  wantedExaminerId: int("wantedExaminerId"),
  examinerId: int("examinerId"),
  secondExaminerId: int("secondExaminerId"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  abstract: text("abstract"),
  targetSemester: varchar("targetSemester", { length: 32 }),
  language: varchar("language", { length: 8 }).default("de"),
  degreeType: mysqlEnum("degreeType", ["bachelor", "master"]).default("bachelor"),
  deadline: timestamp("deadline"),
  status: mysqlEnum("status", ["PENDING", "PENDING_FIRST_EXAMINER", "FIRST_EXAMINER_ACCEPTED", "FIRST_EXAMINER_REJECTED", "PENDING_SECOND_EXAMINER", "COMPLETED", "ACCEPTED", "REJECTED", "MATCHED"]).default("PENDING").notNull(),
  rejectionReason: text("rejectionReason"),
  exposeUrl: text("exposeUrl"),
  exposeKey: varchar("exposeKey", { length: 512 }),
  hasOwnTopic: int("hasOwnTopic").default(1).notNull(),
  withdrawnAt: timestamp("withdrawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ThesisRequest = typeof thesisRequests.$inferSelect;
export type InsertThesisRequest = typeof thesisRequests.$inferInsert;

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  thesisRequestId: int("thesisRequestId"),
  actorId: int("actorId"),
  actorRole: varchar("actorRole", { length: 32 }),
  action: varchar("action", { length: 128 }).notNull(),
  fromStatus: varchar("fromStatus", { length: 32 }),
  toStatus: varchar("toStatus", { length: 32 }),
  reason: text("reason"),
  metadata: json("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["status_change", "examiner_assigned", "expose_uploaded", "system"]).default("system").notNull(),
  read: int("read").default(0).notNull(),
  thesisRequestId: int("thesisRequestId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Magic Links (eigenes Auth-System) ─────────────────────────────────────────────────────

export const magicLinks = mysqlTable("magic_links", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  role: mysqlEnum("role", ["student", "examiner", "admin", "user"]).notNull().default("student"),
  used: int("used").notNull().default(0),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLink = typeof magicLinks.$inferSelect;
export type InsertMagicLink = typeof magicLinks.$inferInsert;

// Kolloquien
export const colloquiums = mysqlTable("colloquiums", {
  id: int("id").autoincrement().primaryKey(),
  thesisRequestId: int("thesis_request_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  location: varchar("location", { length: 512 }),
  room: varchar("room", { length: 256 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["SCHEDULED", "CANCELLED", "COMPLETED"]).default("SCHEDULED").notNull(),
  createdById: int("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Colloquium = typeof colloquiums.$inferSelect;
export type InsertColloquium = typeof colloquiums.$inferInsert;

// ─── System Settings ──────────────────────────────────────────────────────────
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  updatedById: int("updated_by_id"),
});
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// ─── Password Reset Tokens ────────────────────────────────────────────────────
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  userId: int("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: int("used").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ─── Study Programmes ─────────────────────────────────────────────────────────
export const programmes = mysqlTable("programmes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 32 }).notNull().unique(),
  level: mysqlEnum("level", ["bachelor", "master"]).notNull(),
  pictogramUrl: varchar("pictogram_url", { length: 512 }),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Programme = typeof programmes.$inferSelect;
export type InsertProgramme = typeof programmes.$inferInsert;

// ─── Examiner ↔ Programme (many-to-many) ─────────────────────────────────────
export const examinerProgrammes = mysqlTable("examiner_programmes", {
  id: int("id").autoincrement().primaryKey(),
  examinerId: int("examiner_id").notNull(),
  programmeId: int("programme_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ExaminerProgramme = typeof examinerProgrammes.$inferSelect;

// ─── Student ←→ Programme (one-to-one, immutable after set) ─────────────────────────────────────────────────────────
// Stored directly on the student profile (thesisRequests already has studyProgram text field)
// We add programmeId to users table via ALTER TABLE in migration

// ─── PAV ←→ Programme (many-to-many) ─────────────────────────────────────────────────────────
export const pavProgrammes = mysqlTable("pav_programmes", {
  id: int("id").autoincrement().primaryKey(),
  pavUserId: int("pav_user_id").notNull(),
  programmeId: int("programme_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PavProgramme = typeof pavProgrammes.$inferSelect;

// ─── PAV Examiner Proposals ────────────────────────────────────────────────────────────────
export const pavExaminerProposals = mysqlTable("pav_examiner_proposals", {
  id: int("id").autoincrement().primaryKey(),
  thesisRequestId: int("thesis_request_id").notNull(),
  proposedByPavId: int("proposed_by_pav_id").notNull(),
  examinerId: int("examiner_id").notNull(),
  examinerRole: mysqlEnum("examiner_role", ["first", "second"]).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  emailSentAt: timestamp("email_sent_at"),
  respondedAt: timestamp("responded_at"),
  declineReason: text("decline_reason"),
  actionToken: varchar("action_token", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PavExaminerProposal = typeof pavExaminerProposals.$inferSelect;
export type InsertPavExaminerProposal = typeof pavExaminerProposals.$inferInsert;

// ─── E-Mail-Vorlagen ───────────────────────────────────────────────────────────────────────────────────────
const emailTemplateKeyEnum = mysqlEnum("key", ["status_change", "examiner_cta", "colloquium_invite", "password_reset", "magic_link"]);

export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body").notNull(),
  placeholders: text("placeholders"), // JSON-Array der verfügbaren Platzhalter
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  updatedByUserId: int("updated_by_user_id"),
});
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
// ─── Examiner Action Tokens (für Accept/Reject-Links in E-Mails) ─────────────────────────
export const examinerActionTokens = mysqlTable("examiner_action_tokens", {
  id: int("id").autoincrement().primaryKey(),
  thesisRequestId: int("thesis_request_id").notNull(),
  examinerId: int("examiner_id").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  action: mysqlEnum("action", ["accept", "reject"]),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ExaminerActionToken = typeof examinerActionTokens.$inferSelect;
export type InsertExaminerActionToken = typeof examinerActionTokens.$inferInsert;
