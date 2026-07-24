"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname } from "@/i18n/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const crawlRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const navigatingRef = useRef(false);
  const currentPathRef = useRef(pathname);

  const cleanup = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(crawlRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const complete = useCallback(() => {
    if (!navigatingRef.current) return;
    cleanup();
    navigatingRef.current = false;

    setProgress(100);

    // Keep visible for minimum duration then fade out
    timerRef.current = setTimeout(() => {
      setVisible(false);
      // Reset after fade animation completes
      setTimeout(() => setProgress(0), 300);
    }, 300);
  }, [cleanup]);

  const start = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    cleanup();

    setProgress(30);
    setVisible(true);

    // Slow crawl toward 80%
    crawlRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 80) {
          clearInterval(crawlRef.current);
          return p;
        }
        return p + (80 - p) * 0.08;
      });
    }, 200);

    // Safety timeout: auto-complete after 10s
    timeoutRef.current = setTimeout(() => {
      complete();
    }, 10_000);
  }, [cleanup, complete]);

  // Detect navigation completion via pathname change
  useEffect(() => {
    if (currentPathRef.current !== pathname) {
      currentPathRef.current = pathname;
      if (navigatingRef.current) {
        const completeTimer = setTimeout(() => {
          complete();
        }, 0);
        return () => clearTimeout(completeTimer);
      }
    }
  }, [pathname, complete]);

  // Click delegation for internal links
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Ignore modifier keys (new tab intent)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return; // Only left-click

      // Walk up to find closest <a>
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external links, hash-only, target="_blank", downloads
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

      // Skip external URLs
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        // Skip same-page navigation (same path + search)
        if (
          url.pathname === currentPathRef.current &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      start();
    }

    // Also handle popstate (browser back/forward)
    function handlePopState() {
      start();
    }

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
    };
  }, [start]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-[3px] pointer-events-none"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-quran-green origin-left"
        style={{
          transform: `scaleX(${progress / 100})`,
          transition:
            progress === 100
              ? "transform 200ms ease-out"
              : progress === 30
                ? "transform 100ms ease-out"
                : "transform 200ms linear",
          opacity: visible ? 1 : 0,
          animation: !visible ? "nav-progress-complete 300ms ease-out forwards" : undefined,
          boxShadow: "0 0 8px hsl(166 62% 24% / 0.4)",
        }}
      />
    </div>
  );
}
