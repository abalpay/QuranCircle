import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus, Users, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import CreateEventDialog from "@/components/CreateEventDialog";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function HomePage() {
  const [location, navigate] = useLocation();
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const { user } = useAuth();
  
  const {
    data: userEvents,
    isLoading,
  } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user, // Only fetch if user is logged in
  });
  
  const handleJoinEvent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (eventCode) {
      // Simple validation - assuming eventCode is just the numeric ID
      const eventId = parseInt(eventCode.trim());
      if (!isNaN(eventId)) {
        navigate(`/event/${eventId}`);
      }
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-primary-dark mb-4">
          Welcome to Quran Circle
        </h1>
        <p className="text-lg text-neutral-700">
          Join or create a group Quran reading event with your community
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <Card className="bg-white">
          <CardHeader className="text-center pb-2">
            <Plus className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-xl font-heading font-bold text-primary-dark">
              Create an Event
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-neutral-700 mb-4">
              Start a new Quran reading event and invite others to join
            </p>
            <Button 
              onClick={() => setIsCreateEventOpen(true)}
              className="bg-primary hover:bg-primary-dark"
            >
              Create Event
            </Button>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="text-center pb-2">
            <Users className="mx-auto h-12 w-12 text-accent mb-2" />
            <CardTitle className="text-xl font-heading font-bold text-primary-dark">
              Join an Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-700 mb-4 text-center">
              Enter an event code or use a shared link to participate
            </p>
            <form onSubmit={handleJoinEvent} className="flex max-w-sm mx-auto">
              <Input
                type="text"
                placeholder="Enter event code"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                className="rounded-r-none"
              />
              <Button type="submit" className="bg-accent hover:bg-accent-dark rounded-l-none">
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      {user && (
        <div className="mb-10">
          <h2 className="text-xl font-heading font-bold text-primary-dark mb-4">
            Your Events
          </h2>
          
          {isLoading ? (
            <div className="text-center py-4">
              <p>Loading your events...</p>
            </div>
          ) : userEvents && userEvents.length > 0 ? (
            <div className="grid gap-4">
              {userEvents.map(event => (
                <Link key={event.id} href={`/event/${event.id}`}>
                  <div className="block cursor-pointer">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="flex justify-between items-center p-4">
                        <div>
                          <h3 className="font-medium text-primary-dark">{event.name}</h3>
                          <p className="text-sm text-neutral-600">
                            Created on {format(new Date(event.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <ExternalLink className="h-5 w-5 text-neutral-500" />
                      </CardContent>
                    </Card>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 border rounded-lg bg-neutral-50">
              <p>You haven't created any events yet</p>
            </div>
          )}
        </div>
      )}
      
      <Card className="bg-white mb-10">
        <CardHeader>
          <CardTitle className="text-xl font-heading font-bold text-primary-dark">
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 rounded-full bg-primary bg-opacity-10 p-2 mr-3">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900">Create or Join an Event</h3>
                <p className="text-neutral-700">Start a new event or join an existing one using a link</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 rounded-full bg-primary bg-opacity-10 p-2 mr-3">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900">Claim a Juz</h3>
                <p className="text-neutral-700">Select any available Juz from the Khatm</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 rounded-full bg-primary bg-opacity-10 p-2 mr-3">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900">Complete Your Reading</h3>
                <p className="text-neutral-700">Read your Juz and mark it as complete when finished</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 rounded-full bg-primary bg-opacity-10 p-2 mr-3">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900">New Khatms Created Automatically</h3>
                <p className="text-neutral-700">Once all Juz are claimed, a new Khatm is created automatically</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <CreateEventDialog 
        isOpen={isCreateEventOpen} 
        onClose={() => setIsCreateEventOpen(false)}
      />
    </div>
  );
}
