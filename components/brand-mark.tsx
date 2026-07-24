import type { SVGProps } from "react";

type BrandMarkVariant =
  | "on-dark"
  | "on-light"
  | "monochrome-light"
  | "monochrome-dark";

type BrandMarkProps = Omit<SVGProps<SVGSVGElement>, "color"> & {
  title?: string;
  variant?: BrandMarkVariant;
};

const palettes: Record<
  BrandMarkVariant,
  { ring: string; left: string; right: string }
> = {
  "on-dark": {
    ring: "#c6a15b",
    left: "#f6eedc",
    right: "#8fa78e",
  },
  "on-light": {
    ring: "#a8813d",
    left: "#17473b",
    right: "#718f7b",
  },
  "monochrome-light": {
    ring: "#f6eedc",
    left: "#f6eedc",
    right: "#f6eedc",
  },
  "monochrome-dark": {
    ring: "#17473b",
    left: "#17473b",
    right: "#17473b",
  },
};

export default function BrandMark({
  title,
  variant = "on-dark",
  ...props
}: BrandMarkProps) {
  const palette = palettes[variant];

  return (
    <svg
      viewBox="0 0 128 128"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <circle
        cx="64"
        cy="63"
        r="52"
        fill="none"
        stroke={palette.ring}
        strokeWidth="5.25"
      />
      <path
        d="m97 101 21 21h-15l-9-10"
        fill="none"
        stroke={palette.ring}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.25"
      />
      <path
        d="M60 19 31 37c-5 3-8 8-8 14v31c0 6 3 11 8 14l29 18V89L42 76c-5-3-7-7-7-12s2-9 7-12l18-13V19Z"
        fill={palette.left}
      />
      <path
        d="m68 19 29 18c5 3 8 8 8 14v31c0 6-3 11-8 14l-29 18V89l18-13c5-3 7-7 7-12s-2-9-7-12L68 39V19Z"
        fill={palette.right}
      />
    </svg>
  );
}
