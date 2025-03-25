import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function HomePage() {
  const [isCreateCircleOpen, setIsCreateCircleOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();

  const { data: userCircles, isLoading } = useQuery<EventWithKhatms[]>({
    queryKey: ["/api/events"],
    enabled: !!user, // Only fetch if user is logged in
  });

  // Remove unused functions

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
          Welcome to{" "}
          <span className="text-[hsl(var(--quran-green))]">Quran</span>
          <span className="text-black">Circle</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Collaborative Quran reading made simple
        </p>

        <div className="mt-10 mx-auto max-w-xl relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
            </svg>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 pt-10 rounded-lg border border-emerald-100 shadow-sm">
            <blockquote className="italic text-gray-700 text-lg text-center">
              "Recite the Qur'an, for it will come as an intercessor for its
              reciters on the Day of Resurrection."
            </blockquote>
            <div className="mt-4 text-sm text-gray-500 font-medium text-center">
              — Sahih Muslim
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-10">
        <Button
          onClick={() =>
            user ? setIsCreateCircleOpen(true) : openAuthModal("login")
          }
          className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white py-6 px-8 text-lg"
          size="lg"
        >
          {user ? "Create New Khatm Circle" : "Sign In to Create Khatm Circle"}
        </Button>
      </div>

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
                      return circle.khatms?.some(khatm => khatm.isArchived && !khatm.isDeleted);
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
                    circle.khatms?.some(khatm => khatm.isArchived && !khatm.isDeleted)
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

      <div className="bg-white rounded-lg border border-[hsl(var(--quran-border))] p-6 mb-10">
        <h2 className="text-xl font-medium mb-6">How It Works</h2>

        <div className="space-y-8">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-emerald-600"
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
              <h3 className="font-medium text-gray-800 text-lg">
                Create or Join a Circle
              </h3>
              <p className="text-gray-600 mt-1">
                Start a new circle or join an existing one using a link
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
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
              <h3 className="font-medium text-gray-800 text-lg">Claim a Juz</h3>
              <p className="text-gray-600 mt-1">
                Select any available Juz from the Khatm
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-indigo-600"
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
              <h3 className="font-medium text-gray-800 text-lg">
                Complete Your Reading
              </h3>
              <p className="text-gray-600 mt-1">
                Read your Juz and mark it as complete when finished
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-amber-600"
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
              <h3 className="font-medium text-gray-800 text-lg">
                New Khatms Created Automatically
              </h3>
              <p className="text-gray-600 mt-1">
                Once all Juz are claimed, a new Khatm is created automatically
              </p>
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
