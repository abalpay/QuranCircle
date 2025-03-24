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
        "group relative border rounded-md h-28 p-3 flex flex-col justify-between cursor-pointer transition-colors",
        isUnclaimed ? "bg-white hover:border-[hsl(var(--quran-green))]" : 
        isClaimed ? "bg-[#fdfbf5]" : 
        "bg-[#f7fcfb]"
      )}
      onClick={isUnclaimed ? onClaim : undefined}
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
      {(isUnclaimed || (isClaimed && isOwner)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          {isUnclaimed ? (
            <Button 
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
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
