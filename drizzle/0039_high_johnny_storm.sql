CREATE TABLE `examiner_email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examiner_id` int NOT NULL,
	`template_type` enum('requirements','acceptance','rejection','fully_booked') NOT NULL,
	`subject` varchar(255) NOT NULL DEFAULT '',
	`body` text NOT NULL DEFAULT (''),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_examiner_email_tpl` ON `examiner_email_templates` (`examiner_id`,`template_type`);