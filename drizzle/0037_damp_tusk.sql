CREATE TABLE `examiner_semester_capacities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examiner_id` int NOT NULL,
	`semester` varchar(16) NOT NULL,
	`max_first` int NOT NULL DEFAULT 0,
	`max_second` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `uq_esc` ON `examiner_semester_capacities` (`examiner_id`,`semester`);