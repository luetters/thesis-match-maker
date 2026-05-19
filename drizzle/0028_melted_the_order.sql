ALTER TABLE `magic_links` MODIFY COLUMN `used` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `matrikel_nr` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `thesis_type` enum('bachelor','master');--> statement-breakpoint
ALTER TABLE `users` ADD `enrollment_semester` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `academic_title` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `office_room` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `target_semester` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `office_hours` text;--> statement-breakpoint
ALTER TABLE `users` ADD `research_tags` text;--> statement-breakpoint
ALTER TABLE `users` ADD `staff_id` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `responsibility_area` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `office_location` varchar(255);