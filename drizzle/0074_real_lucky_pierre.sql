ALTER TABLE `thesis_doc_tokens` ADD `plagiarism_consent` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `thesis_doc_tokens` ADD `ai_review_consent` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `plagiarism_consent` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `ai_review_consent` tinyint DEFAULT 0 NOT NULL;