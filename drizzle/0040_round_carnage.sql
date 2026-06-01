ALTER TABLE `colloquiums` ADD `is_repeat_colloquium` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `colloquiums` ADD `repeat_reason` varchar(512);