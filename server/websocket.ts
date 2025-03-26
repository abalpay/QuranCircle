import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { Event, KhatmWithJuzs, Juz } from '@shared/schema';

/**
 * Types of messages that can be sent over WebSockets
 */
export enum WebSocketMessageType {
  JUZ_CLAIMED = 'JUZ_CLAIMED',
  JUZ_UNCLAIMED = 'JUZ_UNCLAIMED',
  JUZ_READ = 'JUZ_READ',
  JUZ_UNREAD = 'JUZ_UNREAD',
  KHATM_CREATED = 'KHATM_CREATED',
  KHATM_ARCHIVED = 'KHATM_ARCHIVED',
  KHATM_UNARCHIVED = 'KHATM_UNARCHIVED',
  KHATM_DELETED = 'KHATM_DELETED',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CREATED = 'EVENT_CREATED',
  EVENT_ARCHIVED = 'EVENT_ARCHIVED',
  EVENT_UNARCHIVED = 'EVENT_UNARCHIVED',
  SUBSCRIBE_EVENT = 'SUBSCRIBE_EVENT',
  PING = 'PING',
  PONG = 'PONG',
}

/**
 * Interface for WebSocket messages
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

/**
 * Interface for WebSocket clients with additional metadata
 */
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  eventId?: number;
}

/**
 * WebSocket manager class
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private interval: NodeJS.Timeout | null = null;
  
  // Map of event IDs to connected clients
  private eventClients: Map<number, Set<ExtendedWebSocket>> = new Map();
  
  constructor(server: Server) {
    // Initialize the WebSocket server using the HTTP server
    // Use a specific path to avoid conflicts with Vite's WebSocket server
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/events'
    });
    
    // Set up connection handler
    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start the heartbeat check for client connections
    this.startHeartbeat();
    
    console.log('WebSocket server initialized at path /ws/events');
  }
  
  /**
   * Start the heartbeat interval that checks for disconnected clients
   */
  private startHeartbeat() {
    this.interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const extendedWs = ws as ExtendedWebSocket;
        
        if (extendedWs.isAlive === false) {
          // Client is no longer responding, close the connection
          this.removeClientFromEventTracking(extendedWs);
          return extendedWs.terminate();
        }
        
        // Mark as not alive, will be marked alive when pong response received
        extendedWs.isAlive = false;
        extendedWs.ping(() => {});
      });
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Handle a new WebSocket connection
   */
  private handleConnection(ws: WebSocket) {
    const extendedWs = ws as ExtendedWebSocket;
    extendedWs.isAlive = true;
    
    // Handle pong messages (keep-alive)
    extendedWs.on('pong', () => {
      extendedWs.isAlive = true;
    });
    
    // Handle client messages
    extendedWs.on('message', (message: Buffer) => {
      try {
        // Parse the message
        const parsedMessage = JSON.parse(message.toString()) as WebSocketMessage;
        
        // Special case for PING message
        if (parsedMessage.type === WebSocketMessageType.PING) {
          extendedWs.send(JSON.stringify({
            type: WebSocketMessageType.PONG,
            payload: { timestamp: Date.now() }
          }));
          return;
        }
        
        // Handle subscription to events
        if (parsedMessage.type === WebSocketMessageType.SUBSCRIBE_EVENT && parsedMessage.payload.eventId) {
          const eventId = parseInt(parsedMessage.payload.eventId);
          
          // Store the event ID the client is interested in
          extendedWs.eventId = eventId;
          
          // Add client to event tracking
          if (!this.eventClients.has(eventId)) {
            this.eventClients.set(eventId, new Set());
          }
          this.eventClients.get(eventId)?.add(extendedWs);
          
          console.log(`WebSocket client subscribed to event ${eventId}`);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    extendedWs.on('close', () => {
      this.removeClientFromEventTracking(extendedWs);
    });
  }
  
  /**
   * Remove a client from all event tracking
   */
  private removeClientFromEventTracking(ws: ExtendedWebSocket) {
    if (ws.eventId) {
      const clients = this.eventClients.get(ws.eventId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.eventClients.delete(ws.eventId);
        }
      }
    }
  }
  
  /**
   * Broadcast a message to all clients subscribed to an event
   */
  public broadcastToEvent(eventId: number, message: WebSocketMessage) {
    const clients = this.eventClients.get(eventId);
    if (!clients || clients.size === 0) {
      // No clients subscribed to this event
      return;
    }
    
    const messageString = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
  
  /**
   * Broadcast a juz claimed message to the event
   */
  public broadcastJuzClaimed(eventId: number, juz: Juz) {
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.JUZ_CLAIMED,
      payload: { juz }
    });
  }
  
  /**
   * Broadcast a juz read message to the event
   */
  public broadcastJuzRead(eventId: number, juz: Juz) {
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.JUZ_READ,
      payload: { juz }
    });
  }
  
  /**
   * Broadcast a juz unclaimed message to the event
   */
  public broadcastJuzUnclaimed(eventId: number, juz: Juz) {
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.JUZ_UNCLAIMED,
      payload: { juz }
    });
  }
  
  /**
   * Broadcast a juz unmarked as read message to the event
   */
  public broadcastJuzUnread(eventId: number, juz: Juz) {
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.JUZ_UNREAD,
      payload: { juz }
    });
  }
  
  /**
   * Broadcast a new khatm created message to the event
   */
  public broadcastKhatmCreated(eventId: number, khatm: KhatmWithJuzs) {
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.KHATM_CREATED,
      payload: { khatm }
    });
  }
  
  /**
   * Broadcast a khatm archived message to the event
   */
  public broadcastKhatmArchived(eventId: number, khatmId: number) {
    // Broadcast to event subscribers first
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.KHATM_ARCHIVED,
      payload: { khatmId, eventId }
    });
    
    // Also broadcast to all clients for home page updates
    this.broadcastToAll({
      type: WebSocketMessageType.KHATM_ARCHIVED,
      payload: { khatmId, eventId }
    });
  }
  
  /**
   * Broadcast a khatm unarchived message to the event
   */
  public broadcastKhatmUnarchived(eventId: number, khatmId: number) {
    // Broadcast to event subscribers first
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.KHATM_UNARCHIVED,
      payload: { khatmId, eventId }
    });
    
    // Also broadcast to all clients for home page updates
    this.broadcastToAll({
      type: WebSocketMessageType.KHATM_UNARCHIVED,
      payload: { khatmId, eventId }
    });
  }
  
  /**
   * Broadcast a khatm deleted message to the event
   */
  public broadcastKhatmDeleted(eventId: number, khatmId: number) {
    // Broadcast to event subscribers
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.KHATM_DELETED,
      payload: { khatmId, eventId }
    });
    
    // Also broadcast to all clients for home page updates
    this.broadcastToAll({
      type: WebSocketMessageType.KHATM_DELETED,
      payload: { khatmId, eventId }
    });
  }
  
  /**
   * Broadcast an event updated message to all subscribers
   */
  public broadcastEventUpdated(eventId: number, event: Event) {
    // Broadcast to event subscribers
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.EVENT_UPDATED,
      payload: { event }
    });
    
    // Also broadcast to all clients for home page updates
    this.broadcastToAll({
      type: WebSocketMessageType.EVENT_UPDATED,
      payload: { event, eventId }
    });
  }
  
  /**
   * Broadcast a global message to all connected clients (regardless of subscription)
   * Used for events that affect all users (like new event creation)
   */
  public broadcastToAll(message: WebSocketMessage) {
    const messageString = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
  
  /**
   * Broadcast event created message to all connected clients
   */
  public broadcastEventCreated(event: Event) {
    this.broadcastToAll({
      type: WebSocketMessageType.EVENT_CREATED,
      payload: { event }
    });
  }
  
  /**
   * Broadcast event archived message to all connected clients
   */
  public broadcastEventArchived(eventId: number, event: Event) {
    // Broadcast to event subscribers
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.EVENT_ARCHIVED,
      payload: { event, eventId }
    });
    
    // Also broadcast to all clients for home page updates
    this.broadcastToAll({
      type: WebSocketMessageType.EVENT_ARCHIVED,
      payload: { event, eventId }
    });
  }
  
  /**
   * Broadcast event unarchived message to all connected clients
   */
  public broadcastEventUnarchived(eventId: number, event: Event) {
    // Broadcast to event subscribers
    this.broadcastToEvent(eventId, {
      type: WebSocketMessageType.EVENT_UNARCHIVED,
      payload: { event, eventId }
    });
    
    // Also broadcast to all clients for home page updates
    this.broadcastToAll({
      type: WebSocketMessageType.EVENT_UNARCHIVED,
      payload: { event, eventId }
    });
  }
  
  /**
   * Clean up resources
   */
  public cleanup() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

/**
 * Initialize the WebSocket manager with the HTTP server
 */
export function initializeWebSockets(server: Server) {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
  }
  return wsManager;
}

/**
 * Get the WebSocket manager instance
 */
export function getWebSocketManager() {
  if (!wsManager) {
    throw new Error('WebSocket manager not initialized. Call initializeWebSockets first.');
  }
  return wsManager;
}