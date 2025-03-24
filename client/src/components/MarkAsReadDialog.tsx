import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type MarkAsReadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  juzNumber: number;
  onConfirm: () => void;
};

export default function MarkAsReadDialog({ 
  isOpen, 
  onClose, 
  juzNumber, 
  onConfirm 
}: MarkAsReadDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold text-primary-dark">
            Mark Juz {juzNumber} as Read
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="py-4">
          Are you confirming that you have completed reading Juz {juzNumber}?
        </DialogDescription>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            className="bg-accent hover:bg-accent-dark"
            onClick={onConfirm}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
