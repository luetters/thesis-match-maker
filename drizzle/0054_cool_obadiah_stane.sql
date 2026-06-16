CREATE TABLE `student_registration_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`examiner_id` int NOT NULL,
	`student_email` varchar(320) NOT NULL,
	`email_lang` varchar(4) NOT NULL DEFAULT 'de',
	`used_at` datetime,
	`used_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`expires_at` datetime NOT NULL,
	`revoked` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `student_registration_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_registration_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `student_registration_invitations` ADD CONSTRAINT `student_registration_invitations_examiner_id_users_id_fk` FOREIGN KEY (`examiner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_registration_invitations` ADD CONSTRAINT `student_registration_invitations_used_by_user_id_users_id_fk` FOREIGN KEY (`used_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;