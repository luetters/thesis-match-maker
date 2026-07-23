CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`success` tinyint NOT NULL DEFAULT 0,
	`failure_reason` varchar(128),
	`ip_address` varchar(64),
	`user_agent` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_roles` MODIFY COLUMN `role` enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `requestedRole` enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director');--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `second_examiner_rejection_reason` text;--> statement-breakpoint
CREATE INDEX `idx_la_email` ON `login_attempts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_la_created` ON `login_attempts` (`created_at`);