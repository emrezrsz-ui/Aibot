CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`type` enum('BUY','SELL') NOT NULL,
	`entryPrice` decimal(20,8) NOT NULL,
	`quantity` decimal(20,8) NOT NULL,
	`takeProfit` decimal(20,8) NOT NULL,
	`stopLoss` decimal(20,8) NOT NULL,
	`closePrice` decimal(20,8),
	`status` enum('OPEN','CLOSED','CANCELLED') NOT NULL DEFAULT 'OPEN',
	`trailingStopLevel` decimal(20,8),
	`trailingStopStatus` enum('NONE','BREAK_EVEN','SECURED') NOT NULL DEFAULT 'NONE',
	`demoMode` boolean NOT NULL DEFAULT true,
	`signalStrength` int NOT NULL DEFAULT 0,
	`profitLoss` decimal(20,8),
	`profitLossPercent` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trades` ADD CONSTRAINT `trades_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;