CREATE TABLE `examiner_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examiner_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`valid_from_semester` varchar(16),
	`valid_until_semester` varchar(16),
	`degree_type` enum('bachelor','master'),
	`language` enum('de','en','both') NOT NULL DEFAULT 'de',
	`is_active` tinyint NOT NULL DEFAULT 1,
	`allow_multiple` tinyint NOT NULL DEFAULT 1,
	`max_assignments` int,
	`tags` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `examiner_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `withdrawal_reason` text;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `second_examiner_invite_token` varchar(128);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `second_examiner_invite_sent_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `second_examiner_rejected_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `examiner_topic_id` int;--> statement-breakpoint
ALTER TABLE `examiner_topics` ADD CONSTRAINT `examiner_topics_examiner_id_users_id_fk` FOREIGN KEY (`examiner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;