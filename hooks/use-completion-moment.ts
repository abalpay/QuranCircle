"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KhatmSnapshot } from "@/lib/types/events";

const KEY_PREFIX = "qc:completion-seen:";
/** An own action's result and the refreshed snapshot arrive within moments of each other. */
const OWN_ACTION_WINDOW_MS = 15_000;

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
 * When the completion dialog opens (direction.md: no popups on a first visit; D10: never while claiming):
 *  - the completion came from this visitor's own action in this visit (`announceOwnCompletion(khatmId)`
 *    right after their last Done, or after the organizer pressed Complete), or
 *  - on arrival, the visitor holds a Juz in a khatm that is already complete and has not seen it on this device.
 * Everyone else, and every completion that arrives by realtime or by loading older khatms, just sees the record on the page.
 */
export function useCompletionMoment(khatms: KhatmSnapshot[]) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [announceTick, setAnnounceTick] = useState(0);
  const memory = useRef(new Set<string>());
  const arrived = useRef(false);
  const seenOpen = useRef(new Set<string>());
  const ownAction = useRef<{ khatmId: string; at: number } | null>(null);

  /** Call right after the visitor's own action completed `khatmId` (their last Done, or the organizer's Complete). */
  const announceOwnCompletion = useCallback((khatmId: string) => {
    ownAction.current = { khatmId, at: Date.now() };
    setAnnounceTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const completed = khatms.filter((khatm) => khatm.completed_at);
    let candidates: KhatmSnapshot[] = [];

    if (!arrived.current) {
      arrived.current = true;
      candidates = completed.filter((khatm) => khatm.juzs.some((juz) => juz.is_mine));
    } else if (ownAction.current !== null) {
      if (Date.now() - ownAction.current.at > OWN_ACTION_WINDOW_MS) {
        ownAction.current = null;
      } else {
        // Only the khatm the visitor completed, and only if we watched it being open: a different khatm
        // completed by realtime, or an older one just loaded, stays silent.
        const { khatmId } = ownAction.current;
        candidates = completed.filter((khatm) => khatm.id === khatmId && seenOpen.current.has(khatm.id));
      }
    }

    khatms.forEach((khatm) => {
      if (!khatm.completed_at) seenOpen.current.add(khatm.id);
    });

    const unseen = candidates.filter((khatm) => !wasSeen(khatm.id, memory.current));
    if (unseen.length === 0) return;
    ownAction.current = null;
    unseen.forEach((khatm) => markSeen(khatm.id, memory.current));
    setOpenId(unseen[unseen.length - 1].id);
  }, [khatms, announceTick]);

  const close = useCallback(() => setOpenId(null), []);
  const khatm = khatms.find((item) => item.id === openId) ?? null;
  return { khatm, close, announceOwnCompletion };
}
