type DecorativeArtProps = {
  className?: string;
  title?: string;
};

export function GeometricRosette({ className }: DecorativeArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 240 240"
      fill="none"
    >
      <circle cx="120" cy="120" r="48" />
      <circle cx="120" cy="120" r="78" />
      <path d="M120 18 142 72 200 40 168 98 222 120 168 142 200 200 142 168 120 222 98 168 40 200 72 142 18 120 72 98 40 40 98 72 120 18Z" />
      <rect x="64" y="64" width="112" height="112" />
      <rect
        x="64"
        y="64"
        width="112"
        height="112"
        transform="rotate(45 120 120)"
      />
      <path d="M120 0v42M120 198v42M0 120h42M198 120h42M35 35l30 30M175 175l30 30M205 35l-30 30M65 175l-30 30" />
    </svg>
  );
}

export function MosqueSkyline({ className }: DecorativeArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 420 190"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 172h404M20 181h380" />

      <path d="M43 172V67h36v105M37 67h48M42 58h38M47 58c2-14 12-24 14-36 2 12 12 22 14 36M61 22V13" />
      <path d="M61 8c-7 0-12 5-12 11s5 11 12 11c-4-2-7-6-7-11s3-9 7-11Z" />
      <path d="M48 91h26M48 101h26M52 172v-38h18v38M52 134c1-9 5-15 9-20 4 5 8 11 9 20" />

      <path d="M341 172V67h36v105M335 67h48M340 58h38M345 58c2-14 12-24 14-36 2 12 12 22 14 36M359 22V13" />
      <path d="M359 8c-7 0-12 5-12 11s5 11 12 11c-4-2-7-6-7-11s3-9 7-11Z" />
      <path d="M346 91h26M346 101h26M350 172v-38h18v38M350 134c1-9 5-15 9-20 4 5 8 11 9 20" />

      <path d="M84 172v-55h43v55M293 172v-55h43v55" />
      <path d="M88 117c3-19 17-31 18-45 2 14 16 26 18 45M297 117c3-19 17-31 18-45 2 14 16 26 18 45" />
      <path d="M106 72V61M315 72V61" />
      <path d="M106 56c-5 0-9 4-9 8s4 8 9 8c-3-2-5-5-5-8s2-6 5-8ZM315 56c-5 0-9 4-9 8s4 8 9 8c-3-2-5-5-5-8s2-6 5-8Z" />

      <path d="M121 172v-69h178v69M129 103c6-38 38-62 81-62s75 24 81 62" />
      <path d="M210 41V25" />
      <path d="M210 18c-7 0-12 5-12 11s5 11 12 11c-4-2-7-6-7-11s3-9 7-11Z" />
      <path d="M179 172v-27c0-18 13-31 31-31s31 13 31 31v27M190 172v-26c0-12 8-21 20-21s20 9 20 21v26" />
      <path d="M143 172v-31c0-12 8-21 19-21s19 9 19 21M239 141c0-12 8-21 19-21s19 9 19 21v31" />
      <path d="M152 141h19M249 141h19M139 109h142M96 145h20M304 145h20" />
    </svg>
  );
}

export function OpenQuranIllustration({
  className,
  title = "Open Quran",
}: DecorativeArtProps) {
  return (
    <svg
      role="img"
      aria-labelledby="open-quran-title"
      className={className}
      viewBox="0 0 320 190"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title id="open-quran-title">{title}</title>

      <path
        d="M20 48c45-18 91-18 140 1 49-19 95-19 140-1l-8 112c-48-12-91-10-132 9-41-19-84-21-132-9L20 48Z"
        fill="hsl(var(--quran-deep))"
        stroke="hsl(var(--quran-green))"
        strokeWidth="4"
      />
      <path
        d="M29 42c39-16 83-15 131 5v113c-41-17-82-20-124-10L29 42Z"
        fill="hsl(42 55% 97%)"
        stroke="hsl(var(--quran-gold) / 0.68)"
        strokeWidth="1.5"
      />
      <path
        d="M291 42c-39-16-83-15-131 5v113c41-17 82-20 124-10l7-108Z"
        fill="hsl(42 55% 97%)"
        stroke="hsl(var(--quran-gold) / 0.68)"
        strokeWidth="1.5"
      />
      <path
        d="M160 48c-8 25-8 77 0 112"
        stroke="hsl(var(--quran-gold))"
        strokeWidth="3"
      />
      <path
        d="M160 49c-5 27-5 78 0 108M39 52c34-10 70-7 108 7M281 52c-34-10-70-7-108 7"
        stroke="hsl(var(--quran-border) / 0.65)"
        strokeWidth="1"
      />

      <g
        fill="hsl(var(--quran-deep))"
        stroke="none"
        textAnchor="middle"
        style={{
          fontFamily:
            "var(--font-amiri), var(--font-arabic), 'Noto Naskh Arabic', serif",
        }}
      >
        <text x="226" y="69" fontSize="7.5" lang="ar" direction="rtl">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </text>
        <text
          x="226"
          y="82"
          fontSize="6.2"
          fill="hsl(var(--quran-gold))"
          lang="ar"
          direction="rtl"
        >
          سُورَةُ الْإِخْلَاصِ
        </text>
        <text x="226" y="101" fontSize="9.2" lang="ar" direction="rtl">
          قُلْ هُوَ ٱللَّهُ أَحَدٌ
        </text>
        <text x="226" y="121" fontSize="9.2" lang="ar" direction="rtl">
          ٱللَّهُ ٱلصَّمَدُ
        </text>

        <text x="94" y="82" fontSize="8.7" lang="ar" direction="rtl">
          لَمْ يَلِدْ وَلَمْ يُولَدْ
        </text>
        <text x="94" y="104" fontSize="7.7" lang="ar" direction="rtl">
          وَلَمْ يَكُن لَّهُۥ
        </text>
        <text x="94" y="123" fontSize="7.7" lang="ar" direction="rtl">
          كُفُوًا أَحَدٌ
        </text>
      </g>

      <g
        fill="hsl(var(--quran-gold) / 0.14)"
        stroke="hsl(var(--quran-gold) / 0.55)"
        strokeWidth="0.8"
      >
        <circle cx="268" cy="101" r="4" />
        <circle cx="268" cy="121" r="4" />
        <circle cx="48" cy="82" r="4" />
        <circle cx="48" cy="123" r="4" />
      </g>
      <g
        fill="hsl(var(--quran-gold))"
        stroke="none"
        textAnchor="middle"
        fontFamily="var(--font-amiri), serif"
        fontSize="5"
      >
        <text x="268" y="103">١</text>
        <text x="268" y="123">٢</text>
        <text x="48" y="84">٣</text>
        <text x="48" y="125">٤</text>
      </g>

      <path
        d="M153 49h14l-2 105-5 12-5-12-2-105Z"
        fill="hsl(var(--quran-gold) / 0.2)"
        stroke="hsl(var(--quran-gold) / 0.55)"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function DocumentLineArt({ className }: DecorativeArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 150 150"
      fill="none"
    >
      <path d="M39 22h51l22 22v84H39V22Z" />
      <path d="M90 22v23h22M54 62h43M54 76h43M54 90h32M54 104h38" />
      <rect x="30" y="31" width="72" height="105" rx="6" />
    </svg>
  );
}
