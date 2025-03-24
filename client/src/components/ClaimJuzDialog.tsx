import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

type ClaimJuzDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  juzNumber: number;
  onSubmit: (claimerName: string) => void;
  defaultName?: string;
};

export default function ClaimJuzDialog({ 
  isOpen, 
  onClose, 
  juzNumber, 
  onSubmit,
  defaultName = ""
}: ClaimJuzDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold text-primary-dark">
            Claim Juz {juzNumber}
          </DialogTitle>
          <DialogDescription>
            Enter your name to claim this portion of the Quran
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <Label htmlFor="claimerName">Your Name</Label>
            <Input
              id="claimerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
              disabled={!!user}
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Claim
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
