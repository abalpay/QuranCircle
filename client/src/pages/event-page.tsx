import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { EventWithKhatms } from "@shared/schema";
import EventHeader from "@/components/EventHeader";
import KhatmCard from "@/components/KhatmCard";
import { useEffect } from "react";

export default function EventPage() {
  const { id } = useParams();
  const eventId = parseInt(id);
  
  const { 
    data: event, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery<EventWithKhatms>({
    queryKey: [`/api/events/${eventId}`]
  });
  
  // Force a refetch when a new khatm is created
  const handleNewKhatmCreated = () => {
    refetch();
  };
  
  // Refresh the data periodically to show updates by other users
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // every 30 seconds
    
    return () => clearInterval(interval);
  }, [refetch]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Event</h2>
        <p className="text-neutral-700 mb-4">{error?.message || "Failed to load the event"}</p>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Event Not Found</h2>
        <p className="text-neutral-700">The event you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }
  
  return (
    <div>
      <EventHeader event={event} />
      
      {event.khatms.map(khatm => (
        <KhatmCard 
          key={khatm.id} 
          khatm={khatm} 
          onNewKhatmCreated={handleNewKhatmCreated}
          eventId={eventId}
        />
      ))}
    </div>
  );
}
