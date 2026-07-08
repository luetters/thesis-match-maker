CREATE TABLE `conditional_document_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`author_id` int NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conditional_document_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `cond_doc_comments`;--> statement-breakpoint
ALTER TABLE `users` ADD `banner_color` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `banner_image_url` text;--> statement-breakpoint
ALTER TABLE `users` ADD `banner_image_key` varchar(512);--> statement-breakpoint
ALTER TABLE `conditional_document_comments` ADD CONSTRAINT `conditional_document_comments_document_id_conditional_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `conditional_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conditional_document_comments` ADD CONSTRAINT `conditional_document_comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;