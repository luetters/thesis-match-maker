CREATE TABLE `colloquium_room_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location` varchar(512),
	`room` varchar(256) NOT NULL,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime NOT NULL,
	`reason` varchar(512),
	`source` varchar(64) NOT NULL DEFAULT 'manual',
	`external_reference` varchar(512),
	`created_by_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colloquium_room_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `crb_room_start_idx` ON `colloquium_room_blocks` (`room`,`starts_at`);--> statement-breakpoint
CREATE INDEX `crb_location_start_idx` ON `colloquium_room_blocks` (`location`,`starts_at`);