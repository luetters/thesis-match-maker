ALTER TABLE `users` ADD `two_factor_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_enabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_confirmed_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_last_used_step` int;