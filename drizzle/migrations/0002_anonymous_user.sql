INSERT OR IGNORE INTO `users` (
	`id`,
	`name`,
	`email`,
	`email_verified`,
	`plan`,
	`ai_usage_this_month`,
	`created_at`,
	`updated_at`
)
VALUES (
	'anonymous',
	'Anonymous',
	'anonymous@holdingskit.internal',
	0,
	'free',
	0,
	(unixepoch() * 1000),
	(unixepoch() * 1000)
);
