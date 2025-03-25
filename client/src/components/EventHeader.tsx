import { Calendar, Clock, Share2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventWithKhatms } from "@shared/schema";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        title: "🔗 Link copied!",
        description: "Quran circle link has been copied to clipboard ✅",
      });
      setShareDialogOpen(false);
    }).catch(() => {
      toast({
        title: "❌ Failed to copy",
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
              variant="outline" 
              size="sm" 
              className="text-[hsl(var(--quran-green))] border-[hsl(var(--quran-green))] hover:bg-[hsl(var(--quran-green)/0.1)] flex items-center gap-1" 
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
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
        </div>
      </div>
      
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📢 Share Quran Circle</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-center">Invite others to join this blessed Quran reading circle 🌙✨</p>
            <div className="flex flex-col gap-4">
              <Button 
                onClick={copyToClipboard} 
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <span>📋</span> Copy Link to Clipboard
              </Button>
              
              <a 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🌙 Join our blessed Quran reading circle! Let's read together ✨\n\n${window.location.href}`)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button 
                  className="w-full bg-[#25D366] hover:bg-[#22c55e] text-white flex items-center justify-center gap-2"
                  type="button"
                >
                  <span>💬</span> Share via WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
