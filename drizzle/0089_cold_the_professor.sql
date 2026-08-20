ALTER TABLE `thesis_requests` ADD `work_type` enum('literature_review','practical_development','lab_experiment','empirical_study','other');--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `work_type_other` varchar(1000);--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `is_cooperation` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `has_confidentiality_notice` tinyint DEFAULT 0 NOT NULL;