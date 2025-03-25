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
import { Archive, Trash2, RotateCcw, AlertCircle } from "lucide-react";

type KhatmActionsDialogProps = {
  khatm: KhatmWithJuzs;
  eventId: number;
  isCreator?: boolean;  // Optional as we'll determine it from the API
};

export default function KhatmActionsDialog({ khatm, eventId, isCreator: isCreatorProp }: KhatmActionsDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"archive" | "unarchive" | "delete" | null>(null);
  const [, setLocation] = useLocation();
  
  // Fetch event data to determine if current user is creator
  const { data: event } = useQuery<EventWithKhatms>({
    queryKey: [`/api/events/${eventId}`],
    // Only fetch if not provided and user is logged in
    enabled: isCreatorProp === undefined && !!user
  });
  
  // Determine if the current user is the creator
  const isCreator = isCreatorProp !== undefined 
    ? isCreatorProp 
    : (user && event ? user.id === event.createdBy : false);

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/khatm/archive", {
        khatmId: khatm.id
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Khatm Archived",
        description: `Khatm #${khatm.khatmNumber} has been archived.`,
        duration: 3000
      });
      
      // Refresh the event data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      setIsDialogOpen(false);
      setConfirmAction(null);
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
    }
  });

  const unarchiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/khatm/unarchive", {
        khatmId: khatm.id
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Khatm Restored",
        description: `Khatm #${khatm.khatmNumber} has been restored.`,
        duration: 3000
      });
      
      // Refresh the event data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      setIsDialogOpen(false);
      setConfirmAction(null);
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
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/khatm/delete", {
        khatmId: khatm.id
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Khatm Deleted",
        description: `Khatm #${khatm.khatmNumber} has been deleted.`,
        duration: 3000
      });
      
      // Refresh the event data and redirect to home page
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setIsDialogOpen(false);
      setConfirmAction(null);
      
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
    }
  });

  // Only show the actions dialog for the event creator
  if (!isCreator) {
    return null;
  }

  // Determine available actions based on khatm status
  const canArchive = !khatm.isArchived && !khatm.isDeleted;
  const canUnarchive = khatm.isArchived && !khatm.isDeleted;
  const canDelete = !khatm.isDeleted;

  // Don't show the menu if no actions are available
  if (!canArchive && !canUnarchive && !canDelete) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-2 text-gray-500 hover:text-gray-700"
        >
          Actions
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Khatm #{khatm.khatmNumber} Actions</DialogTitle>
          <DialogDescription>
            Manage this khatm
          </DialogDescription>
        </DialogHeader>
        
        {/* Primary Actions */}
        {confirmAction === null && (
          <div className="flex flex-col gap-3 py-4">
            {canArchive && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setConfirmAction("archive")}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Khatm
              </Button>
            )}
            
            {canUnarchive && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setConfirmAction("unarchive")}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore Khatm
              </Button>
            )}
            
            {canDelete && (
              <Button
                variant="destructive"
                className="justify-start"
                onClick={() => setConfirmAction("delete")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Khatm
              </Button>
            )}
          </div>
        )}
        
        {/* Confirmation for Archive */}
        {confirmAction === "archive" && (
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
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
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
        {confirmAction === "unarchive" && (
          <div className="py-4">
            <div className="flex items-center mb-4 text-blue-600">
              <RotateCcw className="h-5 w-5 mr-2" />
              <p className="font-medium">Confirm Restore</p>
            </div>
            <p className="mb-4">
              This will restore the archived khatm and make it visible to participants again.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
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
        {confirmAction === "delete" && (
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
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
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