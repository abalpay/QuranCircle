import { KhatmWithJuzs } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { UserCheck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import JuzCard from "./JuzCard";
import { useState, useCallback, memo, useMemo } from "react";
import ClaimJuzDialog from "./ClaimJuzDialog";
import MarkAsReadDialog from "./MarkAsReadDialog";
import UnclaimDialog from "./UnclaimDialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";

type KhatmCardProps = {
  khatm: KhatmWithJuzs;
  onNewKhatmCreated?: () => void;
  eventId: number;
};

// Define the component separately so we can wrap it with memo
function KhatmCardComponent({ khatm, onNewKhatmCreated, eventId }: KhatmCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  
  // Dialog state
  const [selectedJuz, setSelectedJuz] = useState<{ khatmId: number; juzNumber: number } | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [isReadDialogOpen, setIsReadDialogOpen] = useState(false);
  const [isUnclaimDialogOpen, setIsUnclaimDialogOpen] = useState(false);
  
  // Memoize calculated values to prevent recalculation on every render
  const progressPercentage = useMemo(() => 
    Math.round((khatm.readCount / 30) * 100), 
    [khatm.readCount]
  );
  
  // If this is an empty khatm (auto-generated next)
  const isEmpty = useMemo(() => 
    khatm.claimedCount === 0,
    [khatm.claimedCount]
  );
  
  // Mutation for claiming a single Juz
  const claimJuzMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber, claimerName }: { khatmId: number; juzNumber: number; claimerName: string }) => {
      const res = await apiRequest("POST", "/api/juz/claim", {
        khatmId,
        juzNumber,
        claimerName
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Check if a new khatm was created
      if (data.newKhatmCreated && onNewKhatmCreated) {
        onNewKhatmCreated();
      }
      
      // Close the dialog and reset state
      setIsClaimDialogOpen(false);
      setSelectedJuz(null);
    },
    onError: (error: Error) => {
      // Handle the case where another user claimed this Juz first
      if (error.message.includes("already claimed")) {
        toast({
          title: "This Juz has already been claimed",
          description: "Someone else just claimed this Juz. Please select another one.",
          variant: "destructive"
        });
        
        // Refresh to get the latest data
        queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      } else {
        toast({
          title: "Failed to claim Juz",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  });
  
  // Mutation for marking a Juz as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber }: { khatmId: number; juzNumber: number }) => {
      const res = await apiRequest("POST", "/api/juz/read", {
        khatmId,
        juzNumber
      });
      return await res.json();
    },
    onSuccess: () => {
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Close the dialog and reset state
      setIsReadDialogOpen(false);
      setSelectedJuz(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark as read",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for unclaiming a Juz
  const unclaimJuzMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber }: { khatmId: number; juzNumber: number }) => {
      const res = await apiRequest("POST", "/api/juz/unclaim", {
        khatmId,
        juzNumber
      });
      return await res.json();
    },
    onSuccess: () => {
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Close the dialog and reset state
      setIsUnclaimDialogOpen(false);
      setSelectedJuz(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unclaim Juz",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Memoized handlers for opening dialogs
  const handleClaimJuz = useCallback((juzNumber: number) => {
    setSelectedJuz({ khatmId: khatm.id, juzNumber });
    setIsClaimDialogOpen(true);
  }, [khatm.id]);
  
  const handleMarkAsRead = useCallback((juzNumber: number) => {
    setSelectedJuz({ khatmId: khatm.id, juzNumber });
    setIsReadDialogOpen(true);
  }, [khatm.id]);
  
  const handleUnclaim = useCallback((juzNumber: number) => {
    setSelectedJuz({ khatmId: khatm.id, juzNumber });
    setIsUnclaimDialogOpen(true);
  }, [khatm.id]);
  
  // Memoized dialog submission handlers
  const onClaimSubmit = useCallback((claimerName: string, juzNumbers: number[]) => {
    if (!selectedJuz || juzNumbers.length === 0) return;
    
    claimJuzMutation.mutate({
      khatmId: selectedJuz.khatmId,
      juzNumber: juzNumbers[0],
      claimerName
    });
    // Note: Dialog closing is handled in mutation success callback
  }, [selectedJuz, claimJuzMutation]);
  
  const onMarkAsReadSubmit = useCallback(() => {
    if (!selectedJuz) return;
    
    markAsReadMutation.mutate({
      khatmId: selectedJuz.khatmId,
      juzNumber: selectedJuz.juzNumber
    });
    // Note: Dialog closing is handled in mutation success callback
  }, [selectedJuz, markAsReadMutation]);
  
  const onUnclaimSubmit = useCallback(() => {
    if (!selectedJuz) return;
    
    unclaimJuzMutation.mutate({
      khatmId: selectedJuz.khatmId,
      juzNumber: selectedJuz.juzNumber
    });
    // Note: Dialog closing is handled in mutation success callback
  }, [selectedJuz, unclaimJuzMutation]);
  
  // Memoize selected juz details for the dialog
  const selectedJuzDetails = useMemo(() => 
    selectedJuz 
      ? khatm.juzs.find(juz => juz.juzNumber === selectedJuz.juzNumber)
      : null,
    [selectedJuz, khatm.juzs]
  );
  
  // Memoize available Juzs for claim dialog
  const availableJuzs = useMemo(() => 
    khatm.juzs
      .filter(juz => juz.status === 'unclaimed')
      .map(juz => juz.juzNumber),
    [khatm.juzs]
  );
  
  return (
    <>
      <div className={`quran-card p-5 mb-8 ${isEmpty ? 'border-2 border-dashed border-[hsl(var(--quran-light-green))]' : ''}`}>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <h3 className="text-xl font-medium text-[hsl(var(--quran-text))]">
            Khatm #{khatm.khatmNumber}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center text-xs bg-[hsl(var(--quran-gray))] px-2.5 py-1 rounded-md">
              <UserCheck className="text-[hsl(var(--quran-green))] mr-1 h-3.5 w-3.5" />
              <span className="font-medium">{khatm.claimedCount}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span className="text-gray-500">30</span>
              <span className="ml-1 text-gray-600">Claimed</span>
            </div>
            
            {khatm.readCount > 0 && (
              <div className="inline-flex items-center text-xs bg-[hsl(var(--quran-gray))] px-2.5 py-1 rounded-md">
                <CheckCircle className="text-[hsl(var(--quran-green))] mr-1 h-3.5 w-3.5" />
                <span className="font-medium">{khatm.readCount}</span>
                <span className="mx-1 text-gray-500">/</span>
                <span className="text-gray-500">30</span>
                <span className="ml-1 text-gray-600">Read</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 w-full bg-[hsl(var(--quran-gray))] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[hsl(var(--quran-green))] rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-right text-gray-500">
            {progressPercentage}% completed
          </div>
        </div>

        {isEmpty ? (
          <div className="text-center py-10 bg-[hsl(var(--quran-gray))/30] rounded-md">
            <p className="text-base font-medium text-gray-600 mb-4">Ready for new participants!</p>
            {/* Allow any user (including anonymous) to claim a Juz */}
            <Button 
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white" 
              onClick={() => handleClaimJuz(1)}
            >
              Claim a Juz
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {khatm.juzs.map(juz => (
              <JuzCard 
                key={juz.id} 
                juz={juz}
                onClaim={() => handleClaimJuz(juz.juzNumber)}
                onMarkAsRead={() => handleMarkAsRead(juz.juzNumber)}
                onUnclaim={() => handleUnclaim(juz.juzNumber)}
                isOwner={user && juz.claimedByUserId ? user.id === juz.claimedByUserId : false}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Dialogs - with memoized close handlers */}
      <ClaimJuzDialog 
        isOpen={isClaimDialogOpen} 
        onClose={useCallback(() => setIsClaimDialogOpen(false), [setIsClaimDialogOpen])}
        juzNumber={selectedJuz?.juzNumber || 1}
        onSubmit={onClaimSubmit}
        defaultName={user?.username || localStorage.getItem('quranCircleClaimerName') || ''}
        availableJuzs={availableJuzs}
      />
      
      <MarkAsReadDialog
        isOpen={isReadDialogOpen && selectedJuz !== null}
        onClose={useCallback(() => setIsReadDialogOpen(false), [setIsReadDialogOpen])}
        juzNumber={selectedJuz?.juzNumber || 1}
        onConfirm={onMarkAsReadSubmit}
      />
      
      <UnclaimDialog
        isOpen={isUnclaimDialogOpen && selectedJuz !== null}
        onClose={useCallback(() => setIsUnclaimDialogOpen(false), [setIsUnclaimDialogOpen])}
        juzNumber={selectedJuz?.juzNumber || 1}
        claimedByName={selectedJuzDetails?.claimedByName || ''}
        onConfirm={onUnclaimSubmit}
      />
    </>
  );
}

// Export a memoized version of the component to prevent unnecessary rerenders
export default memo(KhatmCardComponent);
