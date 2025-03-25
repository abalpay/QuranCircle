import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Book, AlertTriangle } from "lucide-react";

type UnmarkReadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  juzNumber: number;
  claimedByName: string;
  onConfirm: () => void;
};

export default function UnmarkReadDialog({ 
  isOpen, 
  onClose, 
  juzNumber, 
  claimedByName, 
  onConfirm 
}: UnmarkReadDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-[hsl(var(--quran-green))]" />
            <span>Mark Juz {juzNumber} as Not Completed?</span>
          </DialogTitle>
          <DialogDescription>
            This will change the status of Juz {juzNumber} from "completed" back to "in progress".
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 flex gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p>This Juz will remain claimed by <span className="font-medium">{claimedByName}</span> but will be marked as not yet completed.</p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="mt-4 sm:mt-0"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-[hsl(var(--quran-green))] hover:bg-[hsl(var(--quran-green))] hover:opacity-90"
            onClick={() => {
              onConfirm();
            }}
          >
            Unmark as Completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}