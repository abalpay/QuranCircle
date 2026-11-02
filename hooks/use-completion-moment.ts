"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KhatmSnapshot } from "@/lib/types/events";

const KEY_PREFIX = "qc:completion-seen:";

function wasSeen(khatmId: string, memory: Set<string>) {
  if (memory.has(khatmId)) return true;
  try {
    return window.localStorage.getItem(KEY_PREFIX + khatmId) === "1";
  } catch {
    return false; // storage blocked: the in-memory set still stops repeats this visit
  }
}

function markSeen(khatmId: string, memory: Set<string>) {
  memory.add(khatmId);
  try {
    window.localStorage.setItem(KEY_PREFIX + khatmId, "1");
  } catch {
    /* private mode or full storage */
  }
}

/**
 * The completion dialog opens once per device per khatm: the first time a
 * visitor sees it completed, in this visit (last Done, organizer completes) or
 * on arrival. Returns the khatm to show, or null.
 */
export function useCompletionMoment(khatms: KhatmSnapshot[]) {
  const [openId, setOpenId] = useState<string | null>(null);
  const memory = useRef(new Set<string>());

  useEffect(() => {
    const completed = khatms.filter((khatm) => khatm.completed_at);
    const unseen = completed.filter((khatm) => !wasSeen(khatm.id, memory.current));
    if (unseen.length === 0) return;
    // One dialog for the newest; the older ones are marked so they do not queue behind it.
    completed.forEach((khatm) => markSeen(khatm.id, memory.current));
    setOpenId(unseen[unseen.length - 1].id);
  }, [khatms]);

  const close = useCallback(() => setOpenId(null), []);
  const khatm = khatms.find((item) => item.id === openId) ?? null;
  return { khatm, close };
}
