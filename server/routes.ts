import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage as memStorage } from "./storage";
import { pgStorage } from "./pg-storage";
import { setupAuth } from "./auth";
import { generateShortCode, createShortUrl } from "./utils";
import { getWebSocketManager } from "./websocket";
import { cache, CACHE_TTL } from "./cache";
import { 
  insertEventSchema, 
  claimJuzSchema,
  claimMultipleJuzSchema,
  markJuzAsReadSchema,
  unclaimJuzSchema,
  unmarkJuzAsReadSchema,
  archiveKhatmSchema,
  unarchiveKhatmSchema,
  deleteKhatmSchema,
  Event,
  EventWithKhatms,
  KhatmWithJuzs,
  Khatm,
  Juz
} from "@shared/schema";

// Use PostgreSQL storage if DATABASE_URL is set, otherwise use in-memory storage
const storage = process.env.DATABASE_URL ? pgStorage : memStorage;

// Cache TTL constants (in milliseconds)
const EVENT_CACHE_TTL = CACHE_TTL.MINUTE * 5; // 5 minutes
const SHORTCODE_CACHE_TTL = CACHE_TTL.DAY * 7; // 7 days

/**
 * Register all routes for the application
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes will register /api/login, /api/logout, /api/register, /api/user endpoints
  setupAuth(app);

  // Create an HTTP server for the Express app
  const server = createServer(app);

  // Redirect short URLs to events
  app.get("/s/:shortCode", async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    
    if (!shortCode) {
      return res.redirect("/");
    }
    
    try {
      // Check cache first
      const cachedEvent = cache.get<number>(`shortcode:${shortCode}`);
      if (cachedEvent) {
        return res.redirect(`/#/event/${cachedEvent}`);
      }
      
      // Not in cache, fetch from storage
      const event = await storage.getEventByShortCode(shortCode);
      
      if (event) {
        // Store in cache for future requests
        cache.set(`shortcode:${shortCode}`, event.id, SHORTCODE_CACHE_TTL);
        return res.redirect(`/#/event/${event.id}`);
      }
      
      // Shortcode not found
      return res.redirect("/#/not-found");
    } catch (error) {
      console.error("Error resolving short URL:", error);
      return res.redirect("/");
    }
  });

  // Generate a short URL for an event
  app.post("/api/events/:id/short-url", async (req: Request, res: Response) => {
    // Implementation remains unchanged
    const { id } = req.params;
    const eventId = parseInt(id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    
    try {
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // If the event already has a short code, return it
      if (event.shortCode) {
        const shortUrl = createShortUrl(req.headers.host, event.shortCode);
        return res.status(200).json({ 
          shortCode: event.shortCode, 
          shortUrl,
          productionUrl: event.shortCode ? createShortUrl("qurancircle.io", event.shortCode) : undefined
        });
      }
      
      // Generate a new short code
      const shortCode = generateShortCode();
      
      // Save the short code to the event
      const updatedEvent = await storage.setEventShortCode(eventId, shortCode);
      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to update event with short code" });
      }
      
      // Store the shortcode -> eventId mapping in cache
      cache.set(`shortcode:${shortCode}`, eventId, SHORTCODE_CACHE_TTL);
      
      // Return the short URL (with host from request or default)
      const shortUrl = createShortUrl(req.headers.host, shortCode);
      return res.status(200).json({ 
        shortCode, 
        shortUrl,
        productionUrl: createShortUrl("qurancircle.io", shortCode)
      });
    } catch (error) {
      console.error("Error generating short URL:", error);
      return res.status(500).json({ message: "Error generating short URL" });
    }
  });

  // Get event by shortcode
  app.get("/api/events/shortcode/:shortCode", async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    
    if (!shortCode) {
      return res.status(400).json({ message: "Missing shortCode" });
    }
    
    try {
      // Check cache first
      const cachedEventId = cache.get<number>(`shortcode:${shortCode}`);
      let eventId: number;
      
      if (cachedEventId) {
        eventId = cachedEventId;
      } else {
        // Not in cache, fetch from storage
        const event = await storage.getEventByShortCode(shortCode);
        
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }
        
        eventId = event.id;
        // Store in cache for future requests
        cache.set(`shortcode:${shortCode}`, eventId, SHORTCODE_CACHE_TTL);
      }
      
      // Now get the complete event with khatms
      const cachedEvent = cache.get<any>(`event:${eventId}`);
      if (cachedEvent) {
        return res.status(200).json(cachedEvent);
      }
      
      const eventWithKhatms = await storage.getEventWithKhatms(eventId);
      
      if (!eventWithKhatms) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Cache the result
      cache.set(`event:${eventId}`, eventWithKhatms, EVENT_CACHE_TTL);
      
      return res.status(200).json(eventWithKhatms);
    } catch (error) {
      console.error("Error getting event by shortcode:", error);
      return res.status(500).json({ message: "Error getting event" });
    }
  });

  // Create a new event
  app.post("/api/events", async (req: Request, res: Response) => {
    // Require authentication for creating events
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const eventData = insertEventSchema.parse(req.body);
      
      // Add the authenticated user as the creator
      const event = await storage.createEvent({
        ...eventData,
        createdBy: req.user!.id
      });
      
      if (!event) {
        return res.status(500).json({ message: "Failed to create event" });
      }

      // Create an initial khatm for the event
      const khatm = await storage.createKhatm({
        eventId: event.id,
        khatmNumber: 1
      });
      
      if (!khatm) {
        return res.status(500).json({ message: "Failed to create initial khatm" });
      }
      
      // Create all juz for the khatm
      await storage.createAllJuzForKhatm(khatm.id);
      
      // Get the event with its khatms
      const eventWithKhatms = await storage.getEventWithKhatms(event.id);
      
      // Cache the event for future requests
      if (eventWithKhatms) {
        cache.set(`event:${event.id}`, eventWithKhatms, EVENT_CACHE_TTL);
        
        // If a user created this event, invalidate the events cache for that user
        if (req.isAuthenticated() && req.user!.id) {
          // Delete the user's events cache so it will be refreshed on the next request
          cache.delete(`events:user:${req.user!.id}`);
        }
        
        // Broadcast event created via WebSockets to update all connected clients
        try {
          const wsManager = getWebSocketManager();
          
          // Broadcast to all clients that a new event was created
          // This will update the home page for all connected users
          wsManager.broadcastEventCreated(event);
          
          // Also broadcast the event update to clients subscribed to this specific event
          wsManager.broadcastEventUpdated(event.id, event);
          
          // Also broadcast the new khatm creation
          if (eventWithKhatms.khatms && eventWithKhatms.khatms.length > 0) {
            const newKhatm = eventWithKhatms.khatms[0];
            wsManager.broadcastKhatmCreated(event.id, newKhatm);
          }
        } catch (wsError) {
          console.error("WebSocket broadcast error:", wsError);
          // Non-critical error, continue with response
        }
      }
      
      return res.status(201).json(eventWithKhatms);
    } catch (error: any) {
      console.error("Error creating event:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      return res.status(400).json({ message: "Invalid event data" });
    }
  });

  // Get a specific event with its khatms
  app.get("/api/events/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const eventId = parseInt(id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    
    try {
      // Check cache first
      const cachedEvent = cache.get<any>(`event:${eventId}`);
      if (cachedEvent) {
        return res.status(200).json(cachedEvent);
      }
      
      // Not in cache, fetch from storage
      const event = await storage.getEventWithKhatms(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Cache the result
      cache.set(`event:${eventId}`, event, EVENT_CACHE_TTL);
      
      return res.status(200).json(event);
    } catch (error) {
      console.error("Error getting event:", error);
      return res.status(500).json({ message: "Error getting event" });
    }
  });

  // Get all events
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      // If authenticated, get user's events
      if (req.isAuthenticated()) {
        const userId = req.user!.id;
        const cacheKey = `events:user:${userId}`;
        
        // Check cache first
        const cachedEvents = cache.get<EventWithKhatms[]>(cacheKey);
        if (cachedEvents) {
          console.log(`Returning cached events for user ${userId}`);
          return res.status(200).json(cachedEvents);
        }
        
        // Get enriched events from storage with khatms and juzs
        const enrichedEvents = await storage.getEventsByUser(userId);
        
        // Cache the enriched events
        cache.set(cacheKey, enrichedEvents, CACHE_TTL.MINUTE * 5);
        
        return res.status(200).json(enrichedEvents);
      }
      
      // Otherwise, return an empty array (anonymous users don't see any events)
      return res.status(200).json([]);
    } catch (error) {
      console.error("Error getting events:", error);
      return res.status(500).json({ message: "Error getting events" });
    }
  });

  // Update an event
  app.put("/api/events/:id", async (req: Request, res: Response) => {
    // Require authentication for updating events
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const eventId = parseInt(id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    
    try {
      // Get the event to check ownership
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only the creator can update the event
      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this event" });
      }
      
      // Parse the update data
      const updateData = req.body;
      
      // Update the event
      const updatedEvent = await storage.updateEvent(eventId, {
        name: updateData.name,
        description: updateData.description,
        deadline: updateData.deadline
      });
      
      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to update event" });
      }
      
      // Invalidate cache for this event
      cache.delete(`event:${eventId}`);
      
      // Broadcast event updated via WebSockets
      try {
        const wsManager = getWebSocketManager();
        wsManager.broadcastEventUpdated(eventId, updatedEvent);
      } catch (wsError) {
        console.error("Failed to broadcast WebSocket message:", wsError);
      }
      
      return res.status(200).json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      return res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Endpoint for claiming a Juz
  app.post("/api/juz/claim", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber, claimerName } = claimJuzSchema.parse(req.body);
      
      // Get the juz
      const juz = await storage.getJuz(khatmId, juzNumber);
      
      if (!juz) {
        return res.status(404).json({ message: "Juz not found" });
      }
      
      if (juz.status !== 'unclaimed') {
        return res.status(400).json({ message: "This Juz is already claimed" });
      }
      
      // Claim the juz - associate with user if authenticated
      const userId = req.isAuthenticated() ? req.user!.id : null;
      const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
        status: 'claimed',
        claimedByName: claimerName,
        claimedByUserId: userId,
        claimedAt: new Date()
      });
      
      if (!updatedJuz) {
        return res.status(500).json({ message: "Failed to claim Juz" });
      }
      
      // Invalidate event cache since khatm status has changed
      const khatm = await storage.getKhatm(khatmId);
      if (khatm) {
        cache.delete(`event:${khatm.eventId}`);
        
        // Broadcast the juz claimed event via WebSockets
        try {
          const wsManager = getWebSocketManager();
          wsManager.broadcastJuzClaimed(khatm.eventId, updatedJuz);
        } catch (wsError) {
          console.error("Failed to broadcast WebSocket message:", wsError);
          // Continue with response - WebSocket failure shouldn't block the API response
        }
      }
      
      res.status(200).json({ juz: updatedJuz });
    } catch (error) {
      console.error("Error claiming juz:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for marking a Juz as read
  app.post("/api/juz/read", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber } = markJuzAsReadSchema.parse(req.body);
      
      // Get the juz
      const juz = await storage.getJuz(khatmId, juzNumber);
      
      if (!juz) {
        return res.status(404).json({ message: "Juz not found" });
      }
      
      if (juz.status !== 'claimed') {
        return res.status(400).json({ message: "This Juz must be claimed before marking as read" });
      }
      
      // Allow both authenticated and anonymous users to mark juz as read
      if (req.isAuthenticated() && juz.claimedByUserId && juz.claimedByUserId !== req.user!.id) {
        // For authenticated users, check if they're the event creator
        const khatm = await storage.getKhatm(khatmId);
        if (khatm) {
          const event = await storage.getEvent(khatm.eventId);
          if (event && event.createdBy !== req.user!.id) {
            return res.status(403).json({ message: "Only the claimer or event creator can mark this Juz as read" });
          }
        }
      }
      // For anonymous users, we'll allow marking as read - this is a trust-based system
      
      // Mark the juz as read
      const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
        status: 'read',
        readAt: new Date()
      });
      
      if (!updatedJuz) {
        return res.status(500).json({ message: "Failed to mark Juz as read" });
      }
      
      // Invalidate event cache since khatm status has changed
      const khatm = await storage.getKhatm(khatmId);
      if (khatm) {
        cache.delete(`event:${khatm.eventId}`);
        
        // Broadcast the juz read event via WebSockets
        try {
          const wsManager = getWebSocketManager();
          wsManager.broadcastJuzRead(khatm.eventId, updatedJuz);
        } catch (wsError) {
          console.error("Failed to broadcast WebSocket message:", wsError);
          // Continue with response - WebSocket failure shouldn't block the API response
        }
      }
      
      res.status(200).json({ juz: updatedJuz });
    } catch (error) {
      console.error("Error marking juz as read:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for claiming multiple Juz at once
  app.post("/api/juz/claim-multiple", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumbers, claimerName } = claimMultipleJuzSchema.parse(req.body);
      
      if (juzNumbers.length === 0) {
        return res.status(400).json({ message: "No Juz numbers provided" });
      }
      
      const results = [];
      let eventId = null;
      
      // Claim each juz
      for (const juzNumber of juzNumbers) {
        // Get the juz
        const juz = await storage.getJuz(khatmId, juzNumber);
        
        if (!juz) {
          continue; // Skip if not found
        }
        
        if (juz.status !== 'unclaimed') {
          continue; // Skip if already claimed
        }
        
        // Claim the juz - associate with user if authenticated
        const userId = req.isAuthenticated() ? req.user!.id : null;
        const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
          status: 'claimed',
          claimedByName: claimerName,
          claimedByUserId: userId,
          claimedAt: new Date()
        });
        
        if (updatedJuz) {
          results.push(updatedJuz);
          
          // Broadcast the juz claimed event via WebSocket
          if (!eventId) {
            const khatm = await storage.getKhatm(khatmId);
            if (khatm) {
              eventId = khatm.eventId;
            }
          }
          
          if (eventId) {
            try {
              const wsManager = getWebSocketManager();
              wsManager.broadcastJuzClaimed(eventId, updatedJuz);
            } catch (wsError) {
              console.error("Failed to broadcast WebSocket message:", wsError);
              // Continue with next juz - WebSocket failure shouldn't block the operation
            }
          }
        }
      }
      
      // Invalidate event cache
      if (eventId) {
        cache.delete(`event:${eventId}`);
      }
      
      res.status(200).json({ claimed: results.length, juzs: results });
    } catch (error) {
      console.error("Error claiming multiple juzs:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for unclaiming a Juz
  app.post("/api/juz/unclaim", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber } = unclaimJuzSchema.parse(req.body);
      
      // Get the juz
      const juz = await storage.getJuz(khatmId, juzNumber);
      
      if (!juz) {
        return res.status(404).json({ message: "Juz not found" });
      }
      
      if (juz.status === 'unclaimed') {
        return res.status(400).json({ message: "This Juz is not claimed" });
      }
      
      // For authenticated users, check if they can unclaim
      if (req.isAuthenticated()) {
        // Allow if user is the claimer or the event creator
        if (juz.claimedByUserId && juz.claimedByUserId !== req.user!.id) {
          // User is not the claimer, check if they're the event creator
          const khatm = await storage.getKhatm(khatmId);
          if (khatm) {
            const event = await storage.getEvent(khatm.eventId);
            if (event && event.createdBy !== req.user!.id) {
              return res.status(403).json({ message: "Only the claimer or event creator can unclaim this Juz" });
            }
          }
        }
      }
      // For anonymous users, we'll allow unclaiming - this is a trust-based system
      
      // Unclaim the juz
      const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
        status: 'unclaimed',
        claimedByName: null,
        claimedByUserId: null,
        claimedAt: null,
        readAt: null
      });
      
      if (!updatedJuz) {
        return res.status(500).json({ message: "Failed to unclaim Juz" });
      }
      
      // Invalidate event cache since khatm status has changed
      const khatm = await storage.getKhatm(khatmId);
      if (khatm) {
        cache.delete(`event:${khatm.eventId}`);
        
        // Broadcast the juz unclaimed event via WebSockets
        try {
          const wsManager = getWebSocketManager();
          wsManager.broadcastJuzUnclaimed(khatm.eventId, updatedJuz);
        } catch (wsError) {
          console.error("Failed to broadcast WebSocket message:", wsError);
          // Continue with response - WebSocket failure shouldn't block the API response
        }
      }
      
      res.status(200).json({ juz: updatedJuz });
    } catch (error) {
      console.error("Error unclaiming juz:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for unmarking a Juz as read (back to claimed)
  app.post("/api/juz/unmark-read", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber } = unmarkJuzAsReadSchema.parse(req.body);
      
      // Get the juz
      const juz = await storage.getJuz(khatmId, juzNumber);
      
      if (!juz) {
        return res.status(404).json({ message: "Juz not found" });
      }
      
      if (juz.status !== 'read') {
        return res.status(400).json({ message: "This Juz is not marked as read" });
      }
      
      // For authenticated users, check if they can unmark
      if (req.isAuthenticated()) {
        // Allow if user is the claimer or the event creator
        if (juz.claimedByUserId && juz.claimedByUserId !== req.user!.id) {
          // User is not the claimer, check if they're the event creator
          const khatm = await storage.getKhatm(khatmId);
          if (khatm) {
            const event = await storage.getEvent(khatm.eventId);
            if (event && event.createdBy !== req.user!.id) {
              return res.status(403).json({ message: "Only the claimer or event creator can unmark this Juz as read" });
            }
          }
        }
      }
      // For anonymous users, we'll allow unmarking - this is a trust-based system
      
      // Unmark the juz as read (back to claimed)
      const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
        status: 'claimed',
        readAt: null
      });
      
      if (!updatedJuz) {
        return res.status(500).json({ message: "Failed to unmark Juz as read" });
      }
      
      // Invalidate event cache since khatm status has changed
      const khatm = await storage.getKhatm(khatmId);
      if (khatm) {
        cache.delete(`event:${khatm.eventId}`);
        
        // Broadcast the juz unread event via WebSockets
        try {
          const wsManager = getWebSocketManager();
          wsManager.broadcastJuzUnread(khatm.eventId, updatedJuz);
        } catch (wsError) {
          console.error("Failed to broadcast WebSocket message:", wsError);
          // Continue with response - WebSocket failure shouldn't block the API response
        }
      }
      
      res.status(200).json({ juz: updatedJuz });
    } catch (error) {
      console.error("Error unmarking juz as read:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for archiving a Khatm
  app.post("/api/khatm/archive", async (req: Request, res: Response) => {
    // Require authentication for archiving khatms
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { khatmId } = archiveKhatmSchema.parse(req.body);
      
      // Get the khatm to check ownership
      const khatm = await storage.getKhatm(khatmId);
      
      if (!khatm) {
        return res.status(404).json({ message: "Khatm not found" });
      }
      
      // Get the event to check ownership
      const event = await storage.getEvent(khatm.eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only the event creator can archive khatms
      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to archive this khatm" });
      }
      
      // Archive the khatm
      const archivedKhatm = await storage.archiveKhatm(khatmId);
      
      if (!archivedKhatm) {
        return res.status(500).json({ message: "Failed to archive khatm" });
      }
      
      // Create a new khatm if all existing khatms are archived or completed
      const newKhatm = await storage.checkAndCreateNewKhatm(khatm.eventId);
      
      // Invalidate all relevant caches
      cache.delete(`event:${khatm.eventId}`);
      
      // Also invalidate user's events cache to show archived events properly
      if (req.isAuthenticated()) {
        cache.delete(`events:user:${req.user!.id}`);
        console.log(`Invalidated events cache for user ${req.user!.id} after khatm archive`);
      }
      
      // Invalidate any other related caches
      cache.deleteByPrefix(`events:`);
      
      // Broadcast khatm archived event via WebSockets
      try {
        const wsManager = getWebSocketManager();
        wsManager.broadcastKhatmArchived(khatm.eventId, khatmId);
        
        // If a new khatm was created, broadcast that too
        if (newKhatm) {
          const newKhatmWithJuzs = await storage.getKhatmWithJuzs(newKhatm.id);
          if (newKhatmWithJuzs) {
            wsManager.broadcastKhatmCreated(khatm.eventId, newKhatmWithJuzs);
          }
        }
      } catch (wsError) {
        console.error("Failed to broadcast WebSocket message:", wsError);
      }
      
      res.status(200).json({ 
        khatm: archivedKhatm,
        newKhatm: newKhatm || null
      });
    } catch (error) {
      console.error("Error archiving khatm:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for unarchiving a Khatm
  app.post("/api/khatm/unarchive", async (req: Request, res: Response) => {
    // Require authentication for unarchiving khatms
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { khatmId } = unarchiveKhatmSchema.parse(req.body);
      
      // Get the khatm to check ownership
      const khatm = await storage.getKhatm(khatmId);
      
      if (!khatm) {
        return res.status(404).json({ message: "Khatm not found" });
      }
      
      // Get the event to check ownership
      const event = await storage.getEvent(khatm.eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only the event creator can unarchive khatms
      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to unarchive this khatm" });
      }
      
      // Unarchive the khatm
      const unarchivedKhatm = await storage.unarchiveKhatm(khatmId);
      
      if (!unarchivedKhatm) {
        return res.status(500).json({ message: "Failed to unarchive khatm" });
      }
      
      // Invalidate all relevant caches
      cache.delete(`event:${khatm.eventId}`);
      
      // Also invalidate user's events cache to show updated archives
      if (req.isAuthenticated()) {
        cache.delete(`events:user:${req.user!.id}`);
        console.log(`Invalidated events cache for user ${req.user!.id} after khatm unarchive`);
      }
      
      // Invalidate any other related caches
      cache.deleteByPrefix(`events:`);
      
      // Broadcast khatm unarchived event via WebSockets
      try {
        const wsManager = getWebSocketManager();
        wsManager.broadcastKhatmUnarchived(khatm.eventId, khatmId);
      } catch (wsError) {
        console.error("Failed to broadcast WebSocket message:", wsError);
      }
      
      res.status(200).json({ khatm: unarchivedKhatm });
    } catch (error) {
      console.error("Error unarchiving khatm:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for deleting a Khatm
  app.post("/api/khatm/delete", async (req: Request, res: Response) => {
    // Require authentication for deleting khatms
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { khatmId } = deleteKhatmSchema.parse(req.body);
      
      // Get the khatm to check ownership
      const khatm = await storage.getKhatm(khatmId);
      
      if (!khatm) {
        return res.status(404).json({ message: "Khatm not found" });
      }
      
      // Get the event to check ownership
      const event = await storage.getEvent(khatm.eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only the event creator can delete khatms
      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this khatm" });
      }
      
      // Delete the khatm
      console.log(`Attempting to delete khatm ${khatmId} from event ${khatm.eventId}`);
      const deletedKhatm = await storage.deleteKhatm(khatmId);
      
      if (!deletedKhatm) {
        console.error(`Failed to delete khatm ${khatmId}`);
        return res.status(500).json({ message: "Failed to delete khatm" });
      }
      
      console.log(`Successfully marked khatm ${khatmId} as deleted`);
      
      // Create a new khatm if all existing khatms are archived or completed
      const newKhatm = await storage.checkAndCreateNewKhatm(khatm.eventId);
      
      // Invalidate all relevant caches
      cache.delete(`event:${khatm.eventId}`);
      
      // Also invalidate user's events cache to show updated khatms
      if (req.isAuthenticated()) {
        cache.delete(`events:user:${req.user!.id}`);
        console.log(`Invalidated events cache for user ${req.user!.id} after khatm delete`);
      }
      
      // Invalidate any other related caches
      cache.deleteByPrefix(`events:`);
      
      // Broadcast khatm deleted event via WebSockets
      try {
        const wsManager = getWebSocketManager();
        wsManager.broadcastKhatmDeleted(khatm.eventId, khatmId);
        
        // If a new khatm was created, broadcast that too
        if (newKhatm) {
          const newKhatmWithJuzs = await storage.getKhatmWithJuzs(newKhatm.id);
          if (newKhatmWithJuzs) {
            wsManager.broadcastKhatmCreated(khatm.eventId, newKhatmWithJuzs);
          }
        }
      } catch (wsError) {
        console.error("Failed to broadcast WebSocket message:", wsError);
      }
      
      res.status(200).json({ 
        khatm: deletedKhatm,
        newKhatm: newKhatm || null
      });
    } catch (error) {
      console.error("Error deleting khatm:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  return server;
}