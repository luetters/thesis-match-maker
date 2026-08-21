CREATE TABLE `guide_download_totals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guide_key` varchar(32) NOT NULL,
	`download_count` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guide_download_totals_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_guide_download_key` UNIQUE(`guide_key`)
);
