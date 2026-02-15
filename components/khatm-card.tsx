"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import JuzCard from "@/components/juz-card";
import ClaimJuzDialog from "@/components/claim-juz-dialog";
import { claimJuz, unclaimJuz, markJuzAsRead, unmarkJuzAsRead } from "@/lib/actions/juz";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BookMarked, Check, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Juz = {
  id: string;
  juz_number: number;
  status: string;
  claimed_by_name: string | null;
  claimed_by_user_id: string | null;
  device_token: string | null;
};

type Khatm = {
  id: string;
  khatm_number: number;
  juzs: Juz[];
  claimed_count: number;
  read_count?: number;
};

type Props = {
  khatm: Khatm;
  shortCode: string;
  isLocked: boolean;
  deviceToken: string;
  creatorToken?: string;
  isCreator: boolean;
  onRefresh: () => Promise<void>;
};

export default function KhatmCard({
  khatm,
  shortCode,
  isLocked,
  deviceToken,
  creatorToken,
  isCreator,
  onRefresh,
}: Props) {
  const [selectedJuz, setSelectedJuz] = useState<{
    juzNumber: number;
    juzId: string;
  } | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const { user } = useAuth();

  const claimProgress = Math.round((khatm.claimed_count / 30) * 100);
  const readCount = khatm.read_count ?? khatm.juzs.filter((j) => j.status === "read").length;

  const isJuzOwner = (juz: Juz) =>
    isCreator ||
    (!!user?.id && user.id === juz.claimed_by_user_id) ||
    (!!deviceToken && !!juz.device_token && deviceToken === juz.device_token);

  const availableJuzs = khatm.juzs.filter((j) => j.status === "unclaimed");
  const myJuzs = khatm.juzs.filter(
    (j) =>
      j.status !== "unclaimed" &&
      ((!!user?.id && user.id === j.claimed_by_user_id) ||
        (!!deviceToken && !!j.device_token && deviceToken === j.device_token))
  );

  const handleClaimClick = (juz: Juz) => {
    if (isLocked) {
      toast.error("This Khatim is locked");
      return;
    }
    setSelectedJuz({ juzNumber: juz.juz_number, juzId: juz.id });
    setIsClaimDialogOpen(true);
  };

  const handleClaimSubmit = async (
    claimerName: string,
    juzNumbers: number[]
  ) => {
    const result = await claimJuz(
      shortCode,
      khatm.id,
      juzNumbers[0],
      claimerName,
      deviceToken
    );
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Juz claimed successfully");
    setIsClaimDialogOpen(false);
    setSelectedJuz(null);
    await onRefresh();
  };

  const handleUnclaim = async (juzId: string) => {
    const result = await unclaimJuz(shortCode, juzId, deviceToken, creatorToken);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Juz unclaimed");
    await onRefresh();
  };

  const handleMarkRead = async (juzId: string) => {
    const result = await markJuzAsRead(shortCode, juzId, deviceToken, creatorToken);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Juz marked as read");
    await onRefresh();
  };

  const handleUnmarkRead = async (juzId: string) => {
    const result = await unmarkJuzAsRead(shortCode, juzId, deviceToken, creatorToken);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Juz marked as unread");
    await onRefresh();
  };

  const renderJuzGrid = (juzs: Juz[]) => (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-10">
      {juzs.map((juz) => (
        <JuzCard
          key={juz.id}
          juz={juz}
          onClaim={() => handleClaimClick(juz)}
          onUnclaim={() => handleUnclaim(juz.id)}
          onMarkRead={() => handleMarkRead(juz.id)}
          onUnmarkRead={() => handleUnmarkRead(juz.id)}
          isLocked={isLocked}
          isOwner={isJuzOwner(juz)}
        />
      ))}
    </div>
  );

  return (
    <div className="quran-card overflow-hidden p-0">
      <div className="border-b border-quran-border/60 bg-quran-card/50 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-quran-green/10 px-3 py-1 text-xs font-medium text-quran-green">
              <BookMarked className="h-3.5 w-3.5" />
              <span>Khatm #{khatm.khatm_number}</span>
            </div>
            <h2 className="font-heading text-3xl text-quran-deep sm:text-4xl">
              Progress Tracker
            </h2>
          </div>
          <div className="text-right">
            <span className="block font-heading text-4xl text-quran-green">
              {claimProgress}%
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-quran-muted">
              Claimed
            </span>
          </div>
        </div>

        <div className="mt-6">
          <Progress
            value={claimProgress}
            className="h-3 bg-quran-border/30"
          />
          <div className="mt-2 flex justify-between text-xs text-quran-muted">
            <span>
              {khatm.claimed_count} Claimed
              {readCount > 0 && <> · {readCount} Read</>}
            </span>
            <span>30 Juz</span>
          </div>
        </div>
      </div>

      <div className="bg-white/40 p-6 sm:p-8">
        <Tabs defaultValue="all">
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="all">
              All Juz
            </TabsTrigger>
            <TabsTrigger value="available">
              Available ({availableJuzs.length})
            </TabsTrigger>
            <TabsTrigger value="mine">
              My Juz ({myJuzs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {renderJuzGrid(khatm.juzs)}
          </TabsContent>

          <TabsContent value="available">
            {availableJuzs.length > 0 ? (
              renderJuzGrid(availableJuzs)
            ) : (
              <div className="rounded-xl border border-quran-border/40 bg-white/60 py-12 text-center">
                <p className="text-sm text-quran-muted">All juz have been claimed!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine">
            {myJuzs.length > 0 ? (
              <div className="space-y-2">
                {myJuzs.map((juz) => (
                  <div
                    key={juz.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                      juz.status === "read"
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-amber-200 bg-amber-50/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg font-heading text-lg font-bold",
                          juz.status === "read"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {juz.juz_number}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-quran-deep">
                          Juz {juz.juz_number}
                        </span>
                        <span
                          className={cn(
                            "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            juz.status === "read"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {juz.status === "read" ? "Read" : "Claimed"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {juz.status === "claimed" && (
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-100"
                          onClick={() => handleMarkRead(juz.id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {juz.status === "read" && (
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 transition-colors hover:bg-amber-100"
                          onClick={() => handleUnmarkRead(juz.id)}
                          title="Mark as unread"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-quran-muted transition-colors hover:bg-red-100 hover:text-red-500"
                        onClick={() => handleUnclaim(juz.id)}
                        title="Unclaim"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-quran-border/40 bg-white/60 py-12 text-center">
                <p className="text-sm text-quran-muted">You haven&apos;t claimed any juz yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ClaimJuzDialog
        isOpen={isClaimDialogOpen}
        onClose={() => {
          setIsClaimDialogOpen(false);
          setSelectedJuz(null);
        }}
        juzNumber={selectedJuz?.juzNumber ?? 0}
        onSubmit={handleClaimSubmit}
      />
    </div>
  );
}
