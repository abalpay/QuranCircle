export default function HomeLoading() {
  return (
    <main className="home-page-shell grow">
      <section className="min-h-[44rem] bg-[hsl(168_69%_10%)] text-white">
        <div className="mx-auto grid min-h-[44rem] max-w-[90rem] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-12">
          <div className="max-w-xl">
            <div className="h-8 w-52 animate-pulse rounded-full bg-[hsl(var(--quran-gold)/0.16)]" />
            <div className="mt-8 space-y-3">
              <div className="h-16 w-full max-w-lg animate-pulse rounded-xl bg-white/10 sm:h-20" />
              <div className="h-16 w-3/4 animate-pulse rounded-xl bg-[hsl(var(--quran-light-green)/0.13)] sm:h-20" />
            </div>
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-white/10" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <div className="h-12 w-48 animate-pulse rounded-full bg-white/90" />
              <div className="h-12 w-44 animate-pulse rounded-full border border-white/15 bg-white/[0.06]" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[hsl(42_42%_97%)] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 animate-pulse rounded bg-quran-border/50" />
              <div className="h-10 w-16 animate-pulse rounded bg-quran-green/10" />
            </div>
            <div className="mt-5 h-3 w-full animate-pulse rounded-full bg-quran-border/40" />
            <div className="mt-7 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {Array.from({ length: 30 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-xl border border-quran-border/40 bg-white/65"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="landing-light-canvas px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-[76rem] space-y-8">
          <div className="grid gap-4 rounded-[1.7rem] border border-quran-border/50 bg-white/70 p-5 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-3">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-quran-green/10" />
                <div className="space-y-2">
                  <div className="h-5 w-20 animate-pulse rounded bg-quran-border/40" />
                  <div className="h-3 w-24 animate-pulse rounded bg-quran-border/30" />
                </div>
              </div>
            ))}
          </div>

          <section className="landing-panel min-h-80 p-7 sm:p-10">
            <div className="h-4 w-36 animate-pulse rounded bg-quran-gold/15" />
            <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-lg bg-quran-border/40" />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="h-44 animate-pulse rounded-3xl bg-white/70" />
              <div className="h-44 animate-pulse rounded-3xl bg-quran-green/[0.06]" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
