import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertEventSchema, 
  claimJuzSchema,
  claimMultipleJuzSchema,
  markJuzAsReadSchema,
  unclaimJuzSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

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

  const httpServer = createServer(app);
  return httpServer;
}
