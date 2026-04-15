CREATE TABLE `trading_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`botStatus` enum('ON','OFF') NOT NULL DEFAULT 'OFF',
	`demoMode` boolean NOT NULL DEFAULT true,
	`slippageTolerance` decimal(5,2) NOT NULL DEFAULT '0.5',
	`maxTradeSize` decimal(15,2) NOT NULL DEFAULT '1000',
	`demoBalance` decimal(15,2) NOT NULL DEFAULT '10000',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exchange` varchar(50) NOT NULL,
	`apiKey` text NOT NULL,
	`apiSecret` text NOT NULL,
	`webhookUrl` text,
	`status` enum('ACTIVE','INACTIVE','ERROR') NOT NULL DEFAULT 'INACTIVE',
	`lastTestedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trading_configs` ADD CONSTRAINT `trading_configs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_connections` ADD CONSTRAINT `user_connections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;