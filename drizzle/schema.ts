import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, tinyint, varchar, text, json, timestamp, foreignKey, datetime, mysqlEnum, index } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const auditLog = mysqlTable("audit_log", {
	id: int().autoincrement().notNull(),
	thesisRequestId: int(),
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
	// Wiederholungs-Kolloquium (z. B. nach nicht bestandenem ersten Kolloquium)
	isRepeatColloquium: tinyint("is_repeat_colloquium").default(0).notNull(),
	repeatReason: varchar("repeat_reason", { length: 512 }),
	createdById: int("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emailTemplates = mysqlTable("email_templates", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 64 }).notNull(),
	label: varchar({ length: 128 }).notNull(),
	// Sprachunabhängiger Fallback (Legacy)
	subject: varchar({ length: 255 }).notNull(),
	htmlBody: text("html_body").notNull(),
	textBody: text("text_body").notNull(),
	// Deutsch
	subjectDe: varchar("subject_de", { length: 255 }),
	htmlBodyDe: text("html_body_de"),
	textBodyDe: text("text_body_de"),
	// Englisch
	subjectEn: varchar("subject_en", { length: 255 }),
	htmlBodyEn: text("html_body_en"),
	textBodyEn: text("text_body_en"),
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

export const examinerCommissionPreferences = mysqlTable("examiner_commission_preferences", {
	id: int().autoincrement().notNull(),
	firstExaminerId: int("first_examiner_id").notNull(),
	secondExaminerId: int("second_examiner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("uq_ecp").on(table.firstExaminerId, table.secondExaminerId),
]);

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
	role: mysqlEnum(['student','examiner','second_examiner','admin','user']).default('student').notNull(),
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
	fachbereich: varchar({ length: 8 }).notNull().default('FB3'),
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
	wantedExaminerId: int(),
	wantedSecondExaminerId: int("wanted_second_examiner_id"),
	title: varchar({ length: 512 }).notNull(),
	description: text().notNull(),
	department: varchar({ length: 255 }).notNull(),
	abstract: text(),
	targetSemester: varchar({ length: 32 }),
	language: varchar({ length: 8 }).default('de'),
	degreeType: mysqlEnum(['bachelor','master']).default('bachelor'),
	status: mysqlEnum(['PENDING','ACCEPTED','REJECTED','MATCHED','PENDING_FIRST_EXAMINER','PENDING_SECOND_EXAMINER','FIRST_EXAMINER_ACCEPTED','FIRST_EXAMINER_REJECTED','FIRST_EXAMINER_ASSIGNED','SECOND_EXAMINER_ACCEPTED','SECOND_EXAMINER_ASSIGNED','SECOND_EXAMINER_SET','COMPLETED','WITHDRAWN','CANCELLED','DRAFT_BY_EXAMINER','PENDING_STUDENT_CONFIRMATION','CONDITIONAL_ACCEPTANCE']).default('PENDING').notNull(),
	// ─── Examiner/PAV-initiierter Antrag ───
	initiatedBy: int("initiated_by"),
	initiatedByRole: varchar("initiated_by_role", { length: 32 }),
	studentInviteToken: varchar("student_invite_token", { length: 128 }),
	studentInviteEmail: varchar("student_invite_email", { length: 320 }),
	studentInviteSentAt: datetime("student_invite_sent_at", { mode: "string" }),
	studentConfirmedAt: datetime("student_confirmed_at", { mode: "string" }),
	deadline: datetime({ mode: 'string'}),
	rejectionReason: text(),
	withdrawalReason: text("withdrawal_reason"),
	conditionalAcceptanceReason: text("conditional_acceptance_reason"),
	conditionalAcceptanceAt: datetime("conditional_acceptance_at", { mode: "string" }),
	conditionalAcceptanceById: int("conditional_acceptance_by_id"),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	exposeUrl: text(),
	exposeKey: varchar({ length: 512 }),
	hasOwnTopic: int().default(1).notNull(),
	// ─── Anmeldefähigkeit (Verwaltungsfreigabe vor Betreuerzuweisung) ───
	enrollmentEligibility: mysqlEnum("enrollment_eligibility", ["pending","approved","rejected"]).default("pending").notNull(),
	enrollmentEligibilityNote: text("enrollment_eligibility_note"),
	enrollmentEligibilityCheckedBy: int("enrollment_eligibility_checked_by"),
	enrollmentEligibilityCheckedAt: datetime("enrollment_eligibility_checked_at", { mode: "string" }),
	// ─── Verteidigungsfähigkeit (Verwaltungsfreigabe vor Kolloquium) ───
	defenseEligibility: mysqlEnum("defense_eligibility", ["not_applicable","pending","approved","blocked"]).default("not_applicable").notNull(),
	defenseEligibilityNote: text("defense_eligibility_note"),
	defenseEligibilityCheckedBy: int("defense_eligibility_checked_by"),
	defenseEligibilityCheckedAt: datetime("defense_eligibility_checked_at", { mode: "string" }),
	// ─── Offizieller Anmelde- und Zulassungsworkflow (Verwaltung) ───
	officialRegistrationStatus: mysqlEnum("official_registration_status", [
		"not_registered",     // noch nicht offiziell angemeldet
		"registered",         // Arbeit angemeldet, Zulassung ausstehend
		"admitted",           // Thesis zugelassen
		"case_closed"         // Akte vollständig übermittelt
	]).default("not_registered").notNull(),
	officialRegistrationAt: datetime("official_registration_at", { mode: "string" }),
	officialRegistrationBy: int("official_registration_by"),
	admissionAt: datetime("admission_at", { mode: "string" }),
	admissionBy: int("admission_by"),
	admissionNote: text("admission_note"),
	submissionDeadline: datetime("submission_deadline", { mode: "string" }),
	defenseDate: datetime("defense_date", { mode: "string" }),
	defenseDateSetAt: datetime("defense_date_set_at", { mode: "string" }),
	defenseDateSetBy: int("defense_date_set_by"),
	caseClosedAt: datetime("case_closed_at", { mode: "string" }),
	caseClosedBy: int("case_closed_by"),
	// ─── Persönliche Angaben der Studierenden ───
	studySpecializations: text("study_specializations"),
	personalInterests: text("personal_interests"),
	// ─── LLM-extrahierte Schlagwörter (JSON-Array als String) ───
	keywords: text("keywords"),
	// ─── Externer Zweitgutachter (nicht im System) ───
	externalSecondExaminerTitle: varchar("external_second_examiner_title", { length: 64 }),
	externalSecondExaminerFirstName: varchar("external_second_examiner_first_name", { length: 128 }),
	externalSecondExaminerLastName: varchar("external_second_examiner_last_name", { length: 128 }),
	externalSecondExaminerEmail: varchar("external_second_examiner_email", { length: 320 }),
	// Einladungstoken für externe Zweitgutachter-Einladung (Person noch nicht im System)
	secondExaminerInviteToken: varchar("second_examiner_invite_token", { length: 128 }),
	secondExaminerInviteSentAt: datetime("second_examiner_invite_sent_at", { mode: "string" }),
	// Zeitstempel: wann der Zweitgutachter angefragt wurde
	secondExaminerRequestedAt: datetime("second_examiner_requested_at", { mode: "string" }),
	// Zeitstempel: wann der Zweitgutachter zugesagt hat
	secondExaminerAcceptedAt: datetime("second_examiner_accepted_at", { mode: "string" }),
	// Zeitstempel: wann der Zweitgutachter abgelehnt hat
	secondExaminerRejectedAt: datetime("second_examiner_rejected_at", { mode: "string" }),
	// Referenz auf das gewählte Prüfer-Thema (optional)
	examinerTopicId: int("examiner_topic_id"),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean']).default('student').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	passwordHash: varchar({ length: 255 }),
	programmeId: int("programme_id"),
	preferredLanguage: mysqlEnum(['de','en']).default('de').notNull(),
	roleStatus: mysqlEnum(['approved','pending','rejected']).default('approved').notNull(),
	requestedRole: mysqlEnum(['user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean']),
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
	// Name-Felder (getrennt)
	firstName: varchar("first_name", { length: 128 }),
	lastName: varchar("last_name", { length: 128 }),
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
  htwProfileUrl: varchar("htw_profile_url", { length: 512 }),
  miscLink: varchar("misc_link", { length: 512 }),
  bookingUrl: varchar("booking_url", { length: 512 }),
  isFictitiousExample: tinyint("is_fictitious_example").notNull().default(0),
  // Profil-Banner
  bannerColor: varchar("banner_color", { length: 32 }),
  bannerImageUrl: text("banner_image_url"),
  bannerImageKey: varchar("banner_image_key", { length: 512 }),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

// ─── Fehlende Tabellen (wurden in db.ts referenziert, aber nicht definiert) ───

export const reminderSchedules = mysqlTable("reminder_schedules", {
  id: int().autoincrement().notNull(),
  thesisRequestId: int("thesis_request_id").notNull(),
  reminderType: varchar("reminder_type", { length: 64 }).notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: "string" }).notNull(),
  status: mysqlEnum(["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sent_at", { mode: "string" }),
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

/**
 * Betreuungskapazitäten eines Prüfers pro Semester
 * semester: z.B. "WS2025" oder "SoSe2026"
 */
export const examinerSemesterCapacities = mysqlTable("examiner_semester_capacities", {
  id: int().autoincrement().notNull(),
  examinerId: int("examiner_id").notNull(),
  semester: varchar({ length: 16 }).notNull(),
  maxFirst: int("max_first").default(0).notNull(),
  maxSecond: int("max_second").default(0).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
  adminOverride: tinyint("admin_override").default(0).notNull(),
  adminOverrideBy: int("admin_override_by"),
  adminOverrideAt: datetime("admin_override_at"),
  adminMaxFirst: int("admin_max_first"),
  adminMaxSecond: int("admin_max_second"),
},
(table) => [
  index("uq_esc").on(table.examinerId, table.semester),
]);

// ─── Prüfer:innen E-Mail-Templates ──────────────────────────────────────────
export const examinerEmailTemplates = mysqlTable("examiner_email_templates", {
  id: int().autoincrement().notNull(),
  examinerId: int("examiner_id").notNull(),
  templateType: mysqlEnum("template_type", [
    "requirements",
    "acceptance",
    "rejection",
    "fully_booked",
  ]).notNull(),
  subject: varchar({ length: 255 }).notNull().default(""),
  body: text().notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
  index("idx_examiner_email_tpl").on(table.examinerId, table.templateType),
]);

// ─── Multi-Rollen-Tabelle ────────────────────────────────────────────────────
// Jeder Nutzer kann mehrere Rollen gleichzeitig haben (z.B. Prüfer:in + Dekan + PAV)
export const userRoles = mysqlTable("user_roles", {
  id: int().autoincrement().notNull(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["user", "admin", "student", "examiner", "second_examiner", "superadmin", "pav", "dean", "vice_dean"]).notNull(),
  assignedBy: int("assigned_by"),
  assignedAt: timestamp("assigned_at", { mode: "string" }).defaultNow().notNull(),
},
(table) => [
  index("uq_user_role").on(table.userId, table.role),
]);

// ─── Prüfer:innen-Fachbereich-Zuordnung (Multi-Fachbereich) ──────────────────────────────
// Ein Prüfer hat einen Primärfachbereich (isPrimary=1) und kann weitere erlauben (isPrimary=0)
export const examinerDepartments = mysqlTable("examiner_departments", {
  id: int().autoincrement().notNull(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  department: varchar({ length: 10 }).notNull(), // z.B. "FB1", "FB2", ...
  isPrimary: int("is_primary").default(0).notNull(), // 1 = Primärfachbereich
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
},
(table) => [
  index("uq_examiner_dept").on(table.userId, table.department),
]);

// ─── Abgabefrist-Änderungsprotokoll ─────────────────────────────────────────────────────────
export const deadlineChanges = mysqlTable("deadline_changes", {
  id: int().autoincrement().notNull(),
  thesisRequestId: int("thesis_request_id").notNull().references(() => thesisRequests.id, { onDelete: "cascade" }),
  previousDeadline: datetime("previous_deadline", { mode: "string" }),
  newDeadline: datetime("new_deadline", { mode: "string" }).notNull(),
  reason: text("reason").notNull(),
  changedBy: int("changed_by").notNull(),
  changedAt: datetime("changed_at", { mode: "string" }).notNull(),
});

// ─── Insert-Typen (werden in db.ts importiert) ────────────────────────────────────────────────
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

// ─── Thesis Document Verification Tokens ─────────────────────────────────────
export const thesisDocTokens = mysqlTable("thesis_doc_tokens", {
  id: int().autoincrement().notNull().primaryKey(),
  token: varchar({ length: 128 }).notNull().unique(),
  thesisRequestId: int("thesis_request_id").notNull().references(() => thesisRequests.id, { onDelete: "cascade" }),
  studentName: varchar("student_name", { length: 255 }).notNull(),
  matrikelNr: varchar("matrikel_nr", { length: 32 }),
  programmeName: varchar("programme_name", { length: 255 }),
  title: varchar({ length: 512 }).notNull(),
  firstExaminerName: varchar("first_examiner_name", { length: 255 }),
  secondExaminerName: varchar("second_examiner_name", { length: 255 }),
  targetSemester: varchar("target_semester", { length: 32 }),
  degreeType: varchar("degree_type", { length: 16 }),
  createdAt: timestamp("created_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
  revoked: int().default(0).notNull(),
});
export type InsertThesisDocToken = InferInsertModel<typeof thesisDocTokens>;

// ─── Examiner Favorites ───────────────────────────────────────────────────────
export const examinerFavorites = mysqlTable("examiner_favorites", {
  id: int().autoincrement().notNull().primaryKey(),
  studentId: int("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  examinerId: int("examiner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  note: varchar({ length: 512 }),
  createdAt: timestamp({ mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
export type InsertExaminerFavorite = typeof examinerFavorites.$inferInsert;

// ─── Student Registration Invitations ────────────────────────────────────────
export const studentRegistrationInvitations = mysqlTable("student_registration_invitations", {
  id: int().autoincrement().notNull().primaryKey(),
  token: varchar({ length: 128 }).notNull().unique(),
  examinerId: int("examiner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentEmail: varchar("student_email", { length: 320 }).notNull(),
  emailLang: varchar("email_lang", { length: 4 }).notNull().default("de"),
  usedAt: datetime("used_at", { mode: "string" }),
  usedByUserId: int("used_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: datetime("expires_at", { mode: "string" }).notNull(),
  revoked: tinyint().default(0).notNull(),
});
export type InsertStudentRegistrationInvitation = typeof studentRegistrationInvitations.$inferInsert;


// ─── Examiner Comments (private, nur für den Kommentierenden sichtbar) ────────
export const examinerComments = mysqlTable("examiner_comments", {
  id: int().autoincrement().notNull().primaryKey(),
  thesisRequestId: int("thesis_request_id").notNull().references(() => thesisRequests.id, { onDelete: "cascade" }),
  examinerId: int("examiner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
export type InsertExaminerComment = typeof examinerComments.$inferInsert;
export type SelectExaminerComment = typeof examinerComments.$inferSelect;

// ─── Conditional Documents (Dokumente bei Zusage unter Vorbehalt) ─────────────
export const conditionalDocuments = mysqlTable("conditional_documents", {
  id: int().autoincrement().notNull().primaryKey(),
  thesisRequestId: int("thesis_request_id").notNull().references(() => thesisRequests.id, { onDelete: "cascade" }),
  uploadedByUserId: int("uploaded_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalFilename: varchar("original_filename", { length: 512 }).notNull(),
  storageKey: varchar("storage_key", { length: 1024 }).notNull(),
  storageUrl: varchar("storage_url", { length: 2048 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull().default("application/pdf"),
  fileSizeBytes: int("file_size_bytes"),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
export type InsertConditionalDocument = typeof conditionalDocuments.$inferInsert;
export type SelectConditionalDocument = typeof conditionalDocuments.$inferSelect;

// ─── Kommentare zu Conditional-Dokumenten ────────────────────────────────────
export const conditionalDocumentComments = mysqlTable("conditional_document_comments", {
  id: int().autoincrement().notNull().primaryKey(),
  documentId: int("document_id").notNull().references(() => conditionalDocuments.id, { onDelete: "cascade" }),
  authorId: int("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
export type InsertConditionalDocumentComment = typeof conditionalDocumentComments.$inferInsert;
export type SelectConditionalDocumentComment = typeof conditionalDocumentComments.$inferSelect;

// ─── Prüfer-Themenvorschläge ──────────────────────────────────────────────────
export const examinerTopics = mysqlTable("examiner_topics", {
  id: int().autoincrement().notNull().primaryKey(),
  examinerId: int("examiner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar({ length: 512 }).notNull(),
  description: text().notNull(),
  // Semester-Eingrenzung: null = für alle Zukunft
  validFromSemester: varchar("valid_from_semester", { length: 16 }),
  validUntilSemester: varchar("valid_until_semester", { length: 16 }),
  // Abschlussart-Einschränkung: null = beide
  degreeType: mysqlEnum("degree_type", ["bachelor", "master"]),
  // Sprache der Arbeit
  language: mysqlEnum("language", ["de", "en", "both"]).default("de").notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  // Mehrfachvergabe: 1 = Thema kann von mehreren Studierenden gewählt werden
  allowMultiple: tinyint("allow_multiple").default(1).notNull(),
  // Maximale Anzahl Vergaben: NULL = unbegrenzt
  maxAssignments: int("max_assignments"),
  // Schlagwörter als komma-getrennter String, z. B. "KI,Nachhaltigkeit,Logistik"
  tags: text("tags"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
export type InsertExaminerTopic = typeof examinerTopics.$inferInsert;
export type SelectExaminerTopic = typeof examinerTopics.$inferSelect;
