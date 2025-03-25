import { 
  users, type User, type InsertUser,
  events, type Event, type InsertEvent,
  khatms, type Khatm, type InsertKhatm,
  juzs, type Juz, type InsertJuz,
  type KhatmWithJuzs, type EventWithKhatms
} from "@shared/schema";

import { IStorage } from "./storage";
import { db, eq, and, sql, desc } from "./db";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "./db";

// PostgreSQL Session Store
const PgSessionStore = pgSession(session);

export class PgStorage implements IStorage {
  // Session store for PostgreSQL
  sessionStore: any;

  constructor() {
    // Create session store
    this.sessionStore = new PgSessionStore({
      pool: pool,
      tableName: 'session'
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<User | undefined> {
    const result = await db.update(users)
      .set({
        resetToken: token,
        resetTokenExpiry: expiry
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const result = await db.select()
      .from(users)
      .where(eq(users.resetToken, token));
    
    if (!result[0] || !result[0].resetTokenExpiry) return undefined;
    
    const isExpired = result[0].resetTokenExpiry < new Date();
    if (isExpired) return undefined;
    
    return result[0];
  }

  // Event Methods
  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }
  
  async getEventByShortCode(shortCode: string): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.shortCode, shortCode));
    return result[0];
  }
  
  async setEventShortCode(id: number, shortCode: string): Promise<Event | undefined> {
    const result = await db.update(events)
      .set({ shortCode })
      .where(eq(events.id, id))
      .returning();
    return result[0];
  }

  async getEventWithKhatms(id: number): Promise<EventWithKhatms | undefined> {
    // Get the event
    const eventResult = await db.select().from(events).where(eq(events.id, id));
    if (!eventResult.length) return undefined;
    const event = eventResult[0];
    
    // Get the creator's username
    const creatorResult = await db.select().from(users).where(eq(users.id, event.createdBy));
    const creatorName = creatorResult.length ? creatorResult[0].username : "Unknown";
    
    // Get all khatms for this event
    const khatmsResult = await db.select().from(khatms).where(eq(khatms.eventId, id));
    
    // Prepare to track khatm statistics and juzs
    const khatmsWithJuzs: KhatmWithJuzs[] = [];
    
    // For each khatm, get its juzs and calculate stats
    for (const khatm of khatmsResult) {
      const juzsResult = await db.select().from(juzs).where(eq(juzs.khatmId, khatm.id));
      
      // Calculate statistics
      const claimedCount = juzsResult.filter(juz => juz.status !== 'unclaimed').length;
      const readCount = juzsResult.filter(juz => juz.status === 'read').length;
      
      khatmsWithJuzs.push({
        ...khatm,
        juzs: juzsResult,
        claimedCount,
        readCount
      });
    }
    
    // Sort khatms by khatmNumber
    khatmsWithJuzs.sort((a, b) => a.khatmNumber - b.khatmNumber);
    
    // Return the combined event with khatms
    return {
      ...event,
      khatms: khatmsWithJuzs,
      creatorName
    };
  }

  async getEventsByUser(userId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.createdBy, userId));
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.createdAt));
  }

  async updateEvent(id: number, updates: Partial<Event>): Promise<Event | undefined> {
    const result = await db.update(events)
      .set(updates)
      .where(eq(events.id, id))
      .returning();
    return result[0];
  }

  // Khatm Methods
  async createKhatm(khatm: InsertKhatm): Promise<Khatm> {
    const result = await db.insert(khatms).values(khatm).returning();
    return result[0];
  }

  async getKhatm(id: number): Promise<Khatm | undefined> {
    const result = await db.select().from(khatms).where(eq(khatms.id, id));
    return result[0];
  }

  async getKhatmWithJuzs(id: number): Promise<KhatmWithJuzs | undefined> {
    const khatmResult = await db.select().from(khatms).where(eq(khatms.id, id));
    if (!khatmResult.length) return undefined;
    
    const khatm = khatmResult[0];
    const juzsResult = await db.select().from(juzs).where(eq(juzs.khatmId, id));
    
    // Calculate statistics
    const claimedCount = juzsResult.filter(juz => juz.status !== 'unclaimed').length;
    const readCount = juzsResult.filter(juz => juz.status === 'read').length;
    
    return {
      ...khatm,
      juzs: juzsResult,
      claimedCount,
      readCount
    };
  }

  async getKhatmsByEventId(eventId: number): Promise<Khatm[]> {
    return await db.select()
      .from(khatms)
      .where(
        and(
          eq(khatms.eventId, eventId),
          eq(khatms.isDeleted, false)
        )
      )
      .orderBy(khatms.khatmNumber);
  }
  
  async archiveKhatm(id: number): Promise<Khatm | undefined> {
    const now = new Date();
    const result = await db.update(khatms)
      .set({
        isArchived: true,
        archivedAt: now
      })
      .where(eq(khatms.id, id))
      .returning();
    return result[0];
  }
  
  async unarchiveKhatm(id: number): Promise<Khatm | undefined> {
    const result = await db.update(khatms)
      .set({
        isArchived: false,
        archivedAt: null
      })
      .where(eq(khatms.id, id))
      .returning();
    return result[0];
  }
  
  async deleteKhatm(id: number): Promise<Khatm | undefined> {
    const now = new Date();
    const result = await db.update(khatms)
      .set({
        isDeleted: true,
        deletedAt: now
      })
      .where(eq(khatms.id, id))
      .returning();
    return result[0];
  }

  // Juz Methods
  async createJuz(juz: InsertJuz): Promise<Juz> {
    const result = await db.insert(juzs).values(juz).returning();
    return result[0];
  }

  async getJuz(khatmId: number, juzNumber: number): Promise<Juz | undefined> {
    const result = await db.select()
      .from(juzs)
      .where(
        and(
          eq(juzs.khatmId, khatmId),
          eq(juzs.juzNumber, juzNumber)
        )
      );
    return result[0];
  }

  async getJuzsByKhatmId(khatmId: number): Promise<Juz[]> {
    return await db.select().from(juzs).where(eq(juzs.khatmId, khatmId));
  }

  async updateJuz(khatmId: number, juzNumber: number, updates: Partial<Juz>): Promise<Juz | undefined> {
    const result = await db.update(juzs)
      .set(updates)
      .where(
        and(
          eq(juzs.khatmId, khatmId),
          eq(juzs.juzNumber, juzNumber)
        )
      )
      .returning();
    return result[0];
  }

  // Batch operations
  async createAllJuzForKhatm(khatmId: number): Promise<void> {
    const juzsToCreate = [];
    
    // Create 30 juzs (1-30) for the given khatm
    for (let i = 1; i <= 30; i++) {
      juzsToCreate.push({
        khatmId,
        juzNumber: i,
        status: 'unclaimed'
      });
    }
    
    await db.insert(juzs).values(juzsToCreate);
  }

  async checkAndCreateNewKhatm(eventId: number): Promise<Khatm | undefined> {
    // Get all khatms for this event
    const khatmsResult = await db.select().from(khatms).where(eq(khatms.eventId, eventId));
    
    // Check if each khatm has all juzs claimed
    for (const khatm of khatmsResult) {
      const juzsResult = await db.select().from(juzs).where(eq(juzs.khatmId, khatm.id));
      
      // If not all juzs are claimed, no need to create a new khatm
      if (juzsResult.some(juz => juz.status === 'unclaimed')) {
        return undefined;
      }
    }
    
    // If all khatms have all juzs claimed, create a new one
    const newKhatmNumber = khatmsResult.length + 1;
    const newKhatm = await this.createKhatm({
      eventId,
      khatmNumber: newKhatmNumber
    });
    
    // Create all 30 juzs for the new khatm
    await this.createAllJuzForKhatm(newKhatm.id);
    
    return newKhatm;
  }
}

// Export an instance of our PostgreSQL storage
export const pgStorage = new PgStorage();