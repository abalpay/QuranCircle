import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useLocation } from "wouter";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CreateEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateEventDialog({ isOpen, onClose }: CreateEventDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { openAuthModal } = useAuthModal();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const createEventMutation = useMutation({
    mutationFn: async (eventData: {
      name: string;
      description?: string;
      isPublic: boolean;
      deadline?: Date;
    }) => {
      const res = await apiRequest("POST", "/api/events", eventData);
      return await res.json();
    },
    onSuccess: (event) => {
      toast({
        title: "Circle created",
        description: "Your Quran reading circle has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      resetForm();
      onClose();
      navigate(`/event/${event.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create circle",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const resetForm = () => {
    setName("");
    setDescription("");
    setIsPublic(false);
    setDate(undefined);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a circle",
        variant: "destructive",
      });
      onClose();
      openAuthModal('login');
      return;
    }
    
    if (!name.trim()) {
      toast({
        title: "Event name required",
        description: "Please provide a name for your circle",
        variant: "destructive",
      });
      return;
    }
    
    createEventMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic,
      deadline: date,
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold text-primary-dark">Create New Event</DialogTitle>
          <DialogDescription>
            Start a new Quran reading circle and invite others to join
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="eventName">Circle Name</Label>
              <Input
                id="eventName"
                placeholder="e.g., Ramadan Nights"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventDescription">Description (Optional)</Label>
              <Textarea
                id="eventDescription"
                placeholder="Briefly describe the purpose of this circle"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eventDeadline">Deadline (Optional)</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => {
                      setDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Privacy</Label>
              <RadioGroup
                defaultValue="private"
                onValueChange={(value) => setIsPublic(value === "public")}
              >
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center space-x-2 border border-neutral-300 rounded-md px-4 py-3 cursor-pointer hover:bg-neutral-50">
                    <RadioGroupItem value="private" id="privacy-private" />
                    <Label htmlFor="privacy-private" className="cursor-pointer">Private (Link only)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border border-neutral-300 rounded-md px-4 py-3 cursor-pointer hover:bg-neutral-50">
                    <RadioGroupItem value="public" id="privacy-public" />
                    <Label htmlFor="privacy-public" className="cursor-pointer">Public (Discoverable)</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Circle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
