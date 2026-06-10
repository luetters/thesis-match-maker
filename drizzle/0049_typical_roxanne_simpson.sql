CREATE TABLE `thesis_doc_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`thesis_request_id` int NOT NULL,
	`student_name` varchar(255) NOT NULL,
	`matrikel_nr` varchar(32),
	`programme_name` varchar(255),
	`title` varchar(512) NOT NULL,
	`first_examiner_name` varchar(255),
	`second_examiner_name` varchar(255),
	`target_semester` varchar(32),
	`degree_type` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `thesis_doc_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `thesis_doc_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `thesis_requests` MODIFY COLUMN `status` enum('PENDING','ACCEPTED','REJECTED','MATCHED','PENDING_FIRST_EXAMINER','PENDING_SECOND_EXAMINER','FIRST_EXAMINER_ACCEPTED','FIRST_EXAMINER_REJECTED','FIRST_EXAMINER_ASSIGNED','SECOND_EXAMINER_ACCEPTED','SECOND_EXAMINER_ASSIGNED','SECOND_EXAMINER_SET','COMPLETED','WITHDRAWN','CANCELLED','DRAFT_BY_EXAMINER','PENDING_STUDENT_CONFIRMATION') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `initiated_by` int;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `initiated_by_role` varchar(32);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `student_invite_token` varchar(128);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `student_invite_email` varchar(320);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `student_invite_sent_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `student_confirmed_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_doc_tokens` ADD CONSTRAINT `thesis_doc_tokens_thesis_request_id_thesis_requests_id_fk` FOREIGN KEY (`thesis_request_id`) REFERENCES `thesis_requests`(`id`) ON DELETE cascade ON UPDATE no action;