CREATE TABLE `faq_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message` text NOT NULL,
	`audience` varchar(32) NOT NULL,
	`language` varchar(2) NOT NULL,
	`status` enum('NEW','REVIEWED','ARCHIVED') NOT NULL DEFAULT 'NEW',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faq_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faq_rating_totals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faq_key` varchar(64) NOT NULL,
	`helpful_count` int NOT NULL DEFAULT 0,
	`not_helpful_count` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faq_rating_totals_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_faq_rating_key` UNIQUE(`faq_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_faq_feedback_status_created` ON `faq_feedback` (`status`,`created_at`);