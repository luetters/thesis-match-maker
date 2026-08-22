ALTER TABLE `conditional_document_comments` DROP FOREIGN KEY `conditional_document_comments_document_id_conditional_documents_id_fk`;
--> statement-breakpoint
ALTER TABLE `conditional_document_comments` DROP FOREIGN KEY `conditional_document_comments_author_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `conditional_document_comments` ADD CONSTRAINT `cdc_doc_fk` FOREIGN KEY (`document_id`) REFERENCES `conditional_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conditional_document_comments` ADD CONSTRAINT `cdc_author_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;