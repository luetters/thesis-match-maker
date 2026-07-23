CREATE TABLE `examiner_seen_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`last_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `examiner_seen_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_esn_user` ON `examiner_seen_notifications` (`user_id`);