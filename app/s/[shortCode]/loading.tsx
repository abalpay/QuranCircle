export default function KhatimLoading() {
  return (
    <main className="page-shell grow">
      {/* ── Event Header Skeleton ── */}
      <section className="quran-card-primary mb-8 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            {/* Badge */}
            <div className="mb-3 flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-quran-border/40" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-quran-border/30" />
            </div>
            {/* Title */}
            <div className="h-8 w-56 animate-pulse rounded-lg bg-quran-border/40 sm:h-10 sm:w-72" />
            {/* Description */}
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-quran-border/30 sm:w-96" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-quran-border/30 sm:w-72" />
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded-full bg-quran-border/30" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-quran-border/30" />
          </div>
        </div>
      </section>

      {/* ── Khatm Card Skeleton ── */}
      <div className="quran-card p-5 sm:p-6">
        {/* Khatm header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-24 animate-pulse rounded bg-quran-border/40" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-quran-green/15" />
          </div>
          <div className="h-4 w-32 animate-pulse rounded bg-quran-border/25" />
        </div>

        {/* Progress bar */}
        <div className="mb-5 h-2.5 w-full animate-pulse rounded-full bg-quran-border/30" />

        {/* Juz grid — 5 columns x 6 rows = 30 tiles */}
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 sm:gap-3">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-square animate-pulse items-center justify-center rounded-xl bg-quran-border/20"
            >
              <div className="h-5 w-5 rounded bg-quran-border/30" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
