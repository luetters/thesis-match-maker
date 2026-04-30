CREATE TABLE `magic_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(128) NOT NULL,
	`role` enum('student','examiner','admin','user') NOT NULL DEFAULT 'student',
	`used` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `magic_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` MODIFY COLUMN `thesisRequestId` int;