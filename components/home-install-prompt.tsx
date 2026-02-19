"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import InstallAppSheet from "@/components/install-app-sheet";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export default function HomeInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const { platform, isEligible } = usePwaInstall("home");

  if (!isEligible) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <div className="home-install-pill-anchor md:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="home-install-pill"
            aria-label="Open install instructions"
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{platform === "ios" ? "Add to Home Screen" : "Install App"}</span>
          </button>
        </div>
      )}

      <InstallAppSheet
        surface="home"
        open={isOpen}
        onOpenChange={setIsOpen}
        showDoneAction
      />
    </>
  );
}
