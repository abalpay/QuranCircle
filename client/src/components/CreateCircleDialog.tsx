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
import { useLocation } from "wouter";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CreateCircleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateCircleDialog({ isOpen, onClose }: CreateCircleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const createCircleMutation = useMutation({
    mutationFn: async (circleData: {
      name: string;
      description?: string;
      isPublic: boolean;
      deadline?: Date;
    }) => {
      const res = await apiRequest("POST", "/api/events", circleData);
      return await res.json();
    },
    onSuccess: (circle) => {
      toast({
        title: "Circle created",
        description: "Your Quran reading circle has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      resetForm();
      onClose();
      navigate(`/event/${circle.id}`);
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
      navigate("/auth");
      return;
    }
    
    if (!name.trim()) {
      toast({
        title: "Circle name required",
        description: "Please provide a name for your circle",
        variant: "destructive",
      });
      return;
    }
    
    createCircleMutation.mutate({
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
          <DialogTitle className="text-xl font-medium text-gray-800">Create New Circle</DialogTitle>
          <DialogDescription>
            Start a new Quran reading circle and invite others to join
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="circleName">Circle Name</Label>
              <Input
                id="circleName"
                placeholder="e.g., Ramadan Nights"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-[hsl(var(--quran-gray))] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--quran-green))]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="circleDescription">Description (Optional)</Label>
              <Textarea
                id="circleDescription"
                placeholder="Briefly describe the purpose of this circle"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[hsl(var(--quran-gray))] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--quran-green))]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="circleDeadline">Deadline (Optional)</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[hsl(var(--quran-gray))] border-0",
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
                  <div className="flex items-center space-x-2 border border-[hsl(var(--quran-border))] rounded-md px-4 py-3 cursor-pointer hover:bg-[hsl(var(--quran-gray))]">
                    <RadioGroupItem value="private" id="privacy-private" />
                    <Label htmlFor="privacy-private" className="cursor-pointer">Private (Link only)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border border-[hsl(var(--quran-border))] rounded-md px-4 py-3 cursor-pointer hover:bg-[hsl(var(--quran-gray))]">
                    <RadioGroupItem value="public" id="privacy-public" />
                    <Label htmlFor="privacy-public" className="cursor-pointer">Public (Discoverable)</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-[hsl(var(--quran-border))]">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCircleMutation.isPending}
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
            >
              {createCircleMutation.isPending ? (
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