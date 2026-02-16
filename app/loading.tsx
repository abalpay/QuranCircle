export default function HomeLoading() {
  return (
    <main className="page-shell grow">
      {/* ── Hero Section Skeleton ── */}
      <section className="flex flex-col items-center justify-center py-20 text-center sm:py-28 lg:py-36">
        {/* Bismillah placeholder */}
        <div className="mb-6 h-10 w-64 animate-pulse rounded-lg bg-quran-gold/10" />

        {/* Heading */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-quran-border/40 sm:h-12 sm:w-96" />
          <div className="h-10 w-48 animate-pulse rounded-lg bg-quran-green/15 sm:h-12 sm:w-56" />
        </div>

        {/* Description */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="h-4 w-72 animate-pulse rounded bg-quran-border/30 sm:w-96" />
          <div className="h-4 w-64 animate-pulse rounded bg-quran-border/30 sm:w-80" />
          <div className="h-4 w-56 animate-pulse rounded bg-quran-border/30 sm:w-72" />
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <div className="h-12 w-48 animate-pulse rounded-full bg-quran-green/20" />
          <div className="h-12 w-40 animate-pulse rounded-full bg-quran-border/30" />
        </div>

        {/* Divider */}
        <div className="mx-auto mt-8 h-px w-24 bg-quran-gold/20" />
      </section>

      {/* ── Stats Bar Skeleton ── */}
      <div className="stats-bar">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`stats-bar-item ${i === 1 ? "border-x border-quran-border/30 px-4" : ""}`}
            >
              <div className="h-8 w-12 animate-pulse rounded bg-quran-border/40" />
              <div className="mt-2 h-3 w-16 animate-pulse rounded bg-quran-border/30" />
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works Section Skeleton ── */}
      <section className="section-panel mt-24">
        <div className="mb-10 text-center">
          <div className="mx-auto h-8 w-48 animate-pulse rounded-lg bg-quran-border/40" />
          <div className="mx-auto mt-3 h-4 w-72 animate-pulse rounded bg-quran-border/30" />
        </div>

        <div className="hidden gap-6 md:grid md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="quran-card p-6 sm:p-8">
              <div className="mb-5 h-12 w-12 animate-pulse rounded-2xl bg-quran-green/10" />
              <div className="h-6 w-32 animate-pulse rounded bg-quran-border/40" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-quran-border/30" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-quran-border/30" />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile timeline skeleton */}
        <div className="flex flex-col gap-10 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-5">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-quran-green/20" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 animate-pulse rounded bg-quran-border/40" />
                <div className="h-4 w-full animate-pulse rounded bg-quran-border/30" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-quran-border/30" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
