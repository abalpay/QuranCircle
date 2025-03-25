CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"deadline" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"short_code" text,
	CONSTRAINT "events_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "juzs" (
	"id" serial PRIMARY KEY NOT NULL,
	"khatm_id" integer NOT NULL,
	"juz_number" integer NOT NULL,
	"claimed_by_name" text,
	"claimed_by_user_id" integer,
	"status" text DEFAULT 'unclaimed' NOT NULL,
	"claimed_at" timestamp,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "khatms" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"khatm_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"provider_type" text,
	"provider_id" text,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
