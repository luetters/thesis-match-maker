CREATE TABLE `two_factor_recovery_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`code_hash` varchar(255) NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `two_factor_recovery_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_tfrc_user` ON `two_factor_recovery_codes` (`user_id`);