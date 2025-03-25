import { Link, useLocation } from "wouter";
import { PlusCircle, LogOut, Home, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import CreateEventDialog from "./CreateEventDialog";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";

export default function MobileNavigation() {
  const [location] = useLocation();
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { openAuthModal } = useAuthModal();
  
  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-40 border-t border-emerald-100">
        <div className="flex justify-around safe-area-inset-bottom">
          <Link href="/">
            <div className={cn(
              "flex flex-col items-center py-3 px-3 cursor-pointer",
              location === "/" ? "text-[hsl(var(--quran-green))]" : "text-neutral-700"
            )}>
              <Home size={20} />
              <span className="text-xs mt-1">Home</span>
            </div>
          </Link>
          
          {user && (
            <button
              type="button"
              onClick={() => setIsCreateEventOpen(true)}
              className="flex flex-col items-center py-3 px-3 text-neutral-700"
            >
              <PlusCircle size={20} />
              <span className="text-xs mt-1">Create</span>
            </button>
          )}
          
          {user ? (
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="flex flex-col items-center py-3 px-3 text-neutral-700"
            >
              <LogOut size={20} />
              <span className="text-xs mt-1">Logout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Check if we're on an event page and save the ID
                const eventPathMatch = location.match(/^\/events\/(\d+)$/);
                if (eventPathMatch) {
                  localStorage.setItem('quranCircleReturnToEvent', eventPathMatch[1]);
                }
                openAuthModal('login');
              }}
              className="flex flex-col items-center py-3 px-3 text-neutral-700"
            >
              <CircleUserRound size={20} />
              <span className="text-xs mt-1">Sign In</span>
            </button>
          )}
        </div>
      </nav>
      
      <CreateEventDialog 
        isOpen={isCreateEventOpen} 
        onClose={() => setIsCreateEventOpen(false)} 
      />
    </>
  );
}
