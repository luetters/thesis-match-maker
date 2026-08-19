ALTER TABLE `faq_feedback` MODIFY COLUMN `status` enum('NEW','REVIEWED','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'NEW';--> statement-breakpoint
ALTER TABLE `faq_feedback` ADD `answer` text;--> statement-breakpoint
ALTER TABLE `faq_feedback` ADD `published_faq_key` varchar(64);--> statement-breakpoint
ALTER TABLE `faq_feedback` ADD `published_at` timestamp;