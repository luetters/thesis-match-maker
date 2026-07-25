CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`notification_type` varchar(128) NOT NULL,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_np_user_type` UNIQUE(`user_id`,`notification_type`)
);
--> statement-breakpoint
CREATE INDEX `idx_np_user` ON `notification_preferences` (`user_id`);