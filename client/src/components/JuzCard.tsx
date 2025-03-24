import { Juz } from "@shared/schema";
import { CheckCircle, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type JuzCardProps = {
  juz: Juz;
  onClaim: () => void;
  onMarkAsRead: () => void;
  onUnclaim: () => void;
  isOwner: boolean;
};

export default function JuzCard({ juz, onClaim, onMarkAsRead, onUnclaim, isOwner }: JuzCardProps) {
  const isUnclaimed = juz.status === 'unclaimed';
  const isClaimed = juz.status === 'claimed';
  const isRead = juz.status === 'read';
  
  return (
    <div 
      className={cn(
        "group relative border rounded-md p-2.5 quran-card flex flex-col justify-between",
        isUnclaimed && "hover:border-[hsl(var(--quran-green))] cursor-pointer transition-colors",
        isClaimed && "border-[#f8f5ea] bg-[#fdfbf5] hover:shadow-md cursor-pointer transition-all",
        isRead && "border-[#ebf7f5] bg-[#f7fcfb]"
      )}
      onClick={isUnclaimed ? onClaim : undefined}
    >
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {juz.juzNumber}
        </span>
        
        {isRead && (
          <span className="text-[hsl(var(--quran-green))]">
            <CheckCircle className="h-4 w-4" />
          </span>
        )}
      </div>
      
      <div className="text-center mb-1">
        <span className="text-lg block font-medium">
          Juz {juz.juzNumber}
        </span>
      </div>
      
      {!isUnclaimed && (
        <div className="border-t border-[hsl(var(--quran-border))] pt-1.5 mt-1">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
            {isClaimed ? (
              <>
                <Clock className="h-3 w-3" />
                <span>In progress</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 text-[hsl(var(--quran-green))]" />
                <span>Completed</span>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-600">
            <User className="h-3 w-3" />
            <span className="font-medium truncate max-w-[80px]">{juz.claimedByName}</span>
          </div>
        </div>
      )}
      
      {/* Hover overlay for actions */}
      {(isUnclaimed || (isClaimed && isOwner)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          {isUnclaimed ? (
            <Button 
              className="bg-[hsl(var(--quran-green))] hover:bg-[hsl(var(--quran-green))]"
              size="sm"
              onClick={onClaim}
            >
              Claim
            </Button>
          ) : isClaimed && isOwner ? (
            <div className="flex flex-col gap-2">
              <Button 
                className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead();
                }}
              >
                Mark as Read
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="border-[hsl(var(--quran-green))] text-[hsl(var(--quran-green))]"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnclaim();
                }}
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
