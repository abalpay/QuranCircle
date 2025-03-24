import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
  defaultName = "",
  availableJuzs = []
}: ClaimJuzDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName);
  
  // Use state for selected juzs
  const [selectedJuzs, setSelectedJuzs] = useState<number[]>([]);
  
  // Generate a list of all available juzs if not provided
  const allAvailableJuzs = availableJuzs.length > 0 
    ? availableJuzs 
    : Array.from({ length: 30 }, (_, i) => i + 1);
    
  // Reset selected juzs when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedJuzs([juzNumber]);
      setName(defaultName);
    }
  }, [isOpen, juzNumber, defaultName]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (name.trim() && selectedJuzs.length > 0) {
      onSubmit(name.trim(), selectedJuzs);
    }
  };
  
  const toggleJuz = (juzNum: number) => {
    if (selectedJuzs.includes(juzNum)) {
      // If this is the only Juz, don't remove it
      if (selectedJuzs.length === 1 && selectedJuzs[0] === juzNum) {
        return;
      }
      setSelectedJuzs(selectedJuzs.filter(num => num !== juzNum));
    } else {
      setSelectedJuzs([...selectedJuzs, juzNum]);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold text-primary-dark">
            Claim Juz {selectedJuzs.length > 1 
              ? `${selectedJuzs.length} Portions` 
              : juzNumber}
          </DialogTitle>
          <DialogDescription>
            Enter your name and select the portions of the Quran you want to claim
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
          
          <div className="mb-5">
            <Label className="mb-2 block">Select Juz Portions</Label>
            <div className="grid grid-cols-5 gap-2">
              {allAvailableJuzs.map(num => (
                <div 
                  key={num}
                  className={cn(
                    "border rounded-md p-2 text-center cursor-pointer transition-colors",
                    selectedJuzs.includes(num) 
                      ? "bg-amber-50 border-amber-300" 
                      : "border-gray-200 hover:border-amber-200"
                  )}
                  onClick={() => toggleJuz(num)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Checkbox 
                      checked={selectedJuzs.includes(num)}
                      onCheckedChange={() => toggleJuz(num)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm font-medium">
                      {num}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Claim {selectedJuzs.length > 1 ? `${selectedJuzs.length} Juz` : "Juz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
