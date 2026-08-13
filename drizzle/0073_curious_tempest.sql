DROP INDEX `abbreviation` ON `programmes`;--> statement-breakpoint
ALTER TABLE `programmes` ADD CONSTRAINT `uq_programmes_fachbereich_name_level` UNIQUE(`fachbereich`,`name`,`level`);--> statement-breakpoint
CREATE INDEX `idx_programmes_abbreviation` ON `programmes` (`abbreviation`);