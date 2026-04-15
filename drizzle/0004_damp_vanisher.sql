ALTER TABLE `scan_signals` ADD `hasDivergence` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `scan_signals` ADD `divergenceType` varchar(20);--> statement-breakpoint
ALTER TABLE `scan_signals` ADD `divergenceStrength` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scan_signals` ADD `confluenceCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `scan_signals` ADD `confluenceTimeframes` varchar(50);--> statement-breakpoint
ALTER TABLE `scan_signals` ADD `confluenceBonus` int DEFAULT 0 NOT NULL;