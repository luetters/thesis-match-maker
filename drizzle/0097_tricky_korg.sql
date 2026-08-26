CREATE TABLE `programme_content_managers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programme_id` int NOT NULL,
	`user_id` int NOT NULL,
	`manager_type` enum('speaker','admin') NOT NULL,
	`assigned_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `programme_content_managers_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pcm_programme_user_type` UNIQUE(`programme_id`,`user_id`,`manager_type`)
);
--> statement-breakpoint
CREATE TABLE `programme_public_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programme_id` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_by` int NOT NULL,
	`updated_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programme_public_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `programmes` ADD `information` text;--> statement-breakpoint
ALTER TABLE `programmes` ADD `logo_url` varchar(512);--> statement-breakpoint
ALTER TABLE `programmes` ADD `logo_key` varchar(512);--> statement-breakpoint
ALTER TABLE `programmes` ADD `is_published` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `programmes` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `idx_pcm_user` ON `programme_content_managers` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_pcm_programme` ON `programme_content_managers` (`programme_id`);--> statement-breakpoint
CREATE INDEX `idx_ppl_programme` ON `programme_public_links` (`programme_id`,`sort_order`);