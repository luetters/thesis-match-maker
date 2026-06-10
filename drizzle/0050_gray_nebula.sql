CREATE TABLE `examiner_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`examiner_id` int NOT NULL,
	`note` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `examiner_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `thesis_doc_tokens` ADD `revoked` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `first_name` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` varchar(128);--> statement-breakpoint
ALTER TABLE `examiner_favorites` ADD CONSTRAINT `examiner_favorites_student_id_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `examiner_favorites` ADD CONSTRAINT `examiner_favorites_examiner_id_users_id_fk` FOREIGN KEY (`examiner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;