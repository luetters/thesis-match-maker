CREATE TABLE `colloquium_scheduling_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poll_id` int NOT NULL,
	`user_id` int NOT NULL,
	`participantRole` enum('student','first_examiner','second_examiner') NOT NULL,
	`invited_at` timestamp NOT NULL DEFAULT (now()),
	`last_responded_at` datetime,
	`confirmed_at` datetime,
	`declined_at` datetime,
	`decline_reason` text,
	CONSTRAINT `colloquium_scheduling_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `csp_participant_unique` UNIQUE(`poll_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `colloquium_scheduling_polls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`created_by_id` int NOT NULL,
	`status` enum('DRAFT','OPEN','MATCH_FOUND','AWAITING_CONFIRMATION','CONFIRMED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`duration_minutes` int NOT NULL DEFAULT 60,
	`response_deadline` datetime NOT NULL,
	`selected_slot_id` int,
	`location` varchar(512),
	`room` varchar(256),
	`online_link` varchar(1024),
	`cancellation_reason` text,
	`schedule_cron_task_uid` varchar(65),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`finalized_at` datetime,
	CONSTRAINT `colloquium_scheduling_polls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `colloquium_scheduling_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slot_id` int NOT NULL,
	`participant_id` int NOT NULL,
	`availability` enum('YES','MAYBE','NO') NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colloquium_scheduling_responses_id` PRIMARY KEY(`id`),
	CONSTRAINT `csr_slot_participant_unique` UNIQUE(`slot_id`,`participant_id`)
);
--> statement-breakpoint
CREATE TABLE `colloquium_scheduling_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poll_id` int NOT NULL,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime NOT NULL,
	`is_selected` tinyint NOT NULL DEFAULT 0,
	`created_by_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `colloquium_scheduling_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `colloquiums` ADD `online_link` varchar(1024);--> statement-breakpoint
ALTER TABLE `colloquium_scheduling_participants` ADD CONSTRAINT `csp_part_poll_fk` FOREIGN KEY (`poll_id`) REFERENCES `colloquium_scheduling_polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `colloquium_scheduling_polls` ADD CONSTRAINT `csp_thesis_fk` FOREIGN KEY (`thesis_request_id`) REFERENCES `thesis_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `colloquium_scheduling_responses` ADD CONSTRAINT `csr_slot_fk` FOREIGN KEY (`slot_id`) REFERENCES `colloquium_scheduling_slots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `colloquium_scheduling_responses` ADD CONSTRAINT `csr_participant_fk` FOREIGN KEY (`participant_id`) REFERENCES `colloquium_scheduling_participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `colloquium_scheduling_slots` ADD CONSTRAINT `css_poll_fk` FOREIGN KEY (`poll_id`) REFERENCES `colloquium_scheduling_polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `csp_participant_user_idx` ON `colloquium_scheduling_participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `csp_thesis_status_idx` ON `colloquium_scheduling_polls` (`thesis_request_id`,`status`);--> statement-breakpoint
CREATE INDEX `csp_schedule_task_uid_idx` ON `colloquium_scheduling_polls` (`schedule_cron_task_uid`);--> statement-breakpoint
CREATE INDEX `csr_participant_idx` ON `colloquium_scheduling_responses` (`participant_id`);--> statement-breakpoint
CREATE INDEX `css_poll_idx` ON `colloquium_scheduling_slots` (`poll_id`);