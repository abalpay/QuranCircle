import { Calendar, Clock, Eye, Share2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventWithKhatms } from "@shared/schema";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

type EventHeaderProps = {
  event: EventWithKhatms;
  onManage?: () => void;
};

export default function EventHeader({ event, onManage }: EventHeaderProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { user } = useAuth();
  
  const handleShare = () => {
    setShareDialogOpen(true);
  };
  
  const copyToClipboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "Event link has been copied to clipboard",
      });
      setShareDialogOpen(false);
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    });
  };
  
  const isEventCreator = user && user.id === event.createdBy;
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-5 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-heading font-bold text-primary-dark">
              {event.name}
            </h2>
            {event.description && (
              <p className="text-neutral-700">{event.description}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="default" className="bg-primary hover:bg-primary-dark" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            
            {isEventCreator && (
              <Button 
                variant="secondary" 
                className="bg-secondary hover:bg-secondary-dark text-white"
                onClick={onManage}
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-neutral-700" />
            <span>Created on {format(new Date(event.createdAt), 'MMMM d, yyyy')}</span>
          </div>
          
          {event.deadline && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-neutral-700" />
              <span>Deadline: {format(new Date(event.deadline), 'MMMM d, yyyy')}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4 text-neutral-700" />
            <span>{event.isPublic ? 'Public Event' : 'Private Circle'}</span>
          </div>
        </div>
      </div>
      
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Event</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2">Share this link with others to invite them to join:</p>
            <div className="flex items-center p-2 border rounded bg-slate-50">
              <span className="truncate flex-1">{window.location.href}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={copyToClipboard}>Copy Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
