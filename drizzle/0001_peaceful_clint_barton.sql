CREATE TABLE `scan_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`interval` varchar(10) NOT NULL,
	`signal` varchar(10) NOT NULL,
	`strength` int NOT NULL DEFAULT 0,
	`currentPrice` text NOT NULL DEFAULT ('0'),
	`rsi` text NOT NULL DEFAULT ('0'),
	`ema12` text NOT NULL DEFAULT ('0'),
	`ema26` text NOT NULL DEFAULT ('0'),
	`status` enum('PENDING','EXECUTED','IGNORED') NOT NULL DEFAULT 'PENDING',
	`note` text,
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	`actionAt` timestamp,
	CONSTRAINT `scan_signals_id` PRIMARY KEY(`id`)
);
