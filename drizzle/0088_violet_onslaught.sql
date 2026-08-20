CREATE TABLE `published_thesis_abstracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesis_request_id` int NOT NULL,
	`submitted_by_user_id` int NOT NULL,
	`submission_semester` varchar(32) NOT NULL,
	`title` varchar(512) NOT NULL,
	`department` varchar(255) NOT NULL,
	`abstract` text NOT NULL,
	`publication_consent` tinyint NOT NULL DEFAULT 0,
	`consented_at` datetime,
	`status` enum('PENDING_REVIEW','APPROVED','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'PENDING_REVIEW',
	`reviewed_by_user_id` int,
	`reviewed_at` datetime,
	`review_note` text,
	`published_at` datetime,
	`withdrawn_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `published_thesis_abstracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_published_abstract_thesis` UNIQUE(`thesis_request_id`)
);
--> statement-breakpoint
CREATE INDEX `published_abstract_public_idx` ON `published_thesis_abstracts` (`status`,`department`,`submission_semester`);