import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BrowseEvents from "@/components/browse-events";
import { IntlWrapper } from "../../helpers/intl-wrapper";

vi.mock("@/lib/actions/events", () => ({
  getPublicEventsPage: vi.fn(),
}));

describe("BrowseEvents accessibility", () => {
  it("labels the search field and circle progress", () => {
    render(
      <BrowseEvents
        initialPage={{
          events: [
            {
              id: "event-1",
              name: "Circle One",
              description: "A community circle",
              short_code: "ABCDEFGH",
              deadline: null,
              is_public: true,
              created_at: "2026-02-23T00:00:00.000Z",
              claimed: 3,
              total: 30,
            },
          ],
          hasMore: false,
          nextCursor: null,
        }}
      />,
      { wrapper: IntlWrapper }
    );

    const search = screen.getByRole("searchbox", { name: "Search circles" });
    expect(search).toHaveAttribute("name", "circle-search");
    expect(search).toHaveAttribute("autocomplete", "off");
    expect(
      screen.getByRole("progressbar", {
        name: "Circle One: 3/30 Juz claimed",
      })
    ).toHaveAttribute("aria-valuenow", "10");
  });
});
