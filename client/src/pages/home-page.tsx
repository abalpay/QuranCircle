import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Event, EventWithKhatms } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ExternalLink, Loader2, Archive } from "lucide-react";
import CreateCircleDialog from "@/components/CreateCircleDialog";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define WebSocket message types for the homepage
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
  EVENT_CREATED = 'EVENT_CREATED',
  SUBSCRIBE_EVENT = 'SUBSCRIBE_EVENT',
  PING = 'PING',
  PONG = 'PONG',
}

interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

export default function HomePage() {
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [recentlyVisitedCircles, setRecentlyVisitedCircles] = useState<{id: number, name: string, visitedAt: string}[]>([]);
  const { user, isLoading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  const { 
    data: userCircles, 
    isLoading, 
    refetch,
    dataUpdatedAt 
  } = useQuery<EventWithKhatms[]>({
    queryKey: ["/api/events"],
    enabled: !!user, // Only fetch if user is logged in
    refetchOnWindowFocus: true,
    staleTime: 0, // Always treat data as stale to force refetch
    refetchInterval: 10000, // Refresh data every 10 seconds as a fallback
  });
  
  // Set up WebSocket connection for real-time updates if user is logged in
  useEffect(() => {
    if (!user) return;
    
    // Set up WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log("WebSocket connection established for home page");
    };
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle different WebSocket message types
        switch (message.type) {
          case WebSocketMessageType.EVENT_CREATED:
            console.log("New event created:", message.payload.event);
            // Force immediate refetch when a new event is created
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            break;
            
          case WebSocketMessageType.KHATM_CREATED:
            console.log("Khatm created, refreshing events");
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            break;
          case WebSocketMessageType.KHATM_ARCHIVED:
            console.log("Khatm archived, refreshing events", message.payload);
            
            // Add debug info about the payload received
            if (message.payload && message.payload.khatmId) {
              console.log(`Received khatm archive notification for khatmId: ${message.payload.khatmId}, eventId: ${message.payload.eventId}`);
            }
            
            // First invalidate the query to mark it stale
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            
            // Then explicitly remove cached data 
            queryClient.removeQueries({ queryKey: ["/api/events"] });
            
            // Force a direct refetch with some delay to ensure the server updated its state
            setTimeout(() => { 
              refetch()
                .then(() => console.log("Successfully refetched events after khatm archive"))
                .catch(err => console.error("Error refetching events after khatm archive:", err));
            }, 250);
            break;
          case WebSocketMessageType.KHATM_UNARCHIVED:
            console.log("Khatm unarchived, refreshing events", message.payload);
            
            // Add debug info about the payload received
            if (message.payload && message.payload.khatmId) {
              console.log(`Received khatm unarchive notification for khatmId: ${message.payload.khatmId}, eventId: ${message.payload.eventId}`);
            }
            
            // First invalidate the query to mark it stale
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            
            // Then explicitly remove cached data 
            queryClient.removeQueries({ queryKey: ["/api/events"] });
            
            // Force a direct refetch with some delay to ensure the server updated its state
            setTimeout(() => { 
              refetch()
                .then(() => console.log("Successfully refetched events after khatm unarchive"))
                .catch(err => console.error("Error refetching events after khatm unarchive:", err));
            }, 250);
            break;
          case WebSocketMessageType.KHATM_DELETED:
            console.log("Khatm deleted, refreshing events", message.payload);
            
            // Add debug info about the payload received
            if (message.payload && message.payload.khatmId) {
              console.log(`Received khatm deletion notification for khatmId: ${message.payload.khatmId}, eventId: ${message.payload.eventId}`);
            }
            
            // First invalidate the query to mark it stale
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            
            // Then explicitly remove cached data 
            queryClient.removeQueries({ queryKey: ["/api/events"] });
            
            // Force a direct refetch with some delay to ensure the server updated its state
            setTimeout(() => { 
              refetch()
                .then(() => console.log("Successfully refetched events after khatm deletion"))
                .catch(err => console.error("Error refetching events after khatm deletion:", err));
            }, 250);
            break;
          case WebSocketMessageType.EVENT_UPDATED:
            console.log("Event updated, refreshing events");
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            break;
            
          case WebSocketMessageType.PING:
            // Respond to ping with pong
            ws.send(JSON.stringify({ type: WebSocketMessageType.PONG }));
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed for home page");
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [user, queryClient]);
  
  // Load recently visited circles from localStorage
  useEffect(() => {
    if (!user) {
      try {
        const visitedEvents = JSON.parse(localStorage.getItem('quranCircleVisitedEvents') || '[]');
        setRecentlyVisitedCircles(visitedEvents);
      } catch (error) {
        console.error('Error loading visited circles from localStorage:', error);
      }
    }
  }, [user]);

  // Show loading indicator while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--quran-green))] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-16">
        {/* Background decorative pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>
        
        {/* Hero Section */}
        <div className="relative text-center py-12 md:py-16 px-4 md:px-8 bg-gradient-to-b from-emerald-50/70 to-transparent rounded-3xl shadow-sm mb-8">
          <div className="max-w-2xl mx-auto">
            <img src="/quran-icon.png" alt="Quran Icon" className="w-16 h-16 mx-auto mb-6" />
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-emerald-500">
              Welcome to <span className="font-extrabold">QuranCircle</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-xl mx-auto mb-8 leading-relaxed">
              Collaborative Quran reading made simple
            </p>
            
            {/* Decorative divider */}
            <div className="flex items-center justify-center mb-8">
              <div className="h-[1px] bg-emerald-200 w-16"></div>
              <div className="mx-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                </svg>
              </div>
              <div className="h-[1px] bg-emerald-200 w-16"></div>
            </div>
            
            {/* Hadith quote card with elevated design */}
            <div className="relative bg-white rounded-xl shadow-lg border border-emerald-100 p-8 md:p-10 max-w-xl mx-auto transform transition-transform hover:scale-[1.01]">
              <blockquote className="italic text-gray-700 text-xl md:text-2xl text-center leading-relaxed">
                "Recite the Qur'an, for it will come as an intercessor for its
                reciters on the Day of Resurrection."
              </blockquote>
              <div className="mt-6 text-sm text-emerald-700 font-medium text-center">
                — Sahih Muslim
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-14">
        <Button
          onClick={() =>
            user ? setIsCreateCircleOpen(true) : openAuthModal("login")
          }
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-6 px-10 text-lg shadow-lg shadow-emerald-200 transition-all duration-300 group relative overflow-hidden"
          size="lg"
        >
          <span className="relative z-10 flex items-center gap-2">
            {user ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                Create New Khatm Circle
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Sign In to Create Khatm Circle
              </>
            )}
          </span>
          <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
        </Button>
      </div>

      {/* Show recently visited circles for non-logged in users */}
      {!user && recentlyVisitedCircles.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-medium text-gray-800 mb-4">
            Recently Visited Circles
          </h2>
          <div className="grid gap-3">
            {recentlyVisitedCircles.map((circle) => (
              <Link key={circle.id} href={`/event/${circle.id}`}>
                <div className="cursor-pointer block bg-white rounded-lg border border-[hsl(var(--quran-border))] hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {circle.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Visited on{" "}
                        {format(new Date(circle.visitedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openAuthModal('login');
                        }}
                        className="text-xs hover:bg-[hsl(var(--quran-green))]/10 hover:text-[hsl(var(--quran-green))] transition-colors text-gray-500 bg-gray-100 px-2 py-1 rounded"
                      >
                        Sign in to save
                      </button>
                      <div className="bg-[hsl(var(--quran-gray))] p-2 rounded-full">
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {user && (
        <div className="mb-10">
          <h2 className="text-xl font-medium text-gray-800 mb-4">
            Your Reading Circles
          </h2>

          {isLoading ? (
            <div className="text-center py-6 bg-white rounded-lg border border-[hsl(var(--quran-border))]">
              <p className="text-gray-600">Loading your circles...</p>
            </div>
          ) : userCircles && userCircles.length > 0 ? (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
              
              <TabsContent value="active">
                <div className="grid gap-3">
                  {userCircles
                    .filter(circle => {
                      // Filter circles with at least one non-archived khatm
                      return circle.khatms?.some(khatm => !khatm.isArchived && !khatm.isDeleted);
                    })
                    .map((circle) => (
                      <Link key={circle.id} href={`/event/${circle.id}`}>
                        <div className="cursor-pointer block bg-white rounded-lg border border-[hsl(var(--quran-border))] hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center p-4">
                            <div>
                              <h3 className="font-medium text-gray-800">
                                {circle.name}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                Created on{" "}
                                {format(new Date(circle.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="bg-[hsl(var(--quran-gray))] p-2 rounded-full">
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  {userCircles.filter(circle => 
                    circle.khatms?.some(khatm => !khatm.isArchived && !khatm.isDeleted)
                  ).length === 0 && (
                    <div className="text-center py-6 bg-white rounded-lg border border-[hsl(var(--quran-border))]">
                      <p className="text-gray-600">
                        You don't have any active circles
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="archived">
                <div className="grid gap-3">
                  {userCircles
                    .filter(circle => {
                      // Filter circles with at least one archived khatm
                      return circle.khatms?.some(khatm => khatm.isArchived === true && !khatm.isDeleted);
                    })
                    .map((circle) => (
                      <Link key={circle.id} href={`/event/${circle.id}`}>
                        <div className="cursor-pointer block bg-white rounded-lg border border-amber-200 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center p-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-800">
                                  {circle.name}
                                </h3>
                                <Archive className="h-4 w-4 text-amber-500" />
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                Created on{" "}
                                {format(new Date(circle.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="bg-[hsl(var(--quran-gray))] p-2 rounded-full">
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  {userCircles.filter(circle => 
                    circle.khatms?.some(khatm => khatm.isArchived === true && !khatm.isDeleted)
                  ).length === 0 && (
                    <div className="text-center py-6 bg-white rounded-lg border border-[hsl(var(--quran-border))]">
                      <p className="text-gray-600">
                        You don't have any archived circles
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-6 bg-white rounded-lg border border-[hsl(var(--quran-border))]">
              <p className="text-gray-600">
                You haven't created any circles yet
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-gradient-to-br from-white to-emerald-50 rounded-xl border border-emerald-100 p-4 md:p-8 shadow-sm mb-8 md:mb-16">
        <h2 className="text-2xl font-bold text-emerald-800 mb-8 text-center">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-emerald-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center mr-4 shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-emerald-700 text-lg">
                  Create or Join a Circle
                </h3>
                <p className="text-gray-600 mt-2 leading-relaxed">
                  Start a new circle or join an existing one using a shared link
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center mr-4 shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-blue-700 text-lg">Claim a Juz</h3>
                <p className="text-gray-600 mt-2 leading-relaxed">
                  Select any available Juz from the Khatm that you'd like to read
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center mr-4 shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-indigo-700 text-lg">
                  Complete Your Reading
                </h3>
                <p className="text-gray-600 mt-2 leading-relaxed">
                  Read your Juz and mark it as complete when you've finished
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-amber-100 transition-all duration-300 hover:shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center mr-4 shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-amber-700 text-lg">
                  New Khatms Created Automatically
                </h3>
                <p className="text-gray-600 mt-2 leading-relaxed">
                  Once all Juz are claimed, a new Khatm will be created automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateCircleDialog
        isOpen={isCreateCircleOpen}
        onClose={() => setIsCreateCircleOpen(false)}
      />
    </div>
  );
}
