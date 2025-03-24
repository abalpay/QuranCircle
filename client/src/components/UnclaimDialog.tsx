import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto bg-red-50 p-2 rounded-full w-12 h-12 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-xl font-medium text-[hsl(var(--quran-text))]">
            Unclaim Juz {juzNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 text-center text-gray-600">
          <p className="mb-2">Are you sure you want to unclaim this Juz?</p>
          <p>Currently claimed by: <span className="font-medium">{claimedByName}</span></p>
          <p className="text-sm mt-3 text-gray-500">
            This will make the Juz available for someone else to claim.
          </p>
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
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Unclaim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
