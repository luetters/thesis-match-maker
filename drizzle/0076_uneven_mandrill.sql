CREATE TABLE `admin_departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`admin_user_id` int NOT NULL,
	`department` enum('FB1','FB2','FB3','FB4','FB5') NOT NULL,
	`assigned_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
ALTER TABLE `admin_departments` ADD CONSTRAINT `admin_departments_admin_user_id_users_id_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `uq_admin_department` ON `admin_departments` (`admin_user_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_department_department` ON `admin_departments` (`department`);
