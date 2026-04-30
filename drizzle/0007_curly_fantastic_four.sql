CREATE TABLE `colloquiums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`scheduled_at` timestamp NOT NULL,
	`location` varchar(512),
	`room` varchar(256),
	`notes` text,
	`status` enum('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colloquiums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `examiner_profiles` ADD `photoUrl` text;--> statement-breakpoint
ALTER TABLE `examiner_profiles` ADD `photoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `examiner_profiles` ADD `researchFocus` text;--> statement-breakpoint
ALTER TABLE `examiner_profiles` ADD `officeHours` varchar(255);--> statement-breakpoint
ALTER TABLE `examiner_profiles` ADD `websiteUrl` varchar(512);