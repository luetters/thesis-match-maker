ALTER TABLE `users` ADD `saml_subject` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `saml_issuer` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `saml_linked_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_saml_issuer_subject_unique` UNIQUE(`saml_issuer`,`saml_subject`);