import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JuzCard from "@/components/juz-card";
import { IntlWrapper } from "../../helpers/intl-wrapper";

const base = { id: "j", juz_number: 4 };

function renderCard(juz: Parameters<typeof JuzCard>[0]["juz"], isReadOnly = false) {
  return render(<JuzCard juz={juz} onClaim={vi.fn()} isReadOnly={isReadOnly} />, {
    wrapper: IntlWrapper,
  });
}

describe("JuzCard", () => {
  it("names state and claimer for a Reading tile, with a role", () => {
    renderCard({ ...base, status: "claimed", claimed_by_name: "Aisha Khan", is_mine: false });
    expect(screen.getByRole("img", { name: "Juz 4, Reading, Aisha Khan" })).toBeTruthy();
    expect(screen.getByText("Aisha")).toBeTruthy();
    expect(screen.queryByText("You")).toBeNull();
  });

  it("keeps the reader's name on a Done tile", () => {
    renderCard({ ...base, status: "read", claimed_by_name: "Omar Haddad", is_mine: false });
    expect(screen.getByRole("img", { name: "Juz 4, Done, Omar Haddad" })).toBeTruthy();
    expect(screen.getByText("Omar")).toBeTruthy();
  });

  it("marks the visitor's own tile with the word You", () => {
    renderCard({ ...base, status: "read", claimed_by_name: "Me Myself", is_mine: true });
    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Juz 4, Done, Me Myself (you)" })).toBeTruthy();
  });

  it("puts dir=auto and the script on the name", () => {
    renderCard({ ...base, status: "claimed", claimed_by_name: "يوسف الرحمن", is_mine: false });
    const name = screen.getByText("يوسف");
    expect(name.getAttribute("dir")).toBe("auto");
    expect(name.getAttribute("data-script")).toBe("arabic");
  });

  it("is a button only when it can be claimed", () => {
    const { unmount } = renderCard({ ...base, status: "unclaimed", claimed_by_name: null });
    expect(screen.getByRole("button", { name: "Tap to select Juz 4" })).toBeTruthy();
    unmount();
    renderCard({ ...base, status: "unclaimed", claimed_by_name: null }, true);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Juz 4, Available" })).toBeTruthy();
  });
});
