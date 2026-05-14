CREATE TABLE `reminder_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`reminder_type` enum('PENDING_REMINDER_3DAYS','PENDING_REMINDER_7DAYS','PENDING_REMINDER_14DAYS','STUDENT_DEADLINE_REMINDER','EXAMINER_CAPACITY_WARNING') NOT NULL,
	`scheduled_at` timestamp NOT NULL,
	`sent_at` timestamp,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`failure_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminder_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminder_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(64) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`html_body` text NOT NULL,
	`text_body` text NOT NULL,
	`delay_days` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updated_by_user_id` int,
	CONSTRAINT `reminder_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_templates_type_unique` UNIQUE(`type`)
);
