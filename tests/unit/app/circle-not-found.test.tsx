import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntlWrapper } from "../../helpers/intl-wrapper";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("@/components/create-circle-action", () => ({
  default: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

import CircleNotFound from "@/components/circle-not-found";

describe("CircleNotFound", () => {
  it("explains the dead link and offers two ways forward", () => {
    render(<CircleNotFound />, { wrapper: IntlWrapper });
    expect(
      screen.getByRole("heading", { name: "This circle link isn't working" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start a khatm" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Browse public circles" }).getAttribute("href")
    ).toBe("/browse");
  });
});
