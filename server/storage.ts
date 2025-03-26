import { 
  users, type User, type InsertUser,
  events, type Event, type InsertEvent,
  khatms, type Khatm, type InsertKhatm,
  juzs, type Juz, type InsertJuz,
  bookmarks, type Bookmark, type InsertBookmark,
  type KhatmWithJuzs, type EventWithKhatms
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  
  // Event Methods
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventByShortCode(shortCode: string): Promise<Event | undefined>;
  getEventWithKhatms(id: number): Promise<EventWithKhatms | undefined>;
  getEventsByUser(userId: number): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  setEventShortCode(id: number, shortCode: string): Promise<Event | undefined>;
  archiveEvent(id: number): Promise<Event | undefined>;
  unarchiveEvent(id: number): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<Event | undefined>;
  
  // Khatm Methods
  createKhatm(khatm: InsertKhatm): Promise<Khatm>;
  getKhatm(id: number): Promise<Khatm | undefined>;
  getKhatmWithJuzs(id: number): Promise<KhatmWithJuzs | undefined>;
  getKhatmsByEventId(eventId: number): Promise<Khatm[]>;
  archiveKhatm(id: number): Promise<Khatm | undefined>;
  unarchiveKhatm(id: number): Promise<Khatm | undefined>;
  deleteKhatm(id: number): Promise<Khatm | undefined>;
  
  // Juz Methods
  createJuz(juz: InsertJuz): Promise<Juz>;
  getJuz(khatmId: number, juzNumber: number): Promise<Juz | undefined>;
  getJuzsByKhatmId(khatmId: number): Promise<Juz[]>;
  updateJuz(khatmId: number, juzNumber: number, updates: Partial<Juz>): Promise<Juz | undefined>;
  
  // Bookmark Methods
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  getBookmark(userId: number, eventId: number): Promise<Bookmark | undefined>;
  getBookmarksByUser(userId: number): Promise<Bookmark[]>;
  getBookmarksByEvent(eventId: number): Promise<Bookmark[]>;
  deleteBookmark(userId: number, eventId: number): Promise<Bookmark | undefined>;
  
  // Batch operations
  createAllJuzForKhatm(khatmId: number): Promise<void>;
  checkAndCreateNewKhatm(eventId: number): Promise<Khatm | undefined>;
  
  // Session store
  sessionStore: any; // Using any for sessionStore to avoid type issues
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private eventsData: Map<number, Event>;
  private khatmsData: Map<number, Khatm>;
  private juzsData: Map<string, Juz>; // Composite key: khatmId-juzNumber
  private bookmarksData: Map<string, Bookmark>; // Composite key: userId-eventId
  
  private userIdCounter: number;
  private eventIdCounter: number;
  private khatmIdCounter: number;
  private juzIdCounter: number;
  private bookmarkIdCounter: number;
  
  sessionStore: any; // Using any for session store type
  
  constructor() {
    this.usersData = new Map();
    this.eventsData = new Map();
    this.khatmsData = new Map();
    this.juzsData = new Map();
    this.bookmarksData = new Map();
    
    this.userIdCounter = 1;
    this.eventIdCounter = 1;
    this.khatmIdCounter = 1;
    this.juzIdCounter = 1;
    this.bookmarkIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }
  
  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.email === email
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id,
      providerType: null, 
      providerId: null,
      resetToken: null,
      resetTokenExpiry: null
    };
    this.usersData.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.usersData.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }

  async setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<User | undefined> {
    const user = this.usersData.get(userId);
    if (!user) return undefined;
    
    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    this.usersData.set(userId, user);
    
    return user;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const now = new Date();
    return Array.from(this.usersData.values()).find(
      (user) => user.resetToken === token && user.resetTokenExpiry && user.resetTokenExpiry > now
    );
  }
  
  // Event Methods
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const event: Event = { 
      id,
      name: insertEvent.name,
      createdBy: insertEvent.createdBy || 0, // Ensure createdBy is always a number
      createdAt: new Date(),
      description: insertEvent.description || null,
      isPublic: insertEvent.isPublic || false,
      deadline: insertEvent.deadline || null,
      shortCode: null,
      isArchived: false,
      archivedAt: null
    };
    this.eventsData.set(id, event);
    return event;
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    return this.eventsData.get(id);
  }
  
  async getEventByShortCode(shortCode: string): Promise<Event | undefined> {
    return Array.from(this.eventsData.values()).find(
      (event) => event.shortCode === shortCode
    );
  }
  
  async setEventShortCode(id: number, shortCode: string): Promise<Event | undefined> {
    const event = this.eventsData.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, shortCode };
    this.eventsData.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async getEventWithKhatms(id: number): Promise<EventWithKhatms | undefined> {
    const event = this.eventsData.get(id);
    if (!event) return undefined;
    
    const creator = await this.getUser(event.createdBy);
    
    // Get all khatms for this event
    const eventKhatms = Array.from(this.khatmsData.values()).filter(
      khatm => khatm.eventId === id
    ).sort((a, b) => a.khatmNumber - b.khatmNumber);
    
    // Get all juzs for each khatm
    const khatmsWithJuzs: KhatmWithJuzs[] = await Promise.all(
      eventKhatms.map(async khatm => {
        const khatmWithJuzs = await this.getKhatmWithJuzs(khatm.id);
        return khatmWithJuzs!;
      })
    );
    
    return {
      ...event,
      khatms: khatmsWithJuzs,
      creatorName: creator?.username || 'Unknown'
    };
  }
  
  async getEventsByUser(userId: number): Promise<Event[]> {
    return Array.from(this.eventsData.values()).filter(
      event => event.createdBy === userId
    );
  }
  
  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.eventsData.values());
  }
  
  async updateEvent(id: number, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.eventsData.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.eventsData.set(id, updatedEvent);
    return updatedEvent;
  }

  async archiveEvent(id: number): Promise<Event | undefined> {
    const event = this.eventsData.get(id);
    if (!event) return undefined;

    // Archive the event
    const updatedEvent = { 
      ...event,
      isArchived: true,
      archivedAt: new Date()
    };
    this.eventsData.set(id, updatedEvent);

    // Also archive all khatms for this event
    const khatms = Array.from(this.khatmsData.values()).filter(
      khatm => khatm.eventId === id && !khatm.isDeleted
    );

    for (const khatm of khatms) {
      await this.archiveKhatm(khatm.id);
    }

    return updatedEvent;
  }

  async unarchiveEvent(id: number): Promise<Event | undefined> {
    const event = this.eventsData.get(id);
    if (!event) return undefined;

    // Unarchive the event
    const updatedEvent = { 
      ...event,
      isArchived: false,
      archivedAt: null
    };
    this.eventsData.set(id, updatedEvent);

    // Also unarchive all khatms for this event
    const khatms = Array.from(this.khatmsData.values()).filter(
      khatm => khatm.eventId === id && !khatm.isDeleted && khatm.isArchived
    );

    for (const khatm of khatms) {
      await this.unarchiveKhatm(khatm.id);
    }

    return updatedEvent;
  }
  
  async deleteEvent(id: number): Promise<Event | undefined> {
    const event = this.eventsData.get(id);
    if (!event) return undefined;
    
    // Get all khatms for this event
    const khatms = Array.from(this.khatmsData.values()).filter(
      khatm => khatm.eventId === id
    );
    
    // Delete all juzs for each khatm
    for (const khatm of khatms) {
      // Get all juzs for this khatm
      const juzs = Array.from(this.juzsData.values()).filter(
        juz => juz.khatmId === khatm.id
      );
      
      // Delete each juz
      for (const juz of juzs) {
        const key = `${juz.khatmId}-${juz.juzNumber}`;
        this.juzsData.delete(key);
      }
      
      // Delete the khatm
      this.khatmsData.delete(khatm.id);
    }
    
    // Delete the event
    this.eventsData.delete(id);
    
    return event;
  }
  
  // Khatm Methods
  async createKhatm(insertKhatm: InsertKhatm): Promise<Khatm> {
    const id = this.khatmIdCounter++;
    const khatm: Khatm = { 
      ...insertKhatm, 
      id, 
      createdAt: new Date(),
      isArchived: false,
      isDeleted: false,
      archivedAt: null,
      deletedAt: null
    };
    this.khatmsData.set(id, khatm);
    return khatm;
  }
  
  async getKhatm(id: number): Promise<Khatm | undefined> {
    return this.khatmsData.get(id);
  }
  
  async getKhatmWithJuzs(id: number): Promise<KhatmWithJuzs | undefined> {
    const khatm = this.khatmsData.get(id);
    if (!khatm) return undefined;
    
    const juzsList = await this.getJuzsByKhatmId(id);
    
    const claimedCount = juzsList.filter(juz => juz.status === 'claimed' || juz.status === 'read').length;
    const readCount = juzsList.filter(juz => juz.status === 'read').length;
    
    return {
      ...khatm,
      juzs: juzsList,
      claimedCount,
      readCount
    };
  }
  
  async getKhatmsByEventId(eventId: number): Promise<Khatm[]> {
    return Array.from(this.khatmsData.values()).filter(
      khatm => khatm.eventId === eventId && !khatm.isDeleted
    ).sort((a, b) => a.khatmNumber - b.khatmNumber);
  }
  
  async archiveKhatm(id: number): Promise<Khatm | undefined> {
    const khatm = this.khatmsData.get(id);
    if (!khatm) return undefined;
    
    const updatedKhatm = { 
      ...khatm, 
      isArchived: true,
      archivedAt: new Date()
    };
    this.khatmsData.set(id, updatedKhatm);
    return updatedKhatm;
  }
  
  async unarchiveKhatm(id: number): Promise<Khatm | undefined> {
    const khatm = this.khatmsData.get(id);
    if (!khatm) return undefined;
    
    const updatedKhatm = { 
      ...khatm, 
      isArchived: false,
      archivedAt: null
    };
    this.khatmsData.set(id, updatedKhatm);
    return updatedKhatm;
  }
  
  async deleteKhatm(id: number): Promise<Khatm | undefined> {
    const khatm = this.khatmsData.get(id);
    if (!khatm) return undefined;
    
    const updatedKhatm = { 
      ...khatm, 
      isDeleted: true,
      deletedAt: new Date()
    };
    this.khatmsData.set(id, updatedKhatm);
    return updatedKhatm;
  }
  
  // Juz Methods
  async createJuz(insertJuz: InsertJuz): Promise<Juz> {
    const id = this.juzIdCounter++;
    const juz: Juz = { 
      id,
      khatmId: insertJuz.khatmId,
      juzNumber: insertJuz.juzNumber,
      status: insertJuz.status || 'unclaimed',
      claimedByName: insertJuz.claimedByName || null,
      claimedByUserId: insertJuz.claimedByUserId || null,
      claimedAt: null,
      readAt: null
    };
    
    const key = `${juz.khatmId}-${juz.juzNumber}`;
    this.juzsData.set(key, juz);
    return juz;
  }
  
  async getJuz(khatmId: number, juzNumber: number): Promise<Juz | undefined> {
    const key = `${khatmId}-${juzNumber}`;
    return this.juzsData.get(key);
  }
  
  async getJuzsByKhatmId(khatmId: number): Promise<Juz[]> {
    return Array.from(this.juzsData.values()).filter(
      juz => juz.khatmId === khatmId
    ).sort((a, b) => a.juzNumber - b.juzNumber);
  }
  
  async updateJuz(khatmId: number, juzNumber: number, updates: Partial<Juz>): Promise<Juz | undefined> {
    const key = `${khatmId}-${juzNumber}`;
    const juz = this.juzsData.get(key);
    if (!juz) return undefined;
    
    const updatedJuz = { ...juz, ...updates };
    this.juzsData.set(key, updatedJuz);
    return updatedJuz;
  }
  
  // Batch operations
  async createAllJuzForKhatm(khatmId: number): Promise<void> {
    // Create all 30 juzs for a khatm
    for (let i = 1; i <= 30; i++) {
      await this.createJuz({
        khatmId,
        juzNumber: i,
        status: 'unclaimed',
        claimedByName: null,
        claimedByUserId: null
      });
    }
  }
  
  async checkAndCreateNewKhatm(eventId: number): Promise<Khatm | undefined> {
    const khatms = await this.getKhatmsByEventId(eventId);
    
    // Check if all juzs in the latest khatm are claimed
    if (khatms.length > 0) {
      const latestKhatm = khatms.reduce((latest, current) => 
        current.khatmNumber > latest.khatmNumber ? current : latest
      , khatms[0]);
      
      const juzs = await this.getJuzsByKhatmId(latestKhatm.id);
      const allClaimed = juzs.every(juz => juz.status !== 'unclaimed');
      
      if (allClaimed) {
        // Create a new khatm
        const newKhatm = await this.createKhatm({
          eventId,
          khatmNumber: latestKhatm.khatmNumber + 1
        });
        
        // Create all 30 juzs for the new khatm
        await this.createAllJuzForKhatm(newKhatm.id);
        
        return newKhatm;
      }
    }
    
    return undefined;
  }

  // Bookmark Methods
  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = this.bookmarkIdCounter++;
    const bookmark: Bookmark = {
      ...insertBookmark,
      id,
      createdAt: new Date()
    };

    const key = `${bookmark.userId}-${bookmark.eventId}`;
    this.bookmarksData.set(key, bookmark);
    return bookmark;
  }

  async getBookmark(userId: number, eventId: number): Promise<Bookmark | undefined> {
    const key = `${userId}-${eventId}`;
    return this.bookmarksData.get(key);
  }

  async getBookmarksByUser(userId: number): Promise<Bookmark[]> {
    return Array.from(this.bookmarksData.values()).filter(
      bookmark => bookmark.userId === userId
    );
  }

  async getBookmarksByEvent(eventId: number): Promise<Bookmark[]> {
    return Array.from(this.bookmarksData.values()).filter(
      bookmark => bookmark.eventId === eventId
    );
  }

  async deleteBookmark(userId: number, eventId: number): Promise<Bookmark | undefined> {
    const key = `${userId}-${eventId}`;
    const bookmark = this.bookmarksData.get(key);
    if (!bookmark) return undefined;

    this.bookmarksData.delete(key);
    return bookmark;
  }
}

export const storage = new MemStorage();
