import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UnclaimDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  juzNumber: number;
  claimedByName: string;
  onConfirm: () => void;
};

export default function UnclaimDialog({ 
  isOpen, 
  onClose, 
  juzNumber, 
  claimedByName,
  onConfirm 
}: UnclaimDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold text-primary-dark">
            Unclaim Juz {juzNumber}
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="py-4">
          <p className="mb-2">Are you sure you want to unclaim this Juz?</p>
          <p>Currently claimed by: <span className="font-medium">{claimedByName}</span></p>
        </DialogDescription>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={onConfirm}
          >
            Unclaim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
