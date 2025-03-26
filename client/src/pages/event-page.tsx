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
  EVENT_ARCHIVED = 'EVENT_ARCHIVED',
  EVENT_UNARCHIVED = 'EVENT_UNARCHIVED',
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
  
  // We no longer need to store recently visited circles in localStorage
  // as we're now using bookmarks for logged-in users
  
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
              
              // Update the local state to immediately reflect the deletion
              if (event && message.payload.khatmId) {
                const deletedKhatmId = message.payload.khatmId;
                console.log(`Removing deleted khatm ${deletedKhatmId} from the UI state`);
                
                // Force a refresh instead of trying to update state directly
                // This ensures we get fresh data from the server after deletion
                queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
              }
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
            console.log("Event updated, refreshing event data", message.payload);
            
            if (message.payload && message.payload.eventId) {
              console.log(`Received event update notification for eventId: ${message.payload.eventId}`);
              
              // Immediately update the local state if possible
              if (event && message.payload.event) {
                // First directly update the cached event data to show the changes immediately
                queryClient.setQueryData([`/api/events/${eventId}`], (oldData: any) => {
                  if (oldData) {
                    return {
                      ...oldData,
                      name: message.payload.event.name || oldData.name,
                      description: message.payload.event.description !== undefined ? 
                        message.payload.event.description : oldData.description,
                      deadline: message.payload.event.deadline || oldData.deadline
                    };
                  }
                  return oldData;
                });
                
                console.log("Updated local event data with new values from WebSocket");
              }
            }
            
            // Then do a complete cache refresh
            queryClient.removeQueries({ queryKey: [`/api/events/${eventId}`] });
            queryClient.removeQueries({ queryKey: ['/api/events'] });
            
            // Force immediate refetch with a small delay to ensure server has processed the change
            setTimeout(() => {
              Promise.all([
                refetch(),
                queryClient.refetchQueries({ queryKey: ['/api/events'] })
              ])
                .then(() => console.log("Successfully refetched event data after update"))
                .catch(err => console.error("Error refetching event data after update:", err));
            }, 150);
            break;
            
          case WebSocketMessageType.EVENT_ARCHIVED:
            console.log("Event archived, refreshing event data", message.payload);
            
            if (message.payload && message.payload.eventId) {
              console.log(`Received event archive notification for eventId: ${message.payload.eventId}`);
              
              // Immediately update the local state if possible
              if (event && message.payload.event) {
                // First directly update the cached event data to show archived status immediately
                queryClient.setQueryData([`/api/events/${eventId}`], (oldData: any) => {
                  if (oldData) {
                    return {
                      ...oldData,
                      isArchived: true,
                      archivedAt: message.payload.event.archivedAt || new Date().toISOString()
                    };
                  }
                  return oldData;
                });
              }
            }
            
            // Then do a complete cache refresh
            queryClient.removeQueries({ queryKey: [`/api/events/${eventId}`] });
            queryClient.removeQueries({ queryKey: ['/api/events'] });
            
            // Force immediate refetch with a small delay to ensure server has processed the change
            setTimeout(() => {
              Promise.all([
                refetch(),
                queryClient.refetchQueries({ queryKey: ['/api/events'] })
              ])
                .then(() => console.log("Successfully refetched event data after archive"))
                .catch(err => console.error("Error refetching event data after archive:", err));
            }, 150);
            break;
            
          case WebSocketMessageType.EVENT_UNARCHIVED:
            console.log("Event unarchived, refreshing event data", message.payload);
            
            if (message.payload && message.payload.eventId) {
              console.log(`Received event unarchive notification for eventId: ${message.payload.eventId}`);
              
              // Immediately update the local state if possible
              if (event && message.payload.event) {
                // First directly update the cached event data to show unarchived status immediately
                queryClient.setQueryData([`/api/events/${eventId}`], (oldData: any) => {
                  if (oldData) {
                    return {
                      ...oldData,
                      isArchived: false,
                      archivedAt: null
                    };
                  }
                  return oldData;
                });
              }
            }
            
            // Then do a complete cache refresh
            queryClient.removeQueries({ queryKey: [`/api/events/${eventId}`] });
            queryClient.removeQueries({ queryKey: ['/api/events'] });
            
            // Force immediate refetch with a small delay to ensure server has processed the change
            setTimeout(() => {
              Promise.all([
                refetch(),
                queryClient.refetchQueries({ queryKey: ['/api/events'] })
              ])
                .then(() => console.log("Successfully refetched event data after unarchive"))
                .catch(err => console.error("Error refetching event data after unarchive:", err));
            }, 150);
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

      {/* Show all khatms (deleted ones are truly deleted now) */}
      {event.khatms.map((khatm) => (
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