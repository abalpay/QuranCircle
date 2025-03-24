import { KhatmWithJuzs } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { UserCheck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import JuzCard from "./JuzCard";
import { useState } from "react";
import ClaimJuzDialog from "./ClaimJuzDialog";
import MarkAsReadDialog from "./MarkAsReadDialog";
import UnclaimDialog from "./UnclaimDialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type KhatmCardProps = {
  khatm: KhatmWithJuzs;
  onNewKhatmCreated?: () => void;
  eventId: number;
};

export default function KhatmCard({ khatm, onNewKhatmCreated, eventId }: KhatmCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedJuz, setSelectedJuz] = useState<{ khatmId: number; juzNumber: number } | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [isReadDialogOpen, setIsReadDialogOpen] = useState(false);
  const [isUnclaimDialogOpen, setIsUnclaimDialogOpen] = useState(false);
  
  const progressPercentage = Math.round((khatm.readCount / 30) * 100);
  
  // If this is an empty khatm (auto-generated next)
  const isEmpty = khatm.claimedCount === 0;
  
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
      toast({ 
        title: "Juz claimed successfully",
        description: "You have claimed this Juz for reading"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Check if a new khatm was created
      if (data.newKhatmCreated && onNewKhatmCreated) {
        onNewKhatmCreated();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to claim Juz",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const markAsReadMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber }: { khatmId: number; juzNumber: number }) => {
      const res = await apiRequest("POST", "/api/juz/read", {
        khatmId,
        juzNumber
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Juz marked as read",
        description: "Thank you for completing this portion"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to mark as read",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation for claiming multiple Juz at once
  const claimMultipleJuzMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumbers, claimerName }: { khatmId: number; juzNumbers: number[]; claimerName: string }) => {
      const res = await apiRequest("POST", "/api/juz/claim-multiple", {
        khatmId,
        juzNumbers,
        claimerName
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: `${data.claimedCount} Juz portions claimed successfully`,
        description: "You have claimed these portions for reading"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Check if a new khatm was created
      if (data.newKhatmCreated && onNewKhatmCreated) {
        onNewKhatmCreated();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to claim Juz portions",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const unclaimJuzMutation = useMutation({
    mutationFn: async ({ khatmId, juzNumber }: { khatmId: number; juzNumber: number }) => {
      const res = await apiRequest("POST", "/api/juz/unclaim", {
        khatmId,
        juzNumber
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Juz unclaimed",
        description: "The Juz is now available for others to claim"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to unclaim Juz",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleClaimJuz = (juzNumber: number) => {
    setDialogState({
      ...dialogState,
      selectedJuz: { khatmId: khatm.id, juzNumber },
      isClaimDialogOpen: true
    });
  };
  
  const handleMarkAsRead = (juzNumber: number) => {
    setDialogState({
      ...dialogState,
      selectedJuz: { khatmId: khatm.id, juzNumber },
      isReadDialogOpen: true
    });
  };
  
  const handleUnclaim = (juzNumber: number) => {
    setDialogState({
      ...dialogState,
      selectedJuz: { khatmId: khatm.id, juzNumber },
      isUnclaimDialogOpen: true
    });
  };
  
  const onClaimSubmit = (claimerName: string, juzNumbers: number[]) => {
    if (selectedJuz) {
      if (juzNumbers.length === 1) {
        // Use the single Juz claim API for one selection
        claimJuzMutation.mutate({
          khatmId: selectedJuz.khatmId,
          juzNumber: juzNumbers[0],
          claimerName
        });
      } else {
        // Use the multiple Juz claim API for multiple selections
        claimMultipleJuzMutation.mutate({
          khatmId: selectedJuz.khatmId,
          juzNumbers,
          claimerName
        });
      }
      // Wait a moment before closing to avoid state update conflicts
      setTimeout(() => {
        setIsClaimDialogOpen(false);
        setSelectedJuz(null);
      }, 100);
    }
  };
  
  const onMarkAsReadSubmit = () => {
    if (selectedJuz) {
      markAsReadMutation.mutate({
        khatmId: selectedJuz.khatmId,
        juzNumber: selectedJuz.juzNumber
      });
      // Wait a moment before closing to avoid state update conflicts
      setTimeout(() => {
        setIsReadDialogOpen(false);
        setSelectedJuz(null);
      }, 100);
    }
  };
  
  const onUnclaimSubmit = () => {
    if (selectedJuz) {
      unclaimJuzMutation.mutate({
        khatmId: selectedJuz.khatmId,
        juzNumber: selectedJuz.juzNumber
      });
      // Wait a moment before closing to avoid state update conflicts
      setTimeout(() => {
        setIsUnclaimDialogOpen(false);
        setSelectedJuz(null);
      }, 100);
    }
  };
  
  // Find the selected juz details for the dialog
  const selectedJuzDetails = selectedJuz 
    ? khatm.juzs.find(juz => juz.juzNumber === selectedJuz.juzNumber)
    : null;
  
  return (
    <>
      <div className={`bg-white rounded-lg shadow-md p-5 mb-6 ${isEmpty ? 'border-2 border-dashed border-primary-light' : ''}`}>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h3 className="text-xl font-heading font-bold text-primary-dark">
            Khatm #{khatm.khatmNumber}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center bg-neutral-100 px-3 py-1 rounded-full">
              <UserCheck className="text-accent-dark mr-1 h-4 w-4" />
              <span>{khatm.claimedCount}</span>
              <span className="mx-1">/</span>
              <span>30</span>
              <span className="ml-1">Juz Claimed</span>
            </div>
            
            {khatm.readCount > 0 && (
              <div className="inline-flex items-center bg-neutral-100 px-3 py-1 rounded-full">
                <CheckCircle className="text-accent-dark mr-1 h-4 w-4" />
                <span>{khatm.readCount}</span>
                <span className="mx-1">/</span>
                <span>30</span>
                <span className="ml-1">Juz Read</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progressPercentage} />
        </div>

        {isEmpty ? (
          <div className="text-center py-8">
            <p className="text-lg font-medium text-neutral-700 mb-4">Ready for new participants!</p>
            <Button className="bg-primary hover:bg-primary-dark" onClick={() => handleClaimJuz(1)}>
              Claim a Juz
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
      
      {selectedJuz && (
        <>
          <ClaimJuzDialog 
            isOpen={isClaimDialogOpen}
            onClose={() => {
              setIsClaimDialogOpen(false);
              // Don't clear selectedJuz here as it's needed for the dialog to know what juzNumber to display
            }}
            juzNumber={selectedJuz.juzNumber}
            onSubmit={onClaimSubmit}
            defaultName={user?.username || ''}
            availableJuzs={khatm.juzs
              .filter(juz => juz.status === 'unclaimed')
              .map(juz => juz.juzNumber)
            }/>
          
          <MarkAsReadDialog
            isOpen={isReadDialogOpen}
            onClose={() => {
              setIsReadDialogOpen(false);
              // Don't clear selectedJuz here as it's needed for the dialog to know what juzNumber to display
            }}
            juzNumber={selectedJuz.juzNumber}
            onConfirm={onMarkAsReadSubmit}
          />
          
          <UnclaimDialog
            isOpen={isUnclaimDialogOpen}
            onClose={() => {
              setIsUnclaimDialogOpen(false);
              // Don't clear selectedJuz here as it's needed for the dialog to know what juzNumber to display
            }}
            juzNumber={selectedJuz.juzNumber}
            claimedByName={selectedJuzDetails?.claimedByName || ''}
            onConfirm={onUnclaimSubmit}
          />
        </>
      )}
    </>
  );
}
