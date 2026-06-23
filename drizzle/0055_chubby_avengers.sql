ALTER TABLE `thesis_doc_tokens` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `thesis_doc_tokens` DROP COLUMN `createdAt`;