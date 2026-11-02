"use client";

import { usePathname } from "@/i18n/navigation";

type FooterSupportLinkProps = {
  href: string;
  label: string;
  newTabLabel: string;
  className?: string;
};

// D10/D19: no donation asks on a circle page. usePathname is locale-stripped.
export default function FooterSupportLink({
  href,
  label,
  newTabLabel,
  className,
}: FooterSupportLinkProps) {
  const pathname = usePathname();
  if (/^\/s(\/|$)/.test(pathname)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="footer-support-link"
      className={className}
    >
      {label}
      <span className="sr-only"> {newTabLabel}</span>
    </a>
  );
}
