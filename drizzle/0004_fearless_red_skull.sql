CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('status_change','examiner_assigned','expose_uploaded','system') NOT NULL DEFAULT 'system',
	`read` int NOT NULL DEFAULT 0,
	`thesisRequestId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
