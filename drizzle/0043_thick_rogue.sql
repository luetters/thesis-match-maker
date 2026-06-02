CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean') NOT NULL,
	`assigned_by` int,
	`assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `uq_user_role` ON `user_roles` (`user_id`,`role`);
