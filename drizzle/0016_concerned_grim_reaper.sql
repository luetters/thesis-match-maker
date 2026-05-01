CREATE TABLE `pav_examiner_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`proposed_by_pav_id` int NOT NULL,
	`examiner_id` int NOT NULL,
	`examiner_role` enum('first','second') NOT NULL,
	`status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`email_sent_at` timestamp,
	`responded_at` timestamp,
	`decline_reason` text,
	`action_token` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pav_examiner_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pav_programmes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pav_user_id` int NOT NULL,
	`programme_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pav_programmes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','student','examiner','superadmin','pav','dean','vice_dean') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `thesis_requests` ADD `hasOwnTopic` int DEFAULT 1 NOT NULL;