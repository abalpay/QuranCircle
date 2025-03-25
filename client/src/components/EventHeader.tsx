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
      <div className="bg-white rounded-lg shadow-md p-5 mb-6 flex-1 max-w-full">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-heading font-bold text-[hsl(var(--quran-green))] truncate">
              {event.name}
            </h2>
            {event.description && (
              <p className="text-neutral-700 text-sm line-clamp-2">{event.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[hsl(var(--quran-green))]" 
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            
            {isEventCreator && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onManage}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(event.createdAt), 'MMM d, yyyy')}</span>
          </div>
          
          {event.deadline && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Due: {format(new Date(event.deadline), 'MMM d, yyyy')}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{event.isPublic ? 'Public' : 'Private'}</span>
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
