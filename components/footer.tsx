"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Footer() {
  const pathname = usePathname();
  const hideOnMobile =
    pathname === "/" ||
    pathname === "/browse" ||
    pathname === "/my-circles" ||
    pathname === "/account" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/s/");

  return (
    <footer
      className={cn(
        "mt-auto border-t border-quran-border/60 bg-white/40 backdrop-blur-sm",
        hideOnMobile && "hidden md:block"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-quran-border/50 bg-white/50">
              <Image src="/quran-icon.png" alt="QuranCircle" width={18} height={18} className="opacity-90" />
            </div>
            <span className="font-heading text-xl text-quran-deep">QuranCircle</span>
          </div>
          
          <nav className="flex gap-8 text-sm font-medium text-quran-muted">
            <Link href="/" className="hover:text-quran-green transition-colors">Home</Link>
            <Link href="/browse" className="hover:text-quran-green transition-colors">Browse</Link>
            <Link href="/my-circles" className="hover:text-quran-green transition-colors">My Circles</Link>
            <button type="button" disabled aria-disabled="true" className="transition-colors cursor-not-allowed opacity-60">About</button>
          </nav>
          
          <p className="text-xs text-quran-muted/80">
            © {new Date().getFullYear()} QuranCircle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
