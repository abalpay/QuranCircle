import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus, Users, ExternalLink, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import CreateCircleDialog from "@/components/CreateCircleDialog";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function HomePage() {
  const [location, navigate] = useLocation();
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const [circleCode, setCircleCode] = useState("");
  const { user, isLoading: authLoading } = useAuth();
  
  const {
    data: userCircles,
    isLoading,
  } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user, // Only fetch if user is logged in
  });
  
  const handleJoinCircle = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (circleCode) {
      // Simple validation - assuming circleCode is just the numeric ID
      const circleId = parseInt(circleCode.trim());
      if (!isNaN(circleId)) {
        navigate(`/event/${circleId}`);
      }
    }
  };
  
  const handleBrowseCircles = () => {
    navigate("/circles");
  };
  
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
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-medium text-[hsl(var(--quran-text))] mb-4">
          Welcome to <span className="text-[hsl(var(--quran-green))]">Quran</span><span className="text-black">.circle</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Join or create a group Quran reading circle with your community
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-lg border border-[hsl(var(--quran-border))] p-6 hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-[hsl(var(--quran-gray))] rounded-full flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-[hsl(var(--quran-green))]" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">
              Create a Circle
            </h2>
            <p className="text-gray-600 mb-6">
              Start a new Quran reading circle and invite others to join
            </p>
            <Button 
              onClick={() => user ? setIsCreateCircleOpen(true) : navigate("/auth?returnTo=/")}
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
            >
              {user ? "Create Circle" : "Sign In to Create"}
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-[hsl(var(--quran-border))] p-6 hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-[hsl(var(--quran-gray))] rounded-full flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-[hsl(var(--quran-green))]" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">
              Browse Circles
            </h2>
            <p className="text-gray-600 mb-6">
              Find and join public Quran reading circles
            </p>
            <Button 
              onClick={() => user ? handleBrowseCircles() : navigate("/auth?returnTo=/circles")}
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white w-full md:w-auto"
            >
              {user ? "Browse Circles" : "Sign In to Browse"}
            </Button>
          </div>
        </div>
      </div>
      
      {user && (
        <div className="mb-10">
          <h2 className="text-xl font-medium text-gray-800 mb-4">
            Your Circles
          </h2>
          
          {isLoading ? (
            <div className="text-center py-6 bg-white rounded-lg border border-[hsl(var(--quran-border))]">
              <p className="text-gray-600">Loading your circles...</p>
            </div>
          ) : userCircles && userCircles.length > 0 ? (
            <div className="grid gap-3">
              {userCircles.map((circle) => (
                <Link key={circle.id} href={`/event/${circle.id}`}>
                  <div className="cursor-pointer block bg-white rounded-lg border border-[hsl(var(--quran-border))] hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center p-4">
                      <div>
                        <h3 className="font-medium text-gray-800">{circle.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Created on {format(new Date(circle.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="bg-[hsl(var(--quran-gray))] p-2 rounded-full">
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-white rounded-lg border border-[hsl(var(--quran-border))]">
              <p className="text-gray-600">You haven't created any circles yet</p>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-white rounded-lg border border-[hsl(var(--quran-border))] p-6 mb-10">
        <h2 className="text-xl font-medium mb-6">
          How It Works
        </h2>
        
        <div className="space-y-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--quran-green))] flex items-center justify-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Create or Join a Circle</h3>
              <p className="text-gray-600">Start a new circle or join an existing one using a link</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--quran-green))] flex items-center justify-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Claim a Juz</h3>
              <p className="text-gray-600">Select any available Juz from the Khatm</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--quran-green))] flex items-center justify-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Complete Your Reading</h3>
              <p className="text-gray-600">Read your Juz and mark it as complete when finished</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--quran-green))] flex items-center justify-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">New Khatms Created Automatically</h3>
              <p className="text-gray-600">Once all Juz are claimed, a new Khatm is created automatically</p>
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
