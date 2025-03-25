import { Calendar, Clock, Link, Share2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventWithKhatms } from "@shared/schema";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type EventHeaderProps = {
  event: EventWithKhatms;
  onManage?: () => void;
};

export default function EventHeader({ event, onManage }: EventHeaderProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { user } = useAuth();
  const [shareUrl, setShareUrl] = useState<string>(window.location.href);
  const [productionUrl, setProductionUrl] = useState<string | null>(null);
  const [hasShortUrl, setHasShortUrl] = useState(false);
  
  // Define the response type
  type ShortUrlResponse = {
    shortCode: string;
    shortUrl: string;
    productionUrl?: string;
  };

  // Query for generating a short URL
  const shortUrlMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/events/${event.id}/short-url`);
      return await response.json() as ShortUrlResponse;
    },
    onSuccess: (data) => {
      // Use the relative shortUrl that works in the current environment
      setShareUrl(data.shortUrl);
      // Store the production URL for reference
      if (data.productionUrl) {
        setProductionUrl(data.productionUrl);
      }
      setHasShortUrl(true);
      toast({
        title: "✅ Short URL generated",
        description: "A shorter URL has been created for easier sharing"
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error creating short URL",
        description: "Using regular URL instead",
        variant: "destructive"
      });
    }
  });
  
  const handleShare = () => {
    setShareDialogOpen(true);
    // If we don't have a short URL yet and it's not loading, generate one
    if (!hasShortUrl && !shortUrlMutation.isPending) {
      shortUrlMutation.mutate();
    }
  };
  
  // Add a function to copy the production URL
  const copyProductionUrl = () => {
    if (!productionUrl) return;
    
    navigator.clipboard.writeText(productionUrl).then(() => {
      toast({
        title: "🔗 Production link copied!",
        description: "Production URL has been copied to clipboard ✅",
      });
    }).catch(() => {
      toast({
        title: "❌ Failed to copy",
        description: "Please copy the production link manually",
        variant: "destructive",
      });
    });
  };
  
  // Copy the local development URL
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
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
            
            {shortUrlMutation.isPending ? (
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-neutral-500">Creating shorter link...</span>
              </div>
            ) : (
              <div className="mb-4 bg-neutral-50 p-3 rounded-md border border-neutral-200">
                <div className="flex items-center">
                  <Link className="h-4 w-4 text-neutral-500 mr-2" />
                  <span className="text-sm text-neutral-700 font-medium truncate">{shareUrl}</span>
                </div>
                {hasShortUrl && (
                  <p className="text-xs text-neutral-500 mt-1">
                    ✨ Using a shorter, easier-to-share URL
                  </p>
                )}
                
                {productionUrl && (
                  <div className="mt-3 pt-3 border-t border-neutral-200">
                    <div className="flex items-center">
                      <Link className="h-4 w-4 text-neutral-500 mr-2" />
                      <span className="text-sm text-neutral-700 font-medium truncate">{productionUrl}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      🌐 Production URL (will work after deployment)
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-col gap-4">
              <Button 
                onClick={copyToClipboard} 
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                disabled={shortUrlMutation.isPending}
              >
                <span>📋</span> Copy Link to Clipboard
              </Button>
              
              {productionUrl && (
                <Button 
                  onClick={copyProductionUrl} 
                  className="w-full flex items-center justify-center gap-2"
                  variant="outline"
                  disabled={shortUrlMutation.isPending}
                >
                  <span>🌐</span> Copy Production URL
                </Button>
              )}
              
              <a 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🌙 Join our blessed Quran reading circle! Let's read together ✨\n\n${shareUrl}`)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button 
                  className="w-full bg-[#25D366] hover:bg-[#22c55e] text-white flex items-center justify-center gap-2"
                  type="button"
                  disabled={shortUrlMutation.isPending}
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
