-- Add nickname column with a temporary default
ALTER TABLE `user` ADD `nickname` text;
--> statement-breakpoint
-- Update existing rows with a default nickname based on email
UPDATE `user` SET `nickname` = SUBSTR(email, 1, INSTR(email, '@') - 1) || '_' || ABS(RANDOM() % 100000) WHERE `nickname` IS NULL;
--> statement-breakpoint
-- Create unique index
CREATE UNIQUE INDEX `user_nickname_unique` ON `user` (`nickname`);