CREATE TABLE `conditional_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`uploaded_by_user_id` int NOT NULL,
	`original_filename` varchar(512) NOT NULL,
	`storage_key` varchar(1024) NOT NULL,
	`storage_url` varchar(2048) NOT NULL,
	`mime_type` varchar(128) NOT NULL DEFAULT 'application/pdf',
	`file_size_bytes` int,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conditional_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conditional_documents` ADD CONSTRAINT `conditional_documents_thesis_request_id_thesis_requests_id_fk` FOREIGN KEY (`thesis_request_id`) REFERENCES `thesis_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conditional_documents` ADD CONSTRAINT `conditional_documents_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;