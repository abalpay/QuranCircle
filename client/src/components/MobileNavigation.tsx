import { Link, useLocation } from "wouter";
import { BookOpen, PlusCircle, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import CreateEventDialog from "./CreateEventDialog";
import { useAuth } from "@/hooks/use-auth";

export default function MobileNavigation() {
  const [location] = useLocation();
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const { user } = useAuth();
  
  // Don't show nav bar for authenticated users
  if (user) return null;
  
  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-40">
        <div className="flex justify-around">
          <Link href="/">
            <div className={cn(
              "flex flex-col items-center py-3 px-5 cursor-pointer",
              location === "/" ? "text-primary" : "text-neutral-700"
            )}>
              <BookOpen size={20} />
              <span className="text-xs mt-1">Events</span>
            </div>
          </Link>
          
          <button
            type="button"
            onClick={() => setIsCreateEventOpen(true)}
            className="flex flex-col items-center py-3 px-5 text-neutral-700"
          >
            <PlusCircle size={20} />
            <span className="text-xs mt-1">New Event</span>
          </button>
          
          <Link href="/auth">
            <div className={cn(
              "flex flex-col items-center py-3 px-5 cursor-pointer",
              location === "/auth" ? "text-primary" : "text-neutral-700"
            )}>
              <UserCircle size={20} />
              <span className="text-xs mt-1">Account</span>
            </div>
          </Link>
        </div>
      </nav>
      
      <CreateEventDialog 
        isOpen={isCreateEventOpen} 
        onClose={() => setIsCreateEventOpen(false)} 
      />
    </>
  );
}
