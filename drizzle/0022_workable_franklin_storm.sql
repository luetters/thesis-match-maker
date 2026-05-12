CREATE TABLE `examiner_action_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`examiner_id` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`action` enum('accept','reject'),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `examiner_action_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `examiner_action_tokens_token_unique` UNIQUE(`token`)
);
