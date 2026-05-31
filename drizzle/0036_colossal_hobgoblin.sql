CREATE TABLE `examiner_commission_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`first_examiner_id` int NOT NULL,
	`second_examiner_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `wanted_second_examiner_id` int;--> statement-breakpoint
CREATE INDEX `uq_ecp` ON `examiner_commission_preferences` (`first_examiner_id`,`second_examiner_id`);