-- AUTO_INCREMENT-Spalten benötigen in MySQL dauerhaft einen Schlüssel.
-- Die historischen DROP PRIMARY KEY-Anweisungen waren für eine frische
-- MySQL-Zielumgebung ungültig und werden bewusst nicht ausgeführt.
-- IF EXISTS macht den erneuten Lauf nach einem unterbrochenen Schema-Bootstrap sicher.
ALTER TABLE `email_templates` DROP INDEX IF EXISTS `email_templates_key_unique`;--> statement-breakpoint
ALTER TABLE `examiner_action_tokens` DROP INDEX IF EXISTS `examiner_action_tokens_token_unique`;--> statement-breakpoint
ALTER TABLE `magic_links` DROP INDEX IF EXISTS `magic_links_token_unique`;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` DROP INDEX IF EXISTS `password_reset_tokens_token_unique`;--> statement-breakpoint
ALTER TABLE `programmes` DROP INDEX IF EXISTS `programmes_abbreviation_unique`;--> statement-breakpoint
ALTER TABLE `reminder_templates` DROP INDEX IF EXISTS `reminder_templates_type_unique`;--> statement-breakpoint
ALTER TABLE `system_settings` DROP INDEX IF EXISTS `system_settings_key_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX IF EXISTS `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `thesisRequestId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `colloquiums` MODIFY COLUMN `scheduled_at` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `colloquiums` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `examiner_action_tokens` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `examiner_profiles` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `examiner_programmes` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `magic_links` MODIFY COLUMN `used` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `magic_links` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `password_reset_tokens` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `pav_examiner_proposals` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `pav_programmes` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `programmes` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `reminder_schedules` MODIFY COLUMN `reminder_type` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `reminder_schedules` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `reminder_templates` MODIFY COLUMN `subject` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `reminder_templates` MODIFY COLUMN `html_body` text;--> statement-breakpoint
ALTER TABLE `reminder_templates` MODIFY COLUMN `text_body` text;--> statement-breakpoint
ALTER TABLE `reminder_templates` MODIFY COLUMN `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `saved_filters` MODIFY COLUMN `filter_config` text NOT NULL;--> statement-breakpoint
ALTER TABLE `saved_filters` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `thesis_requests` MODIFY COLUMN `deadline` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` MODIFY COLUMN `status` enum('PENDING','ACCEPTED','REJECTED','MATCHED') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `thesis_requests` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` ADD `programme_id` int;--> statement-breakpoint
ALTER TABLE `colloquiums` ADD CONSTRAINT `colloquiums_thesis_request_id_thesis_requests_id_fk` FOREIGN KEY (`thesis_request_id`) REFERENCES `thesis_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `key` ON `email_templates` (`key`);--> statement-breakpoint
CREATE INDEX `token` ON `examiner_action_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `uq_ep` ON `examiner_programmes` (`examiner_id`,`programme_id`);--> statement-breakpoint
CREATE INDEX `token` ON `magic_links` (`token`);--> statement-breakpoint
CREATE INDEX `token` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `abbreviation` ON `programmes` (`abbreviation`);--> statement-breakpoint
CREATE INDEX `key` ON `system_settings` (`key`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
ALTER TABLE `reminder_schedules` DROP COLUMN `failure_reason`;--> statement-breakpoint
ALTER TABLE `reminder_schedules` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `reminder_templates` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `reminder_templates` DROP COLUMN `updated_by_user_id`;--> statement-breakpoint
ALTER TABLE `saved_filters` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `thesis_requests` DROP COLUMN `wantedExaminerId`;--> statement-breakpoint
ALTER TABLE `thesis_requests` DROP COLUMN `withdrawnAt`;
