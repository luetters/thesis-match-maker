CREATE TABLE `examiner_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`examiner_id` int NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `examiner_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `examiner_comments` ADD CONSTRAINT `examiner_comments_thesis_request_id_thesis_requests_id_fk` FOREIGN KEY (`thesis_request_id`) REFERENCES `thesis_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `examiner_comments` ADD CONSTRAINT `examiner_comments_examiner_id_users_id_fk` FOREIGN KEY (`examiner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;