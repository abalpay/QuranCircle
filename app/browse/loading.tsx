export default function BrowseLoading() {
  return (
    <main className="page-shell grow">
      {/* ── Header Card Skeleton ── */}
      <section className="quran-card-primary mb-8 p-6 sm:p-10 text-center sm:text-left">
        <div className="flex flex-col items-center sm:items-start">
          <div className="mb-4 h-6 w-32 animate-pulse rounded-full bg-quran-border/40" />
          <div className="h-10 w-72 animate-pulse rounded-lg bg-quran-border/40 sm:h-12 sm:w-96" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-80 animate-pulse rounded bg-quran-border/30 sm:w-[28rem]" />
            <div className="h-4 w-64 animate-pulse rounded bg-quran-border/30 sm:w-80" />
          </div>
        </div>
      </section>

      {/* ── Search & Sort Row Skeleton ── */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 max-w-md flex-1 animate-pulse rounded-full bg-quran-border/30" />
          <div className="h-10 w-40 animate-pulse rounded-full bg-quran-border/30" />
        </div>

        {/* ── Event Cards Grid Skeleton ── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="quran-card p-5">
              {/* Title & percentage */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="h-6 w-40 animate-pulse rounded bg-quran-border/40" />
                <div className="h-6 w-10 animate-pulse rounded-full bg-quran-border/30" />
              </div>

              {/* Description */}
              <div className="mb-4 space-y-2">
                <div className="h-3.5 w-full animate-pulse rounded bg-quran-border/25" />
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-quran-border/25" />
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full animate-pulse rounded-full bg-quran-border/30" />

              {/* Footer stats */}
              <div className="mt-3 flex items-center justify-between">
                <div className="h-3.5 w-24 animate-pulse rounded bg-quran-border/25" />
                <div className="h-5 w-14 animate-pulse rounded-full bg-quran-green/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
