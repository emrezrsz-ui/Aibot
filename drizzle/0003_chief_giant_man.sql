CREATE TABLE `filter_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mtfTrendFilterEnabled` boolean NOT NULL DEFAULT false,
	`volumeConfirmationEnabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filter_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `filter_configs` ADD CONSTRAINT `filter_configs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;