import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KhatmMessageTemplates from "@/components/khatm-message-templates";
import { IntlWrapper } from "../../helpers/intl-wrapper";

const { trackProductEventMock } = vi.hoisted(() => ({
  trackProductEventMock: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackProductEvent: trackProductEventMock,
}));

describe("KhatmMessageTemplates", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("renders the three product-aligned coordination messages", () => {
    render(<KhatmMessageTemplates />, { wrapper: IntlWrapper });

    expect(
      screen.getByRole("heading", { name: "Khatm invitation" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Gentle reminder" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Completion message" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "Copy template" }),
    ).toHaveLength(3);
  });

  it("copies an invitation and records the content conversion", async () => {
    render(<KhatmMessageTemplates />, { wrapper: IntlWrapper });

    fireEvent.click(
      screen.getAllByRole("button", { name: "Copy template" })[0],
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain(
      "Please choose your Juz using this link",
    );
    expect(trackProductEventMock).toHaveBeenCalledWith("Guide Content Copied", {
      content: "invitation",
    });
  });
});
