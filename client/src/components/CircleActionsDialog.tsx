import { useState } from "react";
import { EventWithKhatms } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, MoreVertical, Trash2, Archive, ArchiveRestore } from "lucide-react";

type CircleActionsDialogProps = {
  event: EventWithKhatms;
  isCreator: boolean;
};

export default function CircleActionsDialog({ event, isCreator }: CircleActionsDialogProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "archive" | "unarchive" | null>(null);
  const [, setLocation] = useLocation();
  
  // If user is not the creator, don't show actions
  if (!isCreator) {
    return null;
  }

  // Mutation for deleting the entire circle (event)
  const deleteCircleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/events/${event.id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Circle Deleted",
        description: `"${event.name}" has been permanently deleted.`,
        duration: 3000
      });
      
      console.log(`Successfully deleted circle (event) ${event.id}`);
      
      // Force complete refresh of all event data by removing cached data
      queryClient.removeQueries({ queryKey: ['/api/events'] });
      
      // Also invalidate any other queries
      queryClient.invalidateQueries();
      
      // Fetch fresh data immediately (don't wait for WebSocket)
      queryClient.fetchQuery({ queryKey: ['/api/events'] });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
      
      // Redirect to home page after deleting the circle
      setLocation('/');
    },
    onError: (error: Error) => {
      console.error("Failed to delete circle:", error);
      toast({
        title: "Error",
        description: "Failed to delete reading circle. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
    }
  });
  
  // Mutation for archiving the circle (event)
  const archiveCircleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${event.id}/archive`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Circle Archived",
        description: `"${event.name}" has been archived. It will no longer appear in your active circles.`,
        duration: 3000
      });
      
      console.log(`Successfully archived circle (event) ${event.id}`);
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id] });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
    },
    onError: (error: Error) => {
      console.error("Failed to archive circle:", error);
      toast({
        title: "Error",
        description: "Failed to archive reading circle. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
    }
  });
  
  // Mutation for unarchiving the circle (event)
  const unarchiveCircleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${event.id}/unarchive`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Circle Restored",
        description: `"${event.name}" has been restored from the archive.`,
        duration: 3000
      });
      
      console.log(`Successfully unarchived circle (event) ${event.id}`);
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id] });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
    },
    onError: (error: Error) => {
      console.error("Failed to unarchive circle:", error);
      toast({
        title: "Error",
        description: "Failed to restore reading circle. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      setIsDialogOpen(false);
      setConfirmAction(null);
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
            Manage this reading circle
          </DialogDescription>
        </DialogHeader>
        
        {/* Main Actions */}
        {confirmAction === null && (
          <div className="flex flex-col gap-3 py-4">
            <h3 className="font-medium mb-1">Circle: {event.name}</h3>
            
            {event.isArchived ? (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setConfirmAction("unarchive")}
              >
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restore from Archive
              </Button>
            ) : (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setConfirmAction("archive")}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Circle
              </Button>
            )}
            
            <Button
              variant="destructive"
              className="justify-start"
              onClick={() => setConfirmAction("delete")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Circle
            </Button>
          </div>
        )}
        
        {/* Confirmation for Archive */}
        {confirmAction === "archive" && (
          <div className="py-4">
            <div className="flex items-center mb-4">
              <Archive className="h-5 w-5 mr-2" />
              <p className="font-medium">Confirm Archive</p>
            </div>
            <div className="space-y-3 mb-4">
              <p>
                This will archive the reading circle "{event.name}". It will:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>No longer appear in your active circles</li>
                <li>Still be accessible via direct link</li>
                <li>Be restorable at any time</li>
              </ul>
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => archiveCircleMutation.mutate()}
                disabled={archiveCircleMutation.isPending}
              >
                {archiveCircleMutation.isPending ? "Archiving..." : "Archive Circle"}
              </Button>
            </DialogFooter>
          </div>
        )}
        
        {/* Confirmation for Unarchive */}
        {confirmAction === "unarchive" && (
          <div className="py-4">
            <div className="flex items-center mb-4">
              <ArchiveRestore className="h-5 w-5 mr-2" />
              <p className="font-medium">Confirm Restore</p>
            </div>
            <div className="space-y-3 mb-4">
              <p>
                This will restore the reading circle "{event.name}" from the archive. It will:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Appear again in your active circles</li>
                <li>Continue to be accessible via direct link</li>
              </ul>
            </div>
            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => unarchiveCircleMutation.mutate()}
                disabled={unarchiveCircleMutation.isPending}
              >
                {unarchiveCircleMutation.isPending ? "Restoring..." : "Restore Circle"}
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
                This will completely delete the reading circle "{event.name}" including all khatms and participant progress. 
              </p>
              <p>
                The circle will no longer be accessible, even with its share link.
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
                onClick={() => deleteCircleMutation.mutate()}
                disabled={deleteCircleMutation.isPending}
              >
                {deleteCircleMutation.isPending ? "Deleting..." : "Delete Circle"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}