import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Info } from "lucide-react";
import { EventWithKhatms } from "@shared/schema";
import EventHeader from "@/components/EventHeader";
import KhatmCard from "@/components/KhatmCard";
import { useCallback, memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CircleSettingsDialog from "@/components/CircleSettingsDialog";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";

// Memoized KhatmCard component to prevent unnecessary re-renders
const MemoizedKhatmCard = memo(KhatmCard);

export default function EventPage() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id ?? "0");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useAuth();

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

  // Handle manual refresh with button animation
  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().then(() => {
      setLastRefreshed(new Date());
      setTimeout(() => setRefreshing(false), 500); // Keep animation for at least 500ms
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

  // Refresh the data periodically to show updates by other users (less frequent)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only auto-refresh if the user hasn't interacted with page for 1 minute
      if (new Date().getTime() - lastRefreshed.getTime() > 60000) {
        refetch().then(() => {
          setLastRefreshed(new Date());
        });
      }
    }, 60000); // every 60 seconds instead of 30

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
      <div className="flex justify-between items-center mb-4">
        <EventHeader
          event={event}
          onManage={isEventCreator ? handleOpenSettings : undefined}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          className="flex items-center gap-1"
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          <span className="text-sm">Refresh</span>
        </Button>
      </div>

      <Alert className="mb-6 bg-[hsl(var(--quran-green))]/10 border-[hsl(var(--quran-green))]/20">
        <Info className="h-4 w-4 text-[hsl(var(--quran-green))]" />
        <AlertDescription className="text-sm text-gray-700">
          You can participate without signing in! Anyone can claim, unclaim, and
          mark portions as read.
          <span className="block mt-1 text-xs">
            Creating new khatms requires an account.
          </span>
          {!user && (
            <span className="block mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-600">Want to save this circle to your account?</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 border-[hsl(var(--quran-green))] text-[hsl(var(--quran-green))]"
                onClick={() => useAuthModal().openAuthModal('login')}
              >
                Sign in
              </Button>
            </span>
          )}
        </AlertDescription>
      </Alert>

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
