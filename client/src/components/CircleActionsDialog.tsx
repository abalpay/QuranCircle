import { useState } from "react";
import { KhatmWithJuzs, EventWithKhatms } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, RotateCcw, AlertCircle, MoreVertical } from "lucide-react";

type CircleActionsDialogProps = {
  event: EventWithKhatms;
  isCreator: boolean;
};

export default function CircleActionsDialog({ event, isCreator }: CircleActionsDialogProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedKhatm, setSelectedKhatm] = useState<KhatmWithJuzs | null>(null);
  const [confirmAction, setConfirmAction] = useState<"archive" | "unarchive" | "delete" | null>(null);
  const [, setLocation] = useLocation();
  
  // If user is not the creator, don't show actions
  if (!isCreator) {
    return null;
  }

  // Get active khatms (non-archived, non-deleted)
  const activeKhatms = event.khatms.filter(khatm => !khatm.isArchived);
  
  // Mutations for khatm actions
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedKhatm) return null;
      const response = await apiRequest("POST", "/api/khatm/archive", {
        khatmId: selectedKhatm.id
      });
      return await response.json();
    },
    onSuccess: () => {
      if (!selectedKhatm) return;
      toast({
        title: "Khatm Archived",
        description: `Khatm #${selectedKhatm.khatmNumber} has been archived.`,
        duration: 3000
      });
      
      // Refresh the event data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      setIsDialogOpen(false);
      setConfirmAction(null);
      setSelectedKhatm(null);
    },
    onError: (error: Error) => {
      console.error("Failed to archive khatm:", error);
      toast({
        title: "Error",
        description: "Failed to archive khatm. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
      setSelectedKhatm(null);
    }
  });

  const unarchiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedKhatm) return null;
      const response = await apiRequest("POST", "/api/khatm/unarchive", {
        khatmId: selectedKhatm.id
      });
      return await response.json();
    },
    onSuccess: () => {
      if (!selectedKhatm) return;
      toast({
        title: "Khatm Restored",
        description: `Khatm #${selectedKhatm.khatmNumber} has been restored.`,
        duration: 3000
      });
      
      // Refresh the event data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      setIsDialogOpen(false);
      setConfirmAction(null);
      setSelectedKhatm(null);
    },
    onError: (error: Error) => {
      console.error("Failed to unarchive khatm:", error);
      toast({
        title: "Error",
        description: "Failed to restore khatm. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
      setSelectedKhatm(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedKhatm) return null;
      const response = await apiRequest("POST", "/api/khatm/delete", {
        khatmId: selectedKhatm.id
      });
      return await response.json();
    },
    onSuccess: () => {
      if (!selectedKhatm) return;
      toast({
        title: "Khatm Deleted",
        description: `Khatm #${selectedKhatm.khatmNumber} has been permanently deleted.`,
        duration: 3000
      });
      
      console.log(`Successfully deleted khatm ${selectedKhatm.id} from event ${event.id}`);
      
      // Force complete refresh of all event data by removing cached data
      queryClient.removeQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.removeQueries({ queryKey: ['/api/events'] });
      
      // Also invalidate any other queries that might contain this khatm
      queryClient.invalidateQueries();
      
      // Fetch fresh data immediately (don't wait for WebSocket)
      queryClient.fetchQuery({ queryKey: ['/api/events'] });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
      setSelectedKhatm(null);
      
      // Redirect to home page after deleting the khatm
      setLocation('/');
    },
    onError: (error: Error) => {
      console.error("Failed to delete khatm:", error);
      toast({
        title: "Error",
        description: "Failed to delete khatm. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
      setSelectedKhatm(null);
    }
  });

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[hsl(var(--quran-green))] border-[hsl(var(--quran-green))] hover:bg-[hsl(var(--quran-green)/0.1)] flex items-center gap-1"
        >
          <MoreVertical className="h-4 w-4" />
          <span>Actions</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Circle Actions</DialogTitle>
          <DialogDescription>
            Manage khatms in this circle
          </DialogDescription>
        </DialogHeader>
        
        {/* Select khatm and action */}
        {!selectedKhatm && confirmAction === null && (
          <div className="py-4">
            <h3 className="text-sm font-medium mb-3">Select a khatm to manage:</h3>
            <div className="space-y-3">
              {event.khatms.map(khatm => (
                <div 
                  key={khatm.id} 
                  className={`p-3 rounded-md border cursor-pointer transition-colors
                    ${khatm.isArchived 
                      ? 'border-gray-200 bg-gray-50 text-gray-600' 
                      : 'border-[hsl(var(--quran-green))] bg-[hsl(var(--quran-green))/0.05]'
                    }
                  `}
                  onClick={() => setSelectedKhatm(khatm)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Khatm #{khatm.khatmNumber}</span>
                      {khatm.isArchived && (
                        <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">Archived</span>
                      )}
                    </div>
                    <div className="text-sm">
                      {khatm.claimedCount}/{30} Claimed · {khatm.readCount}/{30} Read
                    </div>
                  </div>
                </div>
              ))}
              
              {event.khatms.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No khatms found in this circle.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Actions for selected khatm */}
        {selectedKhatm && confirmAction === null && (
          <div className="flex flex-col gap-3 py-4">
            <h3 className="font-medium mb-1">Khatm #{selectedKhatm.khatmNumber} Actions:</h3>
            
            {!selectedKhatm.isArchived && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setConfirmAction("archive")}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Khatm
              </Button>
            )}
            
            {selectedKhatm.isArchived && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setConfirmAction("unarchive")}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Khatm
              </Button>
            )}
            
            <Button
              variant="destructive"
              className="justify-start"
              onClick={() => setConfirmAction("delete")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Khatm
            </Button>
            
            <Button
              variant="ghost"
              className="mt-2 justify-start"
              onClick={() => setSelectedKhatm(null)}
            >
              Back to Khatm Selection
            </Button>
          </div>
        )}
        
        {/* Confirmation for Archive */}
        {selectedKhatm && confirmAction === "archive" && (
          <div className="py-4">
            <div className="flex items-center mb-4 text-amber-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p className="font-medium">Confirm Archive</p>
            </div>
            <p className="mb-4">
              Archiving will hide this khatm from participants, but you can restore it later. 
              Participant progress will be preserved.
            </p>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
              >
                {archiveMutation.isPending ? "Archiving..." : "Archive Khatm"}
              </Button>
            </DialogFooter>
          </div>
        )}
        
        {/* Confirmation for Unarchive */}
        {selectedKhatm && confirmAction === "unarchive" && (
          <div className="py-4">
            <div className="flex items-center mb-4 text-blue-600">
              <RotateCcw className="h-5 w-5 mr-2" />
              <p className="font-medium">Confirm Restore</p>
            </div>
            <p className="mb-4">
              This will restore the archived khatm and make it visible to participants again.
            </p>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => unarchiveMutation.mutate()}
                disabled={unarchiveMutation.isPending}
              >
                {unarchiveMutation.isPending ? "Restoring..." : "Restore Khatm"}
              </Button>
            </DialogFooter>
          </div>
        )}
        
        {/* Confirmation for Delete */}
        {selectedKhatm && confirmAction === "delete" && (
          <div className="py-4">
            <div className="flex items-center mb-4 text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p className="font-medium">Confirm Delete</p>
            </div>
            <div className="space-y-3 mb-4">
              <p className="text-red-600 font-semibold">
                WARNING: This action is permanent and cannot be undone!
              </p>
              <p>
                This will completely remove the khatm and all participant progress. The khatm will no longer appear in any view.
              </p>
              <p>
                If you want to temporarily hide this khatm while preserving participant progress, please use the Archive option instead.
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Khatm"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}