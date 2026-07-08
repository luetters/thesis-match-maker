ALTER TABLE `thesis_requests` ADD `external_second_examiner_title` varchar(64);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `external_second_examiner_first_name` varchar(128);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `external_second_examiner_last_name` varchar(128);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `external_second_examiner_email` varchar(320);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `second_examiner_requested_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `second_examiner_accepted_at` datetime;