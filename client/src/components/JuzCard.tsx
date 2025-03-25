import { Juz } from "@shared/schema";
import { CheckCircle, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useLocation } from "wouter";
import { memo, useCallback } from "react";

type JuzCardProps = {
  juz: Juz;
  onClaim: () => void;
  onMarkAsRead: () => void;
  onUnmarkAsRead: () => void;
  onUnclaim: () => void;
  isOwner: boolean;
};

function JuzCard({ juz, onClaim, onMarkAsRead, onUnmarkAsRead, onUnclaim, isOwner }: JuzCardProps) {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [location, navigate] = useLocation();
  const isUnclaimed = juz.status === 'unclaimed';
  const isClaimed = juz.status === 'claimed';
  const isRead = juz.status === 'read';
  
  // Memoize event handlers to prevent unnecessary re-renders
  const handleCardClick = useCallback(() => {
    if (isUnclaimed) {
      // Allow anonymous users to claim juz
      onClaim();
    }
  }, [isUnclaimed, onClaim]);
  
  const handleClaimClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Allow anonymous users to claim juz
    onClaim();
  }, [onClaim]);
  
  const handleMarkAsReadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead();
  }, [onMarkAsRead]);
  
  const handleUnclaimClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUnclaim();
  }, [onUnclaim]);
  
  const handleUnmarkAsReadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUnmarkAsRead();
  }, [onUnmarkAsRead]);
  
  return (
    <div 
      className={cn(
        "group relative border rounded-lg h-32 p-4 flex flex-col justify-between cursor-pointer transition-all shadow-sm hover:shadow-md",
        isUnclaimed 
          ? "bg-white hover:border-[hsl(var(--quran-green))]" 
          : isClaimed 
            ? "bg-gradient-to-br from-amber-50 to-white border-amber-200" 
            : "bg-gradient-to-br from-emerald-50 to-white border-emerald-200"
      )}
      onClick={handleCardClick}
    >
      <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center">
        <span className="text-sm font-bold">{juz.juzNumber}</span>
      </div>
      
      <div className="text-center mt-5">
        <span className={cn(
          "text-lg font-bold",
          isUnclaimed && "text-gray-700",
          isClaimed && "text-amber-700",
          isRead && "text-emerald-700"
        )}>
          Juz {juz.juzNumber}
        </span>
      </div>
      
      <div className={cn(
        "text-center text-xs",
        isUnclaimed && "text-gray-400",
        isClaimed && "text-amber-600",
        isRead && "text-emerald-600"
      )}>
        {isUnclaimed ? (
          <span className="bg-gray-100 px-2 py-1 rounded inline-block">Available</span>
        ) : isClaimed ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 justify-center bg-amber-100 px-2 py-1 rounded-md">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">In progress</span>
            </div>
            <div className="flex items-center gap-1 mt-2 justify-center">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium truncate max-w-[90px]">{juz.claimedByName}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 justify-center bg-emerald-100 px-2 py-1 rounded-md">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="font-medium">Completed</span>
            </div>
            <div className="flex items-center gap-1 mt-2 justify-center">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium truncate max-w-[90px]">{juz.claimedByName}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Hover overlay for actions */}
      {(isUnclaimed || isClaimed || isRead) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          {isUnclaimed ? (
            <Button 
              className="bg-gradient-to-b from-emerald-500 to-emerald-600 hover:opacity-90 text-white shadow-sm"
              size="sm"
              onClick={handleClaimClick}
            >
              Claim
            </Button>
          ) : isClaimed ? (
            <div className="flex flex-col gap-2">
              <Button 
                className="bg-gradient-to-b from-emerald-500 to-emerald-600 hover:opacity-90 text-white shadow-sm"
                size="sm"
                onClick={handleMarkAsReadClick}
              >
                Mark as Read
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="border-amber-500 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                onClick={handleUnclaimClick}
              >
                Unclaim
              </Button>
            </div>
          ) : isRead ? (
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline"
                size="sm"
                className="border-amber-500 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                onClick={handleUnmarkAsReadClick}
              >
                Unmark as Read
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="border-red-400 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleUnclaimClick}
              >
                Unclaim
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Export a memoized version of the component
export default memo(JuzCard, (prevProps, nextProps) => {
  // Custom equality check to prevent unnecessary re-renders
  return (
    prevProps.juz.status === nextProps.juz.status &&
    prevProps.juz.claimedByName === nextProps.juz.claimedByName &&
    prevProps.isOwner === nextProps.isOwner
  );
});
