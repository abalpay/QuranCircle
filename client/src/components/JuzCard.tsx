import { Juz } from "@shared/schema";
import { CheckCircle } from "lucide-react";
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
        "group relative border rounded-lg p-3 text-center",
        isUnclaimed && "border-neutral-200 hover:border-primary cursor-pointer transition-colors",
        isClaimed && "border-primary bg-primary bg-opacity-5 hover:bg-opacity-10 cursor-pointer transition-colors",
        isRead && "border-accent bg-accent bg-opacity-5"
      )}
      onClick={isUnclaimed ? onClaim : undefined}
    >
      {isRead && (
        <span className="absolute top-2 right-2 text-accent">
          <CheckCircle className="h-5 w-5" />
        </span>
      )}
      
      <h4 className="text-lg font-arabic font-bold mb-1">
        Juz {juz.juzNumber}
      </h4>
      
      {isUnclaimed ? (
        <p className="text-neutral-700 text-sm">Unclaimed</p>
      ) : (
        <>
          <p className={cn(
            "text-sm",
            isClaimed ? "text-primary-dark" : "text-accent-dark"
          )}>
            {isClaimed ? "Claimed by" : "Read by"}
          </p>
          <p className={cn(
            "font-medium",
            isClaimed ? "text-primary-dark" : "text-accent-dark"
          )}>
            {juz.claimedByName}
          </p>
        </>
      )}
      
      {/* Hover overlay for actions */}
      {(isUnclaimed || (isClaimed && isOwner)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          {isUnclaimed ? (
            <Button 
              className="bg-primary hover:bg-primary-dark"
              onClick={onClaim}
            >
              Claim
            </Button>
          ) : isClaimed && isOwner ? (
            <div className="flex flex-col gap-2">
              <Button 
                className="bg-accent hover:bg-accent-dark"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead();
                }}
              >
                Mark as Read
              </Button>
              <Button 
                variant="outline"
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
