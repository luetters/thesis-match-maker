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
  role: mysqlEnum("role", ["user", "admin", "student", "examiner"]).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExaminerProfile = typeof examinerProfiles.$inferSelect;
export type InsertExaminerProfile = typeof examinerProfiles.$inferInsert;

// ─── Thesis Requests ─────────────────────────────────────────────────────────

export const thesisRequests = mysqlTable("thesis_requests", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  examinerId: int("examinerId"),
  secondExaminerId: int("secondExaminerId"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  abstract: text("abstract"),
  targetSemester: varchar("targetSemester", { length: 32 }),
  language: varchar("language", { length: 8 }).default("de"),
  degreeType: mysqlEnum("degreeType", ["bachelor", "master"]).default("bachelor"),
  status: mysqlEnum("status", ["PENDING", "ACCEPTED", "REJECTED", "MATCHED"]).default("PENDING").notNull(),
  rejectionReason: text("rejectionReason"),
  exposeUrl: text("exposeUrl"),
  exposeKey: varchar("exposeKey", { length: 512 }),
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
