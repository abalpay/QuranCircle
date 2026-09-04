import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { IntlWrapper } from "../../helpers/intl-wrapper";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null, isAuthenticatedUser: false, signOut: vi.fn() }) }));
vi.mock("@/hooks/use-auth-modal", () => ({ useAuthModal: () => ({ openAuthModal: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>, usePathname: () => "/hadith/4560", useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);
describe("Hadith gated navigation", () => {
  it("defaults off in desktop and mobile", () => {
    const { container } = render(<><Header /><MobileNavigation /></>, { wrapper: IntlWrapper });
    expect(screen.queryByRole("link", { name: "Hadith" })).toBeNull();
    expect(container.querySelector(".mobile-bottom-nav-surface")?.children).toHaveLength(4);
    expect(container.querySelector(".has-hadith")).toBeNull();
  });
  it("adds the active desktop link and fifth mobile tab only when enabled", () => {
    const { container } = render(<><Header hadithEnabled /><MobileNavigation hadithEnabled /></>, { wrapper: IntlWrapper });
    expect(screen.getAllByRole("link", { name: "Hadith" })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", { name: "Hadith" })) expect(link).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".mobile-bottom-nav-surface.has-hadith")?.children).toHaveLength(5);
  });
});
