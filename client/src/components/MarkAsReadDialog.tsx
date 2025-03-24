import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto bg-[#f7fcfb] p-2 rounded-full w-12 h-12 flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-[hsl(var(--quran-green))]" />
          </div>
          <DialogTitle className="text-xl font-medium text-[hsl(var(--quran-text))]">
            Mark Juz {juzNumber} as Read
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 text-center text-gray-600">
          <p>Are you confirming that you have completed reading Juz {juzNumber}?</p>
          <p className="text-sm mt-2 text-gray-500">This will mark your portion as complete.</p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
            onClick={onConfirm}
          >
            Confirm Completion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
