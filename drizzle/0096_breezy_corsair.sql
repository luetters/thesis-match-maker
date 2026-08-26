CREATE TABLE `examiner_public_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examiner_id` int NOT NULL,
	`resource_type` enum('template','recommendation') NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`storage_key` varchar(512),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_published` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examiner_public_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_epr_examiner` ON `examiner_public_resources` (`examiner_id`);--> statement-breakpoint
CREATE INDEX `idx_epr_examiner_type` ON `examiner_public_resources` (`examiner_id`,`resource_type`);