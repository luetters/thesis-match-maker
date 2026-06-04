CREATE TABLE `deadline_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`previous_deadline` datetime,
	`new_deadline` datetime NOT NULL,
	`reason` text NOT NULL,
	`changed_by` int NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `official_registration_status` enum('not_registered','registered','admitted','case_closed') DEFAULT 'not_registered' NOT NULL;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `official_registration_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `official_registration_by` int;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `admission_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `admission_by` int;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `admission_note` text;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `submission_deadline` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `defense_date` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `defense_date_set_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `defense_date_set_by` int;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `case_closed_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `case_closed_by` int;--> statement-breakpoint
ALTER TABLE `deadline_changes` ADD CONSTRAINT `deadline_changes_thesis_request_id_thesis_requests_id_fk` FOREIGN KEY (`thesis_request_id`) REFERENCES `thesis_requests`(`id`) ON DELETE cascade ON UPDATE no action;