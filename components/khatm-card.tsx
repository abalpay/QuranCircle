"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import JuzCard from "@/components/juz-card";
import ClaimJuzDialog from "@/components/claim-juz-dialog";
import { claimJuz, unclaimJuz } from "@/lib/actions/juz";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BookMarked } from "lucide-react";

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
};

type Props = {
  khatm: Khatm;
  shortCode: string;
  isLocked: boolean;
  deviceToken: string;
  isCreator: boolean;
  onRefresh: () => Promise<void>;
};

export default function KhatmCard({
  khatm,
  shortCode,
  isLocked,
  deviceToken,
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
    const result = await unclaimJuz(shortCode, juzId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Juz unclaimed");
    await onRefresh();
  };

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
            // indicatorClassName="bg-gradient-to-r from-quran-green to-emerald-500" // If Progress supports it
          />
          <div className="mt-2 flex justify-between text-xs text-quran-muted">
            <span>0 Juz</span>
            <span>30 Juz</span>
          </div>
        </div>
      </div>

      <div className="bg-white/40 p-6 sm:p-8">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-10">
          {khatm.juzs.map((juz) => (
            <JuzCard
              key={juz.id}
              juz={juz}
              onClaim={() => handleClaimClick(juz)}
              onUnclaim={() => handleUnclaim(juz.id)}
              isLocked={isLocked}
              isOwner={
                isCreator ||
                (!!user?.id && user.id === juz.claimed_by_user_id) ||
                (!!deviceToken &&
                  !!juz.device_token &&
                  deviceToken === juz.device_token)
              }
            />
          ))}
        </div>
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
