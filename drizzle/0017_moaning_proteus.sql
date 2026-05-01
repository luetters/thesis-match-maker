CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`html_body` text NOT NULL,
	`text_body` text NOT NULL,
	`placeholders` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updated_by_user_id` int,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_key_unique` UNIQUE(`key`)
);
