import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage as memStorage } from "./storage";
import { pgStorage } from "./pg-storage";
import { setupAuth } from "./auth";
import { generateShortCode, createShortUrl } from "./utils";
import { 
  insertEventSchema, 
  claimJuzSchema,
  claimMultipleJuzSchema,
  markJuzAsReadSchema,
  unclaimJuzSchema,
  unmarkJuzAsReadSchema,
  archiveKhatmSchema,
  unarchiveKhatmSchema,
  deleteKhatmSchema
} from "@shared/schema";

// Use PostgreSQL storage if DATABASE_URL is set, otherwise use in-memory storage
const storage = process.env.DATABASE_URL ? pgStorage : memStorage;

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Short URL handling with a dedicated redirect page
  app.get("/s/:shortCode", async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;
      
      console.log(`[Server] Handling short URL with code: ${shortCode}`);
      
      // In ESM modules, __dirname is not available directly
      // Instead of using __dirname, use the import.meta approach to get the file URL
      // But since we use Vite for serving the frontend, we'll use an api-based approach
      // and redirect to the event page
      
      // First check if the event exists
      const event = await storage.getEventByShortCode(shortCode);
      
      if (event) {
        // If found, redirect to the event page
        return res.redirect(`/event/${event.id}`);
      } else {
        // If not found, redirect to home page
        return res.redirect('/');
      }
    } catch (error) {
      console.error("[Server] Error handling short URL:", error);
      res.status(500).send("Server error");
    }
  });

  // API endpoint to generate a short URL for an event
  app.post("/api/events/:id/short-url", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if the event already has a short code
      if (event.shortCode) {
        // First create a relative URL that will work in any environment
        const shortUrl = createShortUrl(null, event.shortCode);
        
        // For display purposes, we'll also include the website URL
        const websiteUrl = createShortUrl("https://qurancircle.io", event.shortCode);
        
        return res.json({ 
          shortCode: event.shortCode, 
          shortUrl,
          productionUrl: websiteUrl // keeping property name for backwards compatibility
        });
      }
      
      // Generate a new short code
      const shortCode = generateShortCode();
      
      // Save the short code
      const updatedEvent = await storage.setEventShortCode(eventId, shortCode);
      
      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to create short URL" });
      }
      
      // Create the relative short URL that works in any environment
      const shortUrl = createShortUrl(null, shortCode);
      
      // For display purposes, also include the website URL
      const websiteUrl = createShortUrl("https://qurancircle.io", shortCode);
      
      res.json({ 
        shortCode, 
        shortUrl,
        productionUrl: websiteUrl // keeping property name for backwards compatibility
      });
    } catch (error) {
      console.error("Error creating short URL:", error);
      res.status(500).json({ message: "Error creating short URL" });
    }
  });

  // Endpoint to get event by short code
  app.get("/api/events/shortcode/:shortCode", async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;
      console.log(`[API] Looking up event by short code: ${shortCode}`);
      
      const event = await storage.getEventByShortCode(shortCode);
      
      if (!event) {
        console.log(`[API] No event found for short code: ${shortCode}`);
        return res.status(404).json({ message: "Event not found" });
      }
      
      console.log(`[API] Found event for short code ${shortCode}: Event ID = ${event.id}`);
      res.json(event);
    } catch (error) {
      console.error(`[API] Error getting event by short code ${req.params.shortCode}:`, error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Events API
  app.post("/api/events", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });

      const event = await storage.createEvent(eventData);
      
      // Create the first khatm for this event
      const khatm = await storage.createKhatm({
        eventId: event.id,
        khatmNumber: 1
      });
      
      // Create all 30 juzs for the khatm
      await storage.createAllJuzForKhatm(khatm.id);
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEventWithKhatms(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error getting event:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      if (req.isAuthenticated()) {
        // Return user's events if authenticated
        const events = await storage.getEventsByUser(req.user!.id);
        return res.json(events);
      } else {
        // Return only public events for non-authenticated users
        const allEvents = await storage.getAllEvents();
        const publicEvents = allEvents.filter(event => event.isPublic);
        return res.json(publicEvents);
      }
    } catch (error) {
      console.error("Error getting events:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update an existing event
  app.put("/api/events/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only the creator can update the event
      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this event" });
      }
      
      // Validate update data (partial updates are allowed)
      const updateData: {
        name?: string;
        description?: string;
        isPublic?: boolean;
        deadline?: Date;
      } = {};
      
      // Only add defined values
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.isPublic !== undefined) updateData.isPublic = req.body.isPublic;
      if (req.body.deadline) updateData.deadline = new Date(req.body.deadline);
      
      const updatedEvent = await storage.updateEvent(eventId, updateData);
      
      if (!updatedEvent) {
        return res.status(500).json({ message: "Failed to update event" });
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  // Juz Claims API
  app.post("/api/juz/claim", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber, claimerName } = claimJuzSchema.parse(req.body);
      
      // Check if this juz exists and is not claimed
      const juz = await storage.getJuz(khatmId, juzNumber);
      
      if (!juz) {
        return res.status(404).json({ message: "Juz not found" });
      }
      
      if (juz.status !== 'unclaimed') {
        return res.status(400).json({ message: "This Juz is already claimed" });
      }
      
      // Claim the juz
      const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
        claimedByName: claimerName,
        claimedByUserId: req.isAuthenticated() ? req.user!.id : null,
        status: 'claimed',
        claimedAt: new Date()
      });
      
      if (!updatedJuz) {
        return res.status(500).json({ message: "Failed to claim Juz" });
      }
      
      // Check if all juzs are claimed in this khatm
      const khatm = await storage.getKhatm(khatmId);
      if (khatm) {
        const newKhatm = await storage.checkAndCreateNewKhatm(khatm.eventId);
        
        // Return the updated juz and info about new khatm if created
        return res.status(200).json({
          juz: updatedJuz,
          newKhatmCreated: !!newKhatm,
          newKhatmId: newKhatm?.id
        });
      }
      
      res.status(200).json({
        juz: updatedJuz,
        newKhatmCreated: false
      });
    } catch (error) {
      console.error("Error claiming juz:", error);
      res.status(400).json({ message: "Invalid claim data" });
    }
  });

  app.post("/api/juz/read", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber } = markJuzAsReadSchema.parse(req.body);
      
      // Check if this juz exists and is claimed
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
      
      // Track successfully claimed Juz
      const claimedJuzs = [];
      let newKhatmCreated = false;
      let newKhatmId = null;
      
      // Check and claim each Juz in the array
      for (const juzNumber of juzNumbers) {
        // Check if this juz exists and is not claimed
        const juz = await storage.getJuz(khatmId, juzNumber);
        
        if (!juz || juz.status !== 'unclaimed') {
          // Skip this juz and continue with others
          continue;
        }
        
        // Claim the juz
        const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
          claimedByName: claimerName,
          claimedByUserId: req.isAuthenticated() ? req.user!.id : null,
          status: 'claimed',
          claimedAt: new Date()
        });
        
        if (updatedJuz) {
          claimedJuzs.push(updatedJuz);
        }
      }
      
      // If we didn't claim any juz, return an error
      if (claimedJuzs.length === 0) {
        return res.status(400).json({ message: "Failed to claim any Juz. All selected portions may already be claimed." });
      }
      
      // Check if all juzs are claimed in this khatm
      const khatm = await storage.getKhatm(khatmId);
      if (khatm) {
        const newKhatm = await storage.checkAndCreateNewKhatm(khatm.eventId);
        newKhatmCreated = !!newKhatm;
        newKhatmId = newKhatm?.id;
      }
      
      res.status(200).json({
        juzs: claimedJuzs,
        claimedCount: claimedJuzs.length,
        newKhatmCreated,
        newKhatmId
      });
    } catch (error) {
      console.error("Error claiming multiple juzs:", error);
      res.status(400).json({ message: "Invalid claim data" });
    }
  });

  app.post("/api/juz/unclaim", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber } = unclaimJuzSchema.parse(req.body);
      
      // Check if this juz exists and is claimed
      const juz = await storage.getJuz(khatmId, juzNumber);
      
      if (!juz) {
        return res.status(404).json({ message: "Juz not found" });
      }
      
      if (juz.status === 'unclaimed') {
        return res.status(400).json({ message: "This Juz is already unclaimed" });
      }
      
      // Check if the user is authorized to unclaim
      if (req.isAuthenticated()) {
        // If authenticated user is not the claimer, check if they're the event creator
        if (juz.claimedByUserId && juz.claimedByUserId !== req.user!.id) {
          // Get the event to check if user is creator
          const khatm = await storage.getKhatm(khatmId);
          if (khatm) {
            const event = await storage.getEvent(khatm.eventId);
            if (event && event.createdBy !== req.user!.id) {
              return res.status(403).json({ message: "Only the claimer or event creator can unclaim this Juz" });
            }
          }
        }
      } else {
        // Allow anonymous users to unclaim juz - trust-based system for community participation
        // Anonymous users can unclaim any juz - this enables full participation without authentication
        // This is intentional to lower barriers to participation
      }
      
      // Unclaim the juz
      const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
        claimedByName: null,
        claimedByUserId: null,
        status: 'unclaimed',
        claimedAt: null,
        readAt: null
      });
      
      if (!updatedJuz) {
        return res.status(500).json({ message: "Failed to unclaim Juz" });
      }
      
      res.status(200).json({ juz: updatedJuz });
    } catch (error) {
      console.error("Error unclaiming juz:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Endpoint for unmarking a Juz as read (changing from 'read' back to 'claimed')
  app.post("/api/juz/unmark-read", async (req: Request, res: Response) => {
    try {
      const { khatmId, juzNumber } = unmarkJuzAsReadSchema.parse(req.body);
      
      // Check if this juz exists and is in read status
      const juz = await storage.getJuz(khatmId, juzNumber);
      
      if (!juz) {
        return res.status(404).json({ message: "Juz not found" });
      }
      
      if (juz.status !== 'read') {
        return res.status(400).json({ message: "This Juz is not marked as read" });
      }
      
      // Allow both authenticated and anonymous users to unmark juz as read
      // For authenticated users, check if they're the event creator or claimer
      if (req.isAuthenticated() && juz.claimedByUserId && juz.claimedByUserId !== req.user!.id) {
        const khatm = await storage.getKhatm(khatmId);
        if (khatm) {
          const event = await storage.getEvent(khatm.eventId);
          if (event && event.createdBy !== req.user!.id) {
            return res.status(403).json({ message: "Only the claimer or event creator can unmark this Juz" });
          }
        }
      }
      // For anonymous users, we'll allow unmarking - this is a trust-based system
      
      // Change the juz status from 'read' back to 'claimed'
      const updatedJuz = await storage.updateJuz(khatmId, juzNumber, {
        status: 'claimed',
        readAt: null
      });
      
      if (!updatedJuz) {
        return res.status(500).json({ message: "Failed to unmark Juz as read" });
      }
      
      res.status(200).json({ juz: updatedJuz });
    } catch (error) {
      console.error("Error unmarking juz:", error);
      res.status(400).json({ message: "Invalid data" });
    }
  });

  // Khatm Management API Endpoints
  
  // Archive a khatm (only available to event creator)
  app.post("/api/khatm/archive", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { khatmId } = archiveKhatmSchema.parse(req.body);
      
      // Get khatm and check if it exists
      const khatm = await storage.getKhatm(khatmId);
      if (!khatm) {
        return res.status(404).json({ message: "Khatm not found" });
      }
      
      // Check if the user is the event creator
      const event = await storage.getEvent(khatm.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Only the event creator can archive this khatm" });
      }
      
      // Archive the khatm
      const archivedKhatm = await storage.archiveKhatm(khatmId);
      if (!archivedKhatm) {
        return res.status(500).json({ message: "Failed to archive khatm" });
      }
      
      res.status(200).json({ khatm: archivedKhatm });
    } catch (error) {
      console.error("Error archiving khatm:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  
  // Unarchive a khatm (only available to event creator)
  app.post("/api/khatm/unarchive", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { khatmId } = unarchiveKhatmSchema.parse(req.body);
      
      // Get khatm and check if it exists
      const khatm = await storage.getKhatm(khatmId);
      if (!khatm) {
        return res.status(404).json({ message: "Khatm not found" });
      }
      
      // Check if the khatm is actually archived
      if (!khatm.isArchived) {
        return res.status(400).json({ message: "This khatm is not archived" });
      }
      
      // Check if the user is the event creator
      const event = await storage.getEvent(khatm.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Only the event creator can unarchive this khatm" });
      }
      
      // Unarchive the khatm
      const unarchivedKhatm = await storage.unarchiveKhatm(khatmId);
      if (!unarchivedKhatm) {
        return res.status(500).json({ message: "Failed to unarchive khatm" });
      }
      
      res.status(200).json({ khatm: unarchivedKhatm });
    } catch (error) {
      console.error("Error unarchiving khatm:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  
  // Delete a khatm (only available to event creator)
  app.post("/api/khatm/delete", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { khatmId } = deleteKhatmSchema.parse(req.body);
      
      // Get khatm and check if it exists
      const khatm = await storage.getKhatm(khatmId);
      if (!khatm) {
        return res.status(404).json({ message: "Khatm not found" });
      }
      
      // Check if the user is the event creator
      const event = await storage.getEvent(khatm.eventId);
      if (!event || event.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Only the event creator can delete this khatm" });
      }
      
      // Delete the khatm (soft delete)
      const deletedKhatm = await storage.deleteKhatm(khatmId);
      if (!deletedKhatm) {
        return res.status(500).json({ message: "Failed to delete khatm" });
      }
      
      res.status(200).json({ khatm: deletedKhatm });
    } catch (error) {
      console.error("Error deleting khatm:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
