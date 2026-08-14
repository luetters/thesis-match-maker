import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, tinyint, varchar, text, json, timestamp, foreignKey, datetime, mysqlEnum, index, uniqueIndex } from "drizzle-orm/mysql-core"
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
	onlineLink: varchar("online_link", { length: 1024 }),
	notes: text(),
	status: mysqlEnum(['SCHEDULED','CANCELLED','COMPLETED']).default('SCHEDULED').notNull(),
	// Wiederholungs-Kolloquium (z. B. nach nicht bestandenem ersten Kolloquium)
	isRepeatColloquium: tinyint("is_repeat_colloquium").default(0).notNull(),
	repeatReason: varchar("repeat_reason", { length: 512 }),
	createdById: int("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── Administrative Sperrzeiten für Räume ───────────────────────────────────
// Manuell gepflegte Zeiträume, in denen ein Raum nicht für Kolloquien verfügbar
// ist (z. B. Lehrveranstaltung, Wartung oder externe Raumbelegung).
export const colloquiumRoomBlocks = mysqlTable("colloquium_room_blocks", {
	id: int().autoincrement().notNull().primaryKey(),
	location: varchar({ length: 512 }),
	room: varchar({ length: 256 }).notNull(),
	startsAt: datetime("starts_at", { mode: "string" }).notNull(),
	endsAt: datetime("ends_at", { mode: "string" }).notNull(),
	reason: varchar({ length: 512 }),
	source: varchar({ length: 64 }).default("manual").notNull(),
	externalReference: varchar("external_reference", { length: 512 }),
	createdById: int("created_by_id").notNull(),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("crb_room_start_idx").on(table.room, table.startsAt),
	index("crb_location_start_idx").on(table.location, table.startsAt),
]);

// ─── Gemeinsame Terminabstimmung für Kolloquien ─────────────────────────────
export const colloquiumSchedulingPolls = mysqlTable("colloquium_scheduling_polls", {
	id: int().autoincrement().notNull().primaryKey(),
	thesisRequestId: int("thesis_request_id").notNull(),
	createdById: int("created_by_id").notNull(),
	status: mysqlEnum(["DRAFT", "OPEN", "MATCH_FOUND", "AWAITING_CONFIRMATION", "CONFIRMED", "EXPIRED", "CANCELLED"]).default("DRAFT").notNull(),
	durationMinutes: int("duration_minutes").default(60).notNull(),
	responseDeadline: datetime("response_deadline", { mode: "string" }).notNull(),
	selectedSlotId: int("selected_slot_id"),
	location: varchar({ length: 512 }),
	room: varchar({ length: 256 }),
	onlineLink: varchar("online_link", { length: 1024 }),
	cancellationReason: text("cancellation_reason"),
	/** Heartbeat task UID; Callbacks look up a poll exclusively by this value. */
	scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
	finalizedAt: datetime("finalized_at", { mode: "string" }),
}, (table) => [
	foreignKey({ columns: [table.thesisRequestId], foreignColumns: [thesisRequests.id], name: "csp_thesis_fk" }).onDelete("cascade"),
	index("csp_thesis_status_idx").on(table.thesisRequestId, table.status),
	index("csp_schedule_task_uid_idx").on(table.scheduleCronTaskUid),
]);

export const colloquiumSchedulingParticipants = mysqlTable("colloquium_scheduling_participants", {
	id: int().autoincrement().notNull().primaryKey(),
	pollId: int("poll_id").notNull(),
	userId: int("user_id").notNull(),
	participantRole: mysqlEnum(["student", "first_examiner", "second_examiner"]).notNull(),
	invitedAt: timestamp("invited_at", { mode: "string" }).defaultNow().notNull(),
	lastRespondedAt: datetime("last_responded_at", { mode: "string" }),
	reminderThreeDaysSentAt: datetime("reminder_three_days_sent_at", { mode: "string" }),
	reminderOneDaySentAt: datetime("reminder_one_day_sent_at", { mode: "string" }),
	confirmedAt: datetime("confirmed_at", { mode: "string" }),
	declinedAt: datetime("declined_at", { mode: "string" }),
	declineReason: text("decline_reason"),
}, (table) => [
	foreignKey({ columns: [table.pollId], foreignColumns: [colloquiumSchedulingPolls.id], name: "csp_part_poll_fk" }).onDelete("cascade"),
	uniqueIndex("csp_participant_unique").on(table.pollId, table.userId),
	index("csp_participant_user_idx").on(table.userId),
]);

export const colloquiumSchedulingSlots = mysqlTable("colloquium_scheduling_slots", {
	id: int().autoincrement().notNull().primaryKey(),
	pollId: int("poll_id").notNull(),
	startsAt: datetime("starts_at", { mode: "string" }).notNull(),
	endsAt: datetime("ends_at", { mode: "string" }).notNull(),
	isSelected: tinyint("is_selected").default(0).notNull(),
	createdById: int("created_by_id").notNull(),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [
	foreignKey({ columns: [table.pollId], foreignColumns: [colloquiumSchedulingPolls.id], name: "css_poll_fk" }).onDelete("cascade"),
	index("css_poll_idx").on(table.pollId),
]);

export const colloquiumSchedulingResponses = mysqlTable("colloquium_scheduling_responses", {
	id: int().autoincrement().notNull().primaryKey(),
	slotId: int("slot_id").notNull(),
	participantId: int("participant_id").notNull(),
	availability: mysqlEnum(["YES", "MAYBE", "NO"]).notNull(),
	updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	foreignKey({ columns: [table.slotId], foreignColumns: [colloquiumSchedulingSlots.id], name: "csr_slot_fk" }).onDelete("cascade"),
	foreignKey({ columns: [table.participantId], foreignColumns: [colloquiumSchedulingParticipants.id], name: "csr_participant_fk" }).onDelete("cascade"),
	uniqueIndex("csr_slot_participant_unique").on(table.slotId, table.participantId),
	index("csr_participant_idx").on(table.participantId),
]);

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

// Verwaltungsmitarbeiter:innen haben genau ein Fachbereichsrecht (FB1 bis FB5).
// Die berechtigten Studiengänge werden daraus dynamisch über programmes.fachbereich abgeleitet.
export const adminDepartments = mysqlTable("admin_departments", {
	id: int().autoincrement().notNull(),
	adminUserId: int("admin_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	department: mysqlEnum("department", ["FB1", "FB2", "FB3", "FB4", "FB5"]).notNull(),
	assignedBy: int("assigned_by"),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
},
(table) => [
	index("uq_admin_department").on(table.adminUserId),
	index("idx_admin_department_department").on(table.department),
]);

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
	// HTW-Berlin-Kürzel gelten fachbereichs- und abschlussübergreifend nicht zwingend als eindeutig
	// (z. B. CE für Bachelor und Master). Die Abkürzung bleibt suchbar; eindeutig ist der Stammdatensatz.
	index("idx_programmes_abbreviation").on(table.abbreviation),
	uniqueIndex("uq_programmes_fachbereich_name_level").on(table.fachbereich, table.name, table.level),
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
	// Zeitstempel: offizielles QR-geschütztes Anmeldedokument an Studierende:n versandt
	registrationDocumentSentAt: datetime("registration_document_sent_at", { mode: "string" }),
	// Zeitstempel: wann der Zweitgutachter abgelehnt hat
	secondExaminerRejectedAt: datetime("second_examiner_rejected_at", { mode: "string" }),
	// Optionaler Ablehnungsgrund des Zweitgutachters
	secondExaminerRejectionReason: text("second_examiner_rejection_reason"),
	// Referenz auf das gewählte Prüfer-Thema (optional)
	examinerTopicId: int("examiner_topic_id"),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director']).default('student').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	passwordHash: varchar({ length: 255 }),
	// Optionale Föderationszuordnung für die SAML-2.0-Anmeldung.
	// Das lokale Passwort bleibt unabhängig davon weiterhin verfügbar.
	samlSubject: varchar("saml_subject", { length: 512 }),
	samlIssuer: varchar("saml_issuer", { length: 512 }),
	samlLinkedAt: timestamp("saml_linked_at", { mode: "string" }),
	programmeId: int("programme_id"),
	preferredLanguage: mysqlEnum(['de','en']).default('de').notNull(),
	roleStatus: mysqlEnum(['approved','pending','rejected']).default('approved').notNull(),
	requestedRole: mysqlEnum(['user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director']),
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
	// Optionale Einwilligungen der Studierenden bei der Erstregistrierung
	plagiarismConsent: tinyint("plagiarism_consent").notNull().default(0),
	aiReviewConsent: tinyint("ai_review_consent").notNull().default(0),
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
	uniqueIndex("users_saml_issuer_subject_unique").on(table.samlIssuer, table.samlSubject),
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
  role: mysqlEnum("role", ["user", "admin", "student", "examiner", "second_examiner", "superadmin", "pav", "dean", "vice_dean", "programme_director"]).notNull(),
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

// ─── Regelmäßige Anmelde- und Abgabefristen ───────────────────────────────────
// Ein Eintrag kann als Fachbereichsstandard (programmeId = null) oder als
// studiengangsspezifische Regel für ein Zielsemester hinterlegt werden.
export const programmeSemesterDeadlines = mysqlTable("programme_semester_deadlines", {
  id: int().autoincrement().notNull(),
  department: varchar("department", { length: 8 }).notNull(),
  programmeId: int("programme_id"),
  semester: varchar("semester", { length: 32 }).notNull(),
  registrationDeadline: datetime("registration_deadline", { mode: "string" }).notNull(),
  submissionDeadline: datetime("submission_deadline", { mode: "string" }).notNull(),
  updatedBy: int("updated_by").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("psd_department_semester_idx").on(table.department, table.semester),
  index("psd_programme_semester_idx").on(table.programmeId, table.semester),
]);

// ─── Insert-Typen (werden in db.ts importiert) ────────────────────────────────────────────────
import { InferInsertModel } from "drizzle-orm";
export type InsertUser = InferInsertModel<typeof users>;
export type InsertAuditLogEntry = InferInsertModel<typeof auditLog>;
export type InsertExaminerProfile = InferInsertModel<typeof examinerProfiles>;
export type InsertNotification = InferInsertModel<typeof notifications>;
export type InsertPavExaminerProposal = InferInsertModel<typeof pavExaminerProposals>;
export type InsertThesisRequest = InferInsertModel<typeof thesisRequests>;

export type InsertColloquium = InferInsertModel<typeof colloquiums>;
export type InsertColloquiumSchedulingPoll = InferInsertModel<typeof colloquiumSchedulingPolls>;
export type InsertColloquiumSchedulingParticipant = InferInsertModel<typeof colloquiumSchedulingParticipants>;
export type InsertColloquiumSchedulingSlot = InferInsertModel<typeof colloquiumSchedulingSlots>;
export type InsertColloquiumSchedulingResponse = InferInsertModel<typeof colloquiumSchedulingResponses>;
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
	plagiarismConsent: tinyint("plagiarism_consent").notNull().default(0),
	aiReviewConsent: tinyint("ai_review_consent").notNull().default(0),
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

// ─── Login-Fehler-Protokoll ───────────────────────────────────────────────────
export const loginAttempts = mysqlTable("login_attempts", {
  id: int().autoincrement().notNull().primaryKey(),
  email: varchar({ length: 320 }).notNull(),
  success: tinyint().default(0).notNull(),
  failureReason: varchar("failure_reason", { length: 128 }),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: varchar("user_agent", { length: 512 }),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_la_email").on(table.email),
  index("idx_la_created").on(table.createdAt),
]);
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;
export type SelectLoginAttempt = typeof loginAttempts.$inferSelect;

// ─── Neue Prüfer:innen – Badge-Tracking ──────────────────────────────────────
export const examinerSeenNotifications = mysqlTable("examiner_seen_notifications", {
  id: int().autoincrement().notNull().primaryKey(),
  userId: int("user_id").notNull(),
  lastSeenAt: timestamp("last_seen_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_esn_user").on(table.userId),
]);
export type InsertExaminerSeenNotification = typeof examinerSeenNotifications.$inferInsert;
export type SelectExaminerSeenNotification = typeof examinerSeenNotifications.$inferSelect;

// ─── E-Mail-Benachrichtigungs-Einstellungen ──────────────────────────────────────────────
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int().autoincrement().notNull().primaryKey(),
  userId: int("user_id").notNull(),
  notificationType: varchar("notification_type", { length: 128 }).notNull(),
  enabled: tinyint().default(1).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_np_user").on(table.userId),
  uniqueIndex("idx_np_user_type").on(table.userId, table.notificationType),
]);
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
export type SelectNotificationPreference = typeof notificationPreferences.$inferSelect;
