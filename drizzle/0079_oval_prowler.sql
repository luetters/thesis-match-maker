CREATE TABLE `programme_semester_deadlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department` varchar(8) NOT NULL,
	`programme_id` int,
	`semester` varchar(32) NOT NULL,
	`registration_deadline` datetime NOT NULL,
	`submission_deadline` datetime NOT NULL,
	`updated_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `psd_department_semester_idx` ON `programme_semester_deadlines` (`department`,`semester`);--> statement-breakpoint
CREATE INDEX `psd_programme_semester_idx` ON `programme_semester_deadlines` (`programme_id`,`semester`);