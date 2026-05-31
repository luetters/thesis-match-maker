ALTER TABLE `examiner_semester_capacities` ADD `admin_override` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `examiner_semester_capacities` ADD `admin_override_by` int;--> statement-breakpoint
ALTER TABLE `examiner_semester_capacities` ADD `admin_override_at` datetime;--> statement-breakpoint
ALTER TABLE `examiner_semester_capacities` ADD `admin_max_first` int;--> statement-breakpoint
ALTER TABLE `examiner_semester_capacities` ADD `admin_max_second` int;