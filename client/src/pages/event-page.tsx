import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Info } from "lucide-react";
import { EventWithKhatms } from "@shared/schema";
import EventHeader from "@/components/EventHeader";
import KhatmCard from "@/components/KhatmCard";
import { useCallback, memo, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CircleSettingsDialog from "@/components/CircleSettingsDialog";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { queryClient } from "@/lib/queryClient";

// WebSocket message types
enum WebSocketMessageType {
  JUZ_CLAIMED = 'JUZ_CLAIMED',
  JUZ_UNCLAIMED = 'JUZ_UNCLAIMED',
  JUZ_READ = 'JUZ_READ',
  JUZ_UNREAD = 'JUZ_UNREAD',
  KHATM_CREATED = 'KHATM_CREATED',
  KHATM_ARCHIVED = 'KHATM_ARCHIVED',
  KHATM_UNARCHIVED = 'KHATM_UNARCHIVED',
  KHATM_DELETED = 'KHATM_DELETED',
  EVENT_UPDATED = 'EVENT_UPDATED',
  SUBSCRIBE_EVENT = 'SUBSCRIBE_EVENT',
  PING = 'PING',
  PONG = 'PONG',
}

// WebSocket message interface
interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

// Memoized KhatmCard component to prevent unnecessary re-renders
const MemoizedKhatmCard = memo(KhatmCard);

export default function EventPage() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id ?? "0");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const wsRef = useRef<WebSocket | null>(null);

  const {
    data: event,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EventWithKhatms>({
    queryKey: [`/api/events/${eventId}`],
    refetchOnMount: true,
  });

  // Force a refetch when a new khatm is created
  const handleNewKhatmCreated = useCallback(() => {
    refetch().then(() => {
      setLastRefreshed(new Date());
    });
  }, [refetch]);

  // Open settings dialog
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  // Close settings dialog
  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  // Refresh the data periodically to show updates by other users
  useEffect(() => {
    const interval = setInterval(() => {
      // Only auto-refresh if the user hasn't interacted with page for 1 minute
      if (new Date().getTime() - lastRefreshed.getTime() > 60000) {
        refetch().then(() => {
          setLastRefreshed(new Date());
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [refetch, lastRefreshed]);
  
  // Store visited circles in localStorage for easier access later
  useEffect(() => {
    if (event) {
      // Get existing visited events
      const visitedEvents = JSON.parse(localStorage.getItem('quranCircleVisitedEvents') || '[]');
      
      // Check if this event is already in the list
      if (!visitedEvents.some((e: {id: number}) => e.id === event.id)) {
        // Add it and save back to localStorage
        visitedEvents.push({
          id: event.id,
          name: event.name,
          visitedAt: new Date().toISOString()
        });
        localStorage.setItem('quranCircleVisitedEvents', JSON.stringify(visitedEvents));
      }
    }
  }, [event]);
  
  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!eventId || eventId <= 0) return;
    
    // Create the WebSocket connection 
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    // Set up event handlers
    ws.onopen = () => {
      setWebSocketConnected(true);
      console.log('WebSocket connection established');
      
      // Subscribe to the event
      const subscribeMessage: WebSocketMessage = {
        type: WebSocketMessageType.SUBSCRIBE_EVENT,
        payload: { eventId }
      };
      ws.send(JSON.stringify(subscribeMessage));
    };
    
    ws.onclose = () => {
      setWebSocketConnected(false);
      console.log('WebSocket connection closed');
    };
    
    ws.onerror = (error) => {
      setWebSocketConnected(false);
      console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle different message types
        switch (message.type) {
          case WebSocketMessageType.JUZ_CLAIMED:
          case WebSocketMessageType.JUZ_UNCLAIMED:
          case WebSocketMessageType.JUZ_READ:
          case WebSocketMessageType.JUZ_UNREAD:
          case WebSocketMessageType.KHATM_CREATED:
          case WebSocketMessageType.KHATM_ARCHIVED:
          case WebSocketMessageType.KHATM_UNARCHIVED:
            console.log("Khatm unarchived, refreshing event data");
            queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
            refetch();
            break;
            
          case WebSocketMessageType.KHATM_DELETED:
            console.log("Khatm deleted, refreshing event data", message.payload);
            
            // Add debug info about the payload received
            if (message.payload && message.payload.khatmId) {
              console.log(`Received khatm deletion notification for khatmId: ${message.payload.khatmId}, eventId: ${message.payload.eventId}`);
            }
            
            // For khatm deletion, need to completely refresh the data
            queryClient.removeQueries({ queryKey: [`/api/events/${eventId}`] });
            
            // If this deletion is for the currently viewed event, refetch
            if (!message.payload.eventId || message.payload.eventId === eventId) {
              setTimeout(() => {
                refetch()
                  .then(() => console.log("Successfully refetched event data after khatm deletion"))
                  .catch(err => console.error("Error refetching event data after khatm deletion:", err));
              }, 250);
            }
            break;
            
          case WebSocketMessageType.EVENT_UPDATED:
            console.log("Event updated, refreshing event data");
            queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
            refetch();
            break;
          
          case WebSocketMessageType.PING:
            // Respond to PING with PONG
            ws.send(JSON.stringify({ type: WebSocketMessageType.PONG, payload: {} }));
            break;
            
          default:
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    // Clean up function to close the WebSocket when component unmounts
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [eventId, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-[hsl(var(--quran-green))]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">
          Error Loading Event
        </h2>
        <p className="text-neutral-700 mb-4">
          {error?.message || "Failed to load the event"}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Event Not Found
        </h2>
        <p className="text-neutral-700">
          The event you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  const isEventCreator = user && user.id === event.createdBy ? true : false;

  return (
    <div>
      <div className="mb-4">
        <EventHeader
          event={event}
          onManage={isEventCreator ? handleOpenSettings : undefined}
        />
      </div>

      {!user && (
        <Alert className="mb-6 bg-[hsl(var(--quran-green))]/10 border-[hsl(var(--quran-green))]/20">
          <Info className="h-4 w-4 text-[hsl(var(--quran-green))]" />
          <AlertDescription className="text-sm text-gray-700">
            You can participate without signing in! Anyone can claim, unclaim, and
            mark portions as read.
            <span className="block mt-1 text-xs">
              Creating new khatms requires an account.
            </span>
            <span className="block mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-600">Want to save this circle to your account?</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 border-[hsl(var(--quran-green))] text-[hsl(var(--quran-green))]"
                onClick={() => {
                  // Store current event ID in localStorage to return after login
                  if (event) {
                    localStorage.setItem('quranCircleReturnToEvent', event.id.toString());
                  }
                  openAuthModal('login');
                }}
              >
                Sign in
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Only show non-deleted khatms in the UI */}
      {event.khatms
        .filter((khatm) => !khatm.isDeleted)
        .map((khatm) => (
          <MemoizedKhatmCard
            key={khatm.id}
            khatm={khatm}
            onNewKhatmCreated={handleNewKhatmCreated}
            eventId={eventId}
            isCreator={isEventCreator}
          />
        ))}

      {isEventCreator && event && (
        <CircleSettingsDialog
          isOpen={settingsOpen}
          onClose={handleCloseSettings}
          event={event}
        />
      )}
    </div>
  );
}