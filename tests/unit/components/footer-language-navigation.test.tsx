import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FooterLanguageNavigation from "@/components/footer-language-navigation";

const routerReplace = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ locale, hrefLang, ...props }: React.ComponentProps<"a"> & {
    locale?: string;
  }) => <a {...props} hrefLang={hrefLang} data-locale={locale} />,
  usePathname: () => "/privacy",
  useRouter: () => ({ replace: routerReplace }),
}));

describe("FooterLanguageNavigation", () => {
  beforeEach(() => {
    routerReplace.mockReset();
    window.history.replaceState(null, "", "/privacy?source=footer");
  });

  it("preserves the current pathname and query when changing locale", () => {
    render(
      <FooterLanguageNavigation
        ariaLabel="Languages"
        className="footer-languages"
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Türkçe" }));

    expect(routerReplace).toHaveBeenCalledWith("/privacy?source=footer", {
      locale: "tr",
    });
  });

  it("marks the current locale and avoids redundant navigation", () => {
    render(<FooterLanguageNavigation ariaLabel="Languages" />);

    const englishLink = screen.getByRole("link", { name: "English" });
    expect(englishLink).toHaveAttribute("aria-current", "page");

    fireEvent.click(englishLink);
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
