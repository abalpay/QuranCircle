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
  onUnclaim: () => void;
  isOwner: boolean;
};

function JuzCard({ juz, onClaim, onMarkAsRead, onUnclaim, isOwner }: JuzCardProps) {
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
  
  return (
    <div 
      className={cn(
        "group relative border rounded-md h-28 p-3 flex flex-col justify-between cursor-pointer transition-colors",
        isUnclaimed ? "bg-white hover:border-[hsl(var(--quran-green))]" : 
        isClaimed ? "bg-[#fdfbf5]" : 
        "bg-[#f7fcfb]"
      )}
      onClick={handleCardClick}
    >
      <div className="text-xs text-gray-500 absolute left-2 top-2">
        {juz.juzNumber}
      </div>
      
      <div className="text-center mt-4">
        <span className="text-base font-medium">
          Juz {juz.juzNumber}
        </span>
      </div>
      
      <div className={cn(
        "text-center text-xs",
        isUnclaimed && "text-gray-400",
        isClaimed && "text-gray-600",
        isRead && "text-[hsl(var(--quran-green))]"
      )}>
        {isUnclaimed ? (
          <span>&nbsp;</span>
        ) : isClaimed ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 justify-center">
              <Clock className="h-3 w-3" />
              <span>In progress</span>
            </div>
            <div className="flex items-center gap-1 mt-1 justify-center">
              <User className="h-3 w-3" />
              <span className="font-medium truncate max-w-[80px]">{juz.claimedByName}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 justify-center">
              <CheckCircle className="h-3 w-3" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1 mt-1 justify-center">
              <User className="h-3 w-3" />
              <span className="font-medium truncate max-w-[80px]">{juz.claimedByName}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Hover overlay for actions */}
      {(isUnclaimed || isClaimed) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          {isUnclaimed ? (
            <Button 
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
              size="sm"
              onClick={handleClaimClick}
            >
              Claim
            </Button>
          ) : isClaimed ? (
            <div className="flex flex-col gap-2">
              <Button 
                className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
                size="sm"
                onClick={handleMarkAsReadClick}
              >
                Mark as Read
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="border-[hsl(var(--quran-green))] text-[hsl(var(--quran-green))]"
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
