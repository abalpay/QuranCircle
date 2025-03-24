import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, Search, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function CirclesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);
  
  const {
    data: publicCircles,
    isLoading: circlesLoading,
  } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user, // Only fetch if user is logged in
  });
  
  const filteredCircles = publicCircles?.filter(circle => 
    circle.isPublic && circle.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };
  
  // Show loading indicator while checking authentication
  const isLoading = authLoading || circlesLoading;
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-2xl font-medium text-gray-800 mb-4 md:mb-0">
          Browse Quran Reading Circles
        </h1>
        
        <form onSubmit={handleSearch} className="w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search circles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[hsl(var(--quran-gray))] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--quran-green))]"
            />
          </div>
        </form>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--quran-green))]" />
          <span className="ml-2 text-gray-600">Loading circles...</span>
        </div>
      ) : filteredCircles && filteredCircles.length > 0 ? (
        <div className="grid gap-4">
          {filteredCircles.map(circle => (
            <Link key={circle.id} href={`/event/${circle.id}`}>
              <div className="cursor-pointer block bg-white rounded-lg border border-[hsl(var(--quran-border))] hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-medium text-gray-800 mb-2">{circle.name}</h2>
                      {circle.description && (
                        <p className="text-gray-600 mb-4">{circle.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        <span>Created on {format(new Date(circle.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="bg-[hsl(var(--quran-gray))] p-2 rounded-full">
                      <ExternalLink className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-[hsl(var(--quran-border))] rounded-lg bg-white">
          <div className="mb-4">
            <Search className="h-12 w-12 mx-auto text-gray-300" />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">No circles found</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            {searchTerm ? 
              `No circles matching "${searchTerm}" were found. Try a different search term.` : 
              "There are no public circles available at the moment. Try creating your own!"}
          </p>
          <Link href="/">
            <Button className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white">
              Back to Home
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}