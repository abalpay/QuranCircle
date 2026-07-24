export default function BrowseLoading() {
  return (
    <main className="page-shell grow" aria-busy="true">
      <section className="app-page-hero">
        <div className="relative z-10">
          <div className="mb-4 h-5 w-36 animate-pulse rounded-full bg-quran-gold/15" />
          <div className="h-12 w-72 max-w-full animate-pulse rounded-lg bg-quran-border/40 sm:h-16 sm:w-[34rem]" />
          <div className="mt-5 space-y-2">
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-quran-border/30" />
            <div className="h-4 w-4/5 max-w-lg animate-pulse rounded bg-quran-border/30" />
          </div>
        </div>
        <div className="app-hero-ledger">
          <div className="h-4 w-28 animate-pulse rounded bg-quran-gold/15" />
          <div className="mt-4 h-14 w-24 animate-pulse rounded-lg bg-quran-border/35" />
          <div className="mt-5 h-4 w-full animate-pulse rounded bg-quran-border/25" />
        </div>
      </section>

      {/* ── Search & Sort Row Skeleton ── */}
      <div className="mt-8 space-y-6">
        <div className="app-toolbar">
          <div className="h-11 max-w-md flex-1 animate-pulse rounded-full bg-quran-border/30" />
          <div className="h-11 w-full animate-pulse rounded-full bg-quran-border/30 sm:w-40" />
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
