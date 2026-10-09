CREATE TABLE `quests` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`xp` integer NOT NULL,
	`minutes` integer NOT NULL,
	`done_at` text
);
