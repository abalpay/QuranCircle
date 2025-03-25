import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EventWithKhatms } from '@shared/schema';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type CircleSettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: EventWithKhatms;
};

export default function CircleSettingsDialog({ isOpen, onClose, event }: CircleSettingsDialogProps) {
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description || '');
  const [deadline, setDeadline] = useState<Date | undefined>(
    event.deadline ? new Date(event.deadline) : undefined
  );
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const updateMutation = useMutation({
    mutationFn: async (eventData: {
      name: string;
      description: string;
      isPublic: boolean; // Kept for API compatibility
      deadline?: Date;
    }) => {
      const response = await apiRequest(
        'PUT',
        `/api/events/${event.id}`,
        eventData
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: 'Circle settings updated',
        description: 'Your changes have been saved.',
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update circle',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      description,
      isPublic: true, // All circles are public by default
      deadline
    });
  };
  
  const resetDeadline = () => {
    setDeadline(undefined);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Circle Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="circleName">Circle Name</Label>
            <Input
              id="circleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter circle name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your circle"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (Optional)</Label>
            <div className="flex items-center space-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal w-full",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {deadline && (
                <Button type="button" variant="ghost" onClick={resetDeadline} size="sm">
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {/* Public option removed as all circles are now public by default */}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}