CREATE TABLE `two_factor_reminder_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`requirement_updated_at` timestamp NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `two_factor_reminder_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tfre_user_requirement` UNIQUE(`user_id`,`requirement_updated_at`)
);
--> statement-breakpoint
CREATE INDEX `idx_tfre_user` ON `two_factor_reminder_emails` (`user_id`);