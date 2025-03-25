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
    // Make sure we have a valid object with the required fields
    const eventData = {
      name: event.name,
      description: event.description,
      isPublic: event.isPublic,
      deadline: event.deadline,
      createdBy: event.createdBy || 0 // Default to 0 if createdBy is not provided
    };
    
    const result = await db.insert(events).values(eventData).returning();
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
    
    // Get all khatms for this event that are not deleted
    const khatmsResult = await db.select().from(khatms)
      .where(and(
        eq(khatms.eventId, id),
        eq(khatms.isDeleted, false)
      ));
    
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

  async getEventsByUser(userId: number): Promise<EventWithKhatms[]> {
    try {
      // Get all events created by this user
      const userCreatedEvents = await db.select().from(events)
        .where(eq(events.createdBy, userId))
        .orderBy(desc(events.createdAt));
      
      // Get all events the user has participated in by claiming juzs
      // First, get all juzs the user has claimed
      const userJuzs = await db.select()
        .from(juzs)
        .where(eq(juzs.claimedByUserId, userId));
      
      // Extract khatm IDs from the juzs
      const khatmIdSet = new Set(userJuzs.map(juz => juz.khatmId));
      const khatmIds = Array.from(khatmIdSet);
      
      // Get the khatms for those juz claims
      const userKhatms: Khatm[] = [];
      for (const khatmId of khatmIds) {
        const khatm = await this.getKhatm(khatmId);
        if (khatm && !khatm.isDeleted) {
          userKhatms.push(khatm);
        }
      }
      
      // Extract event IDs from khatms
      const participatedEventIdSet = new Set(userKhatms.map(khatm => khatm.eventId));
      const participatedEventIds = Array.from(participatedEventIdSet);
      
      // Get the events for those khatms
      const participatedEvents: Event[] = [];
      for (const eventId of participatedEventIds) {
        const event = await this.getEvent(eventId);
        if (event) {
          participatedEvents.push(event);
        }
      }
      
      // Create a Map to deduplicate events
      const eventsMap = new Map<number, Event>();
      
      // Add user-created events to the map
      userCreatedEvents.forEach(event => {
        eventsMap.set(event.id, event);
      });
      
      // Add events the user has participated in
      participatedEvents.forEach(event => {
        if (!eventsMap.has(event.id)) {
          eventsMap.set(event.id, event);
        }
      });
      
      // Get the list of unique event IDs
      const eventIds = Array.from(eventsMap.keys());
      
      // Build the enriched events with khatms and juzs
      const enrichedEvents: EventWithKhatms[] = [];
      
      for (const eventId of eventIds) {
        const event = eventsMap.get(eventId);
        if (!event) continue;
        
        // Get the event with all its khatms and juzs
        const eventWithKhatms = await this.getEventWithKhatms(eventId);
        if (eventWithKhatms) {
          enrichedEvents.push(eventWithKhatms);
        }
      }
      
      // Sort by most recently created
      enrichedEvents.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return enrichedEvents;
    } catch (error) {
      console.error("Error in getEventsByUser:", error);
      return [];
    }
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
    const result = await db.select().from(khatms)
      .where(and(
        eq(khatms.id, id),
        eq(khatms.isDeleted, false)
      ));
    return result[0];
  }

  async getKhatmWithJuzs(id: number): Promise<KhatmWithJuzs | undefined> {
    const khatmResult = await db.select().from(khatms)
      .where(and(
        eq(khatms.id, id),
        eq(khatms.isDeleted, false)
      ));
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
    // Get all khatms for this event that are not deleted
    const khatmsResult = await db.select().from(khatms)
      .where(and(
        eq(khatms.eventId, eventId),
        eq(khatms.isDeleted, false)
      ));
    
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