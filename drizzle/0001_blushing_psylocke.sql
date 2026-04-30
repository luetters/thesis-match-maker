CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thesisRequestId` int NOT NULL,
	`actorId` int,
	`actorRole` varchar(32),
	`action` varchar(128) NOT NULL,
	`fromStatus` varchar(32),
	`toStatus` varchar(32),
	`reason` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examiner_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(64),
	`department` varchar(255),
	`tags` json DEFAULT ('[]'),
	`languages` json DEFAULT ('[]'),
	`studyPrograms` json DEFAULT ('[]'),
	`bio` text,
	`maxSupervisions` int DEFAULT 5,
	`phone` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examiner_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thesis_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`examinerId` int,
	`secondExaminerId` int,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`department` varchar(255) NOT NULL,
	`abstract` text,
	`targetSemester` varchar(32),
	`language` varchar(8) DEFAULT 'de',
	`degreeType` enum('bachelor','master') DEFAULT 'bachelor',
	`status` enum('PENDING','ACCEPTED','REJECTED','MATCHED') NOT NULL DEFAULT 'PENDING',
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `thesis_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','student','examiner') NOT NULL DEFAULT 'student';