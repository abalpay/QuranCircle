import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
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
  // Password reset fields
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
}, (table) => {
  return {
    resetTokenIdx: index("users_reset_token_idx").on(table.resetToken),
    emailProviderIdx: index("users_email_provider_idx").on(table.email, table.providerType)
  };
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

// Schema for users created through Google OAuth
export const insertGoogleUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
}).extend({
  providerType: z.literal('google'),
  providerId: z.string(),
  password: z.string().optional().default(''), // Password will be empty for Google users
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
  shortCode: text("short_code").unique(),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
}, (table) => {
  return {
    createdByIdx: index("events_created_by_idx").on(table.createdBy),
    shortCodeIdx: index("events_short_code_idx").on(table.shortCode),
    deadlineIdx: index("events_deadline_idx").on(table.deadline),
    isArchivedIdx: index("events_is_archived_idx").on(table.isArchived)
  };
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
  createdBy: z.number().optional(), // Make createdBy optional since it's set by the server
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Khatms schema
export const khatms = pgTable("khatms", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  khatmNumber: integer("khatm_number").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isArchived: boolean("is_archived").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  deletedAt: timestamp("deleted_at"),
}, (table) => {
  return {
    eventIdIdx: index("khatms_event_id_idx").on(table.eventId),
    eventKhatmNumberIdx: index("khatms_event_khatm_number_idx").on(table.eventId, table.khatmNumber),
    createdAtIdx: index("khatms_created_at_idx").on(table.createdAt),
    isArchivedIdx: index("khatms_is_archived_idx").on(table.isArchived),
    isDeletedIdx: index("khatms_is_deleted_idx").on(table.isDeleted)
  };
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
}, (table) => {
  return {
    khatmIdIdx: index("juzs_khatm_id_idx").on(table.khatmId),
    khatmJuzNumberIdx: index("juzs_khatm_juz_number_idx").on(table.khatmId, table.juzNumber),
    statusIdx: index("juzs_status_idx").on(table.status),
    claimedByUserIdIdx: index("juzs_claimed_by_user_id_idx").on(table.claimedByUserId)
  };
});

// Bookmarks schema
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  eventId: integer("event_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    // Create a composite index for efficient lookups
    userEventIdx: index("bookmarks_user_event_idx").on(table.userId, table.eventId),
    userIdx: index("bookmarks_user_idx").on(table.userId),
    eventIdx: index("bookmarks_event_idx").on(table.eventId)
  };
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

export const unmarkJuzAsReadSchema = z.object({
  khatmId: z.number(),
  juzNumber: z.number(),
});

// For archiving and deleting khatms
export const archiveKhatmSchema = z.object({
  khatmId: z.number(),
});

export const unarchiveKhatmSchema = z.object({
  khatmId: z.number(),
});

export const deleteKhatmSchema = z.object({
  khatmId: z.number(),
});

// For archiving and unarchiving events (circles)
export const archiveEventSchema = z.object({
  eventId: z.number(),
});

export const unarchiveEventSchema = z.object({
  eventId: z.number(),
});

export type InsertJuz = z.infer<typeof insertJuzSchema>;
export type Juz = typeof juzs.$inferSelect;
export type ClaimJuzInput = z.infer<typeof claimJuzSchema>;
export type ClaimMultipleJuzInput = z.infer<typeof claimMultipleJuzSchema>;
export type MarkJuzAsReadInput = z.infer<typeof markJuzAsReadSchema>;
export type UnclaimJuzInput = z.infer<typeof unclaimJuzSchema>;
export type UnmarkJuzAsReadInput = z.infer<typeof unmarkJuzAsReadSchema>;
export type ArchiveKhatmInput = z.infer<typeof archiveKhatmSchema>;
export type UnarchiveKhatmInput = z.infer<typeof unarchiveKhatmSchema>;
export type DeleteKhatmInput = z.infer<typeof deleteKhatmSchema>;
export type ArchiveEventInput = z.infer<typeof archiveEventSchema>;
export type UnarchiveEventInput = z.infer<typeof unarchiveEventSchema>;

// Extended types for API responses
export type KhatmWithJuzs = Khatm & {
  juzs: Juz[];
  claimedCount: number;
  readCount: number;
};

export type EventWithKhatms = Event & {
  khatms: KhatmWithJuzs[];
  creatorName: string;
  isBookmarked?: boolean; // Optional flag to indicate if the event is bookmarked by the current user
};

// Bookmark schemas for API operations
export const insertBookmarkSchema = createInsertSchema(bookmarks).pick({
  userId: true,
  eventId: true,
});

export const bookmarkEventSchema = z.object({
  eventId: z.number(),
});

export const unbookmarkEventSchema = z.object({
  eventId: z.number(),
});

export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type BookmarkEventInput = z.infer<typeof bookmarkEventSchema>;
export type UnbookmarkEventInput = z.infer<typeof unbookmarkEventSchema>;
