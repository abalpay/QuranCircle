import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  // Columns for SSO
  providerType: text("provider_type"), // 'google', 'github', etc
  providerId: text("provider_id"),     // User ID from the provider
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Events schema
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  deadline: timestamp("deadline"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create the basic schema from Drizzle ORM
const baseInsertEventSchema = createInsertSchema(events).pick({
  name: true,
  description: true,
  isPublic: true,
  deadline: true,
  createdBy: true,
});

// Extend the schema with custom transformations for the deadline field
export const insertEventSchema = baseInsertEventSchema.extend({
  deadline: z.union([
    z.date(),
    z.string().transform((str) => str ? new Date(str) : null),
    z.null()
  ]).optional(),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Khatms schema
export const khatms = pgTable("khatms", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  khatmNumber: integer("khatm_number").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertKhatmSchema = createInsertSchema(khatms).pick({
  eventId: true,
  khatmNumber: true,
});

export type InsertKhatm = z.infer<typeof insertKhatmSchema>;
export type Khatm = typeof khatms.$inferSelect;

// Juz schema
export const juzs = pgTable("juzs", {
  id: serial("id").primaryKey(),
  khatmId: integer("khatm_id").notNull(),
  juzNumber: integer("juz_number").notNull(),
  claimedByName: text("claimed_by_name"),
  claimedByUserId: integer("claimed_by_user_id"),
  status: text("status").notNull().default("unclaimed"),
  claimedAt: timestamp("claimed_at"),
  readAt: timestamp("read_at"),
});

export const insertJuzSchema = createInsertSchema(juzs).pick({
  khatmId: true,
  juzNumber: true,
  claimedByName: true,
  claimedByUserId: true,
  status: true,
});

// For API requests to claim/unclaim
export const claimJuzSchema = z.object({
  khatmId: z.number(),
  juzNumber: z.number(),
  claimerName: z.string().min(2, "Name must be at least 2 characters"),
});

// For claiming multiple Juz at once
export const claimMultipleJuzSchema = z.object({
  khatmId: z.number(),
  juzNumbers: z.array(z.number()),
  claimerName: z.string().min(2, "Name must be at least 2 characters"),
});

export const markJuzAsReadSchema = z.object({
  khatmId: z.number(),
  juzNumber: z.number(),
});

export const unclaimJuzSchema = z.object({
  khatmId: z.number(),
  juzNumber: z.number(),
});

export type InsertJuz = z.infer<typeof insertJuzSchema>;
export type Juz = typeof juzs.$inferSelect;
export type ClaimJuzInput = z.infer<typeof claimJuzSchema>;
export type ClaimMultipleJuzInput = z.infer<typeof claimMultipleJuzSchema>;
export type MarkJuzAsReadInput = z.infer<typeof markJuzAsReadSchema>;
export type UnclaimJuzInput = z.infer<typeof unclaimJuzSchema>;

// Extended types for API responses
export type KhatmWithJuzs = Khatm & {
  juzs: Juz[];
  claimedCount: number;
  readCount: number;
};

export type EventWithKhatms = Event & {
  khatms: KhatmWithJuzs[];
  creatorName: string;
};
