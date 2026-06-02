CREATE TABLE `examiner_departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`department` varchar(10) NOT NULL,
	`is_primary` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
ALTER TABLE `examiner_departments` ADD CONSTRAINT `examiner_departments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `uq_examiner_dept` ON `examiner_departments` (`user_id`,`department`);