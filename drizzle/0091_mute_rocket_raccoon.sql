-- Die vorhandene Projekt-Datenbank besitzt bereits Primärschlüssel für alle
-- anderen Auto-Increment-Tabellen. Vor dem Anlegen wurden die vier fehlenden
-- Tabellen auf doppelte IDs geprüft.
ALTER TABLE `admin_departments` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `examiner_departments` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `programme_semester_deadlines` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `user_roles` ADD PRIMARY KEY(`id`);
