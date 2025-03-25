-- Add short_code column to events table
ALTER TABLE "events" ADD COLUMN "short_code" text;
ALTER TABLE "events" ADD CONSTRAINT "events_short_code_unique" UNIQUE("short_code");