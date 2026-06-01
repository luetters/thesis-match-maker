ALTER TABLE `thesis_requests` ADD `enrollment_eligibility` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `enrollment_eligibility_note` text;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `enrollment_eligibility_checked_by` int;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `enrollment_eligibility_checked_at` datetime;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `defense_eligibility` enum('not_applicable','pending','approved','blocked') DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `defense_eligibility_note` text;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `defense_eligibility_checked_by` int;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `defense_eligibility_checked_at` datetime;