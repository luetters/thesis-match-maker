ALTER TABLE `thesis_requests` ADD `plagiarism_consent` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `ai_review_consent` tinyint DEFAULT 0 NOT NULL;