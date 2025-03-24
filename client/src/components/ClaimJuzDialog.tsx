import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen } from "lucide-react";

type ClaimJuzDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  juzNumber: number;
  onSubmit: (claimerName: string, juzNumbers: number[]) => void;
  defaultName?: string;
  availableJuzs?: number[];
};

export default function ClaimJuzDialog({ 
  isOpen, 
  onClose, 
  juzNumber,
  onSubmit,
  defaultName = ""
}: ClaimJuzDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName || "");
  
  // Reset name when the dialog opens with new defaultName
  useEffect(() => {
    if (isOpen && defaultName !== name) {
      setName(defaultName || "");
    }
  }, [isOpen, defaultName, name]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name.trim()) {
      // Always submit with single juzNumber in array
      onSubmit(name.trim(), [juzNumber]);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto bg-[hsl(var(--quran-gray))] p-2 rounded-full w-12 h-12 flex items-center justify-center mb-2">
            <BookOpen className="h-6 w-6 text-[hsl(var(--quran-green))]" />
          </div>
          <DialogTitle className="text-xl font-medium text-[hsl(var(--quran-text))]">
            Claim Juz {juzNumber}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Enter your name to claim this portion of the Quran
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="mt-2">
          <div className="mb-6">
            <Label htmlFor="claimerName" className="text-sm font-medium text-gray-700">Your Name</Label>
            <Input
              id="claimerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1 bg-[hsl(var(--quran-gray))] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--quran-green))]"
              disabled={!!user}
              required
            />
            {user && (
              <p className="text-xs text-gray-500 mt-1">
                You're signed in, so we'll use your username automatically.
              </p>
            )}
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
              type="submit"
              className="bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
            >
              Claim Juz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
