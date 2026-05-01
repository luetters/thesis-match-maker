CREATE TABLE `examiner_programmes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examiner_id` int NOT NULL,
	`programme_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examiner_programmes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programmes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`abbreviation` varchar(32) NOT NULL,
	`level` enum('bachelor','master') NOT NULL,
	`pictogram_url` varchar(512),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `programmes_id` PRIMARY KEY(`id`),
	CONSTRAINT `programmes_abbreviation_unique` UNIQUE(`abbreviation`)
);
