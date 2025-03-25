import { KhatmWithJuzs, EventWithKhatms } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { UserCheck, CheckCircle, ArchiveIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import JuzCard from "./JuzCard";
import { useState, useCallback, memo, useMemo } from "react";
import ClaimJuzDialog from "./ClaimJuzDialog";
import MarkAsReadDialog from "./MarkAsReadDialog";
import UnclaimDialog from "./UnclaimDialog";
import UnmarkReadDialog from "./UnmarkReadDialog";
import KhatmActionsDialog from "./KhatmActionsDialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { Badge } from "@/components/ui/badge";

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
  const [isUnmarkReadDialogOpen, setIsUnmarkReadDialogOpen] = useState(false);
  
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
      const response = await apiRequest("POST", "/api/juz/claim", {
        khatmId,
        juzNumber,
        claimerName
      });
      return await response.json();
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
      console.error("Failed to claim Juz:", error);
      
      // Refresh to get the latest data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Close dialog and reset state
      setIsClaimDialogOpen(false);
      setSelectedJuz(null);
    }
  });
  
  // Mutation for marking a Juz as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber }: { khatmId: number; juzNumber: number }) => {
      const response = await apiRequest("POST", "/api/juz/read", {
        khatmId,
        juzNumber
      });
      return await response.json();
    },
    onSuccess: () => {
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Close the dialog and reset state
      setIsReadDialogOpen(false);
      setSelectedJuz(null);
    },
    onError: (error: Error) => {
      console.error("Failed to mark as read:", error);
      
      // Close dialog and reset state
      setIsReadDialogOpen(false);
      setSelectedJuz(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
    }
  });
  
  // Mutation for unclaiming a Juz
  const unclaimJuzMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber }: { khatmId: number; juzNumber: number }) => {
      const response = await apiRequest("POST", "/api/juz/unclaim", {
        khatmId,
        juzNumber
      });
      return await response.json();
    },
    onSuccess: () => {
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Close the dialog and reset state
      setIsUnclaimDialogOpen(false);
      setSelectedJuz(null);
    },
    onError: (error: Error) => {
      console.error("Failed to unclaim Juz:", error);
      
      // Close dialog and reset state
      setIsUnclaimDialogOpen(false);
      setSelectedJuz(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
    }
  });
  
  // Mutation for unmarking a Juz as read (changing from 'read' back to 'claimed')
  const unmarkAsReadMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber }: { khatmId: number; juzNumber: number }) => {
      const response = await apiRequest("POST", "/api/juz/unmark-read", {
        khatmId,
        juzNumber
      });
      return await response.json();
    },
    onSuccess: () => {
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Close the dialog and reset state
      setIsUnmarkReadDialogOpen(false);
      setSelectedJuz(null);
    },
    onError: (error: Error) => {
      console.error("Failed to unmark Juz as read:", error);
      
      // Close dialog and reset state
      setIsUnmarkReadDialogOpen(false);
      setSelectedJuz(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
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
  
  const handleUnmarkAsRead = useCallback((juzNumber: number) => {
    setSelectedJuz({ khatmId: khatm.id, juzNumber });
    setIsUnmarkReadDialogOpen(true);
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
  
  const onUnmarkAsReadSubmit = useCallback(() => {
    if (!selectedJuz) return;
    
    unmarkAsReadMutation.mutate({
      khatmId: selectedJuz.khatmId,
      juzNumber: selectedJuz.juzNumber
    });
    // Note: Dialog closing is handled in mutation success callback
  }, [selectedJuz, unmarkAsReadMutation]);
  
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
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-medium text-[hsl(var(--quran-text))]">
              Khatm #{khatm.khatmNumber}
            </h3>
            
            {khatm.isArchived && (
              <Badge variant="secondary" className="flex items-center gap-1 text-amber-600 bg-amber-100 hover:bg-amber-100">
                <ArchiveIcon className="h-3 w-3" />
                Archived
              </Badge>
            )}

            {khatm.isDeleted && (
              <Badge variant="destructive" className="flex items-center gap-1">
                Deleted
              </Badge>
            )}
          </div>
          
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
            
            {/* Khatm Actions Dialog - Only shown for event creator */}
            {user && (
              <KhatmActionsDialog 
                khatm={khatm} 
                eventId={eventId} 
                isCreator={true} 
              />
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

        {/* Archived Khatm Message */}
        {khatm.isArchived && (
          <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-md mb-4">
            <ArchiveIcon className="h-10 w-10 mx-auto mb-3 text-amber-500" />
            <p className="text-amber-800 font-medium mb-1">This Khatm has been archived by the circle creator</p>
            <p className="text-amber-700 text-sm">Archived khatms are read-only and no longer accept new participants</p>
          </div>
        )}
        
        {/* Deleted Khatm Message */}
        {khatm.isDeleted && (
          <div className="text-center py-8 bg-red-50 border border-red-200 rounded-md mb-4">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />
            <p className="text-red-800 font-medium mb-1">This Khatm has been deleted</p>
            <p className="text-red-700 text-sm">The khatm is no longer available for participation</p>
          </div>
        )}
        
        {isEmpty && !khatm.isArchived && !khatm.isDeleted ? (
          <div className="text-center py-10 bg-[hsl(var(--quran-gray))/30] rounded-md">
            <p className="text-base font-medium text-gray-600 mb-4">Ready for new participants!</p>
            {/* Allow any user (including anonymous) to claim a Juz */}
            <Button 
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white" 
              onClick={() => handleClaimJuz(1)}
              disabled={khatm.isArchived || khatm.isDeleted}
            >
              Claim a Juz
            </Button>
          </div>
        ) : !khatm.isArchived && !khatm.isDeleted ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {khatm.juzs.map(juz => (
              <JuzCard 
                key={juz.id} 
                juz={juz}
                onClaim={() => handleClaimJuz(juz.juzNumber)}
                onMarkAsRead={() => handleMarkAsRead(juz.juzNumber)}
                onUnmarkAsRead={() => handleUnmarkAsRead(juz.juzNumber)}
                onUnclaim={() => handleUnclaim(juz.juzNumber)}
                isOwner={user && juz.claimedByUserId ? user.id === juz.claimedByUserId : false}
              />
            ))}
          </div>
        ) : (
          // For archived or deleted khatms, show a read-only view of juzs
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 opacity-80">
            {khatm.juzs.map(juz => (
              <div 
                key={juz.id}
                className={`quran-juz-card relative p-3 rounded-md shadow-sm text-center border ${
                  juz.status === 'read' 
                    ? 'bg-green-50 border-green-200' 
                    : juz.status === 'claimed' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-lg font-medium">
                  {juz.juzNumber}
                </div>
                <div className={`text-xs font-medium mt-1 ${
                  juz.status === 'read' 
                    ? 'text-green-600' 
                    : juz.status === 'claimed' 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                }`}>
                  {juz.status === 'read' 
                    ? 'Completed' 
                    : juz.status === 'claimed' 
                      ? 'Claimed' 
                      : 'Available'}
                </div>
                {juz.claimedByName && (
                  <div className="text-xs text-gray-500 mt-1 truncate max-w-full" title={juz.claimedByName}>
                    {juz.claimedByName}
                  </div>
                )}
              </div>
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
      
      <UnmarkReadDialog
        isOpen={isUnmarkReadDialogOpen && selectedJuz !== null}
        onClose={useCallback(() => setIsUnmarkReadDialogOpen(false), [setIsUnmarkReadDialogOpen])}
        juzNumber={selectedJuz?.juzNumber || 1}
        claimedByName={selectedJuzDetails?.claimedByName || ''}
        onConfirm={onUnmarkAsReadSubmit}
      />
    </>
  );
}

// Export a memoized version of the component to prevent unnecessary rerenders
export default memo(KhatmCardComponent);
