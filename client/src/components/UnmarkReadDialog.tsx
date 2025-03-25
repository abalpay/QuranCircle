import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { BookX } from "lucide-react";

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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 mb-4">
            <BookX className="h-6 w-6 text-yellow-600" aria-hidden="true" />
          </div>
          <AlertDialogTitle>Unmark Juz {juzNumber} as read?</AlertDialogTitle>
          <AlertDialogDescription>
            This will change the status of Juz {juzNumber} from <span className="font-medium">completed</span> back to <span className="font-medium">in progress</span>.
            {claimedByName && (
              <p className="mt-2">
                This Juz is claimed by <span className="font-medium">{claimedByName}</span>.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-300">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
            onClick={onConfirm}
          >
            Unmark as Read
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}