ALTER TABLE `users` ADD `roleStatus` enum('approved','pending','rejected') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `requestedRole` enum('user','admin','student','examiner','superadmin','pav','dean','vice_dean');--> statement-breakpoint
ALTER TABLE `users` ADD `roleConfirmedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `roleConfirmedAt` timestamp;