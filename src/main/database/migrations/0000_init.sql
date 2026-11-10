CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL,
	`category` text NOT NULL,
	`xp_reward` integer NOT NULL,
	`threshold` integer NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`scope_id` text,
	`title` text NOT NULL,
	`exercise_ids` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`time_limit_sec` integer,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`score` integer,
	`passed` integer DEFAULT false NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assessments_user_kind_idx` ON `assessments` (`user_id`,`kind`,`scope_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`solved` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exercise_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`is_correct` integer NOT NULL,
	`answer` text NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`context` text DEFAULT 'practice' NOT NULL,
	`assessment_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_user_time_idx` ON `exercise_attempts` (`user_id`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `attempts_user_exercise_idx` ON `exercise_attempts` (`user_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercise_progress` (
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_attempts` integer DEFAULT 0 NOT NULL,
	`failed_since_solve` integer DEFAULT 0 NOT NULL,
	`first_solved_at` integer,
	`first_try` integer DEFAULT false NOT NULL,
	`last_attempt_at` integer,
	`best_time_ms` integer,
	`draft` text,
	`solution_revealed` integer DEFAULT false NOT NULL,
	`xp_earned` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `exercise_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `progress_user_status_idx` ON `exercise_progress` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `progress_user_updated_idx` ON `exercise_progress` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`course_id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`difficulty` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`dataset` text NOT NULL,
	`xp` integer NOT NULL,
	`minutes` integer NOT NULL,
	`tags` text NOT NULL,
	`content_hash` text NOT NULL,
	`payload` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercises_module_idx` ON `exercises` (`module_id`);--> statement-breakpoint
CREATE INDEX `exercises_course_idx` ON `exercises` (`course_id`);--> statement-breakpoint
CREATE INDEX `exercises_type_idx` ON `exercises` (`type`);--> statement-breakpoint
CREATE INDEX `exercises_difficulty_idx` ON `exercises` (`difficulty`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `exercise_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `learning_sessions_user_idx` ON `learning_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `modules` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`theory` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `modules_course_idx` ON `modules` (`course_id`);--> statement-breakpoint
CREATE TABLE `query_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`dataset` text NOT NULL,
	`sql` text NOT NULL,
	`executed_at` integer NOT NULL,
	`success` integer NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`error` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `query_history_user_idx` ON `query_history` (`user_id`,`executed_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `achievement_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_notes` (
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `exercise_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'ru' NOT NULL,
	`daily_goal` integer DEFAULT 50 NOT NULL,
	`editor_font_size` integer DEFAULT 14 NOT NULL,
	`editor_minimap` integer DEFAULT false NOT NULL,
	`editor_word_wrap` integer DEFAULT true NOT NULL,
	`auto_save_drafts` integer DEFAULT true NOT NULL,
	`reduce_motion` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`username_normalized` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`password_hash` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`avatar_color` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_login_at` integer,
	`level` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`learning_seconds` integer DEFAULT 0 NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_active_date` text,
	`last_exercise_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email_normalized`);