"use client";

import { useState } from "react";
import InstallAppSheet from "@/components/install-app-sheet";

export default function HomeInstallPrompt() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <InstallAppSheet
      surface="home"
      open={isOpen}
      onOpenChange={setIsOpen}
      showDoneAction
    />
  );
}
