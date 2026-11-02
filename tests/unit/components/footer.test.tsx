import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import messages from "../../../messages/en.json";
import Footer from "@/components/footer";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: "en", messages, namespace: namespace as "Footer" }),
}));
const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn(() => "/browse") }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props} />,
  usePathname: pathnameMock,
}));
vi.mock("@/components/footer-language-navigation", () => ({ default: () => null }));

afterEach(() => {
  vi.unstubAllEnvs();
  pathnameMock.mockReturnValue("/browse");
});

describe("Footer", () => {
  it("states the free-forever promise and hides the support link without a URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "");
    render(await Footer());

    expect(
      screen.getByText("Free forever. No ads. Built as sadaqah jariyah."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Support QuranCircle/ })).not.toBeInTheDocument();
  });

  it("shows the support link when the URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://ko-fi.com/example");
    render(await Footer());

    const link = screen.getByRole("link", { name: /^Support QuranCircle/ });
    expect(link).toHaveAttribute("href", "https://ko-fi.com/example");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("hides the support link on circle pages (D10/D19) but not elsewhere", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://ko-fi.com/example");
    for (const path of ["/s/ABC12345", "/s"]) {
      pathnameMock.mockReturnValue(path);
      const { unmount } = render(await Footer());
      expect(screen.queryByTestId("footer-support-link")).not.toBeInTheDocument();
      unmount();
    }
    pathnameMock.mockReturnValue("/about");
    render(await Footer());
    expect(screen.getByTestId("footer-support-link")).toBeInTheDocument();
  });

  it("ignores a non-https support URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "javascript:alert(1)");
    render(await Footer());

    expect(screen.queryByRole("link", { name: /^Support QuranCircle/ })).not.toBeInTheDocument();
  });
});
