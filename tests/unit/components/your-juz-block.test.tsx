import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import YourJuzBlock from "@/components/your-juz-block";
import type { KhatmSnapshot } from "@/lib/types/events";
import { IntlWrapper } from "../../helpers/intl-wrapper";

function makeKhatm(overrides: Partial<KhatmSnapshot> = {}): KhatmSnapshot {
  return {
    id: "k1",
    khatm_number: 1,
    claimed_count: 3,
    read_count: 1,
    completed_at: null,
    completion_source: null,
    juzs: [
      { id: "j1", juz_number: 1, status: "unclaimed", claimed_by_name: null, is_mine: false },
      { id: "j2", juz_number: 2, status: "claimed", claimed_by_name: "Amina", is_mine: false },
      { id: "j17", juz_number: 17, status: "claimed", claimed_by_name: "Me", is_mine: true },
      { id: "j18", juz_number: 18, status: "read", claimed_by_name: "Me", is_mine: true },
    ],
    ...overrides,
  };
}

function setup(khatms: KhatmSnapshot[], isReadOnly = false) {
  const handlers = { onDone: vi.fn(), onUndo: vi.fn(), onUnclaim: vi.fn() };
  render(<YourJuzBlock khatms={khatms} isReadOnly={isReadOnly} {...handlers} />, {
    wrapper: IntlWrapper,
  });
  return handlers;
}

describe("YourJuzBlock", () => {
  it("lists only the visitor's own Juz with state and a Quran.com link", () => {
    setup([makeKhatm()]);
    expect(screen.getByRole("heading", { name: "Your Juz" })).toBeTruthy();
    expect(screen.getByText("Juz 17")).toBeTruthy();
    expect(screen.getByText("Juz 18")).toBeTruthy();
    expect(screen.queryByText("Juz 2")).toBeNull();
    expect(screen.getByText("Reading")).toBeTruthy();
    expect(screen.getByText("Done", { selector: "p" })).toBeTruthy();
    const link = screen.getByRole("link", { name: /Open Juz 17 on Quran\.com/ });
    expect(link.getAttribute("href")).toBe("https://quran.com/juz/17");
  });

  it("is hidden when the visitor has no claims", () => {
    const khatm = makeKhatm();
    khatm.juzs = khatm.juzs.map((j) => ({ ...j, is_mine: false }));
    const { container } = render(
      <YourJuzBlock khatms={[khatm]} onDone={vi.fn()} onUndo={vi.fn()} onUnclaim={vi.fn()} />,
      { wrapper: IntlWrapper }
    );
    expect(container.textContent).toBe("");
  });

  it("Done and Undo call their actions with the Juz id", async () => {
    const h = setup([makeKhatm()]);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(h.onDone).toHaveBeenCalledWith("j17"));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(h.onUndo).toHaveBeenCalledWith("j18"));
  });

  it("asks before unclaiming and only then calls the action", async () => {
    const h = setup([makeKhatm()]);
    fireEvent.click(screen.getAllByRole("button", { name: "Unclaim" })[0]);
    expect(await screen.findByText("Unclaim Juz 17?")).toBeTruthy();
    expect(h.onUnclaim).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(h.onUnclaim).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Unclaim" })[0]);
    await screen.findByText("Unclaim Juz 17?");
    const confirm = screen.getAllByRole("button", { name: "Unclaim" }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(h.onUnclaim).toHaveBeenCalledWith("j17"));
  });

  it("labels the khatm only when several are loaded", () => {
    setup([makeKhatm(), makeKhatm({ id: "k2", khatm_number: 2 })]);
    expect(screen.getAllByText("Khatm #2").length).toBeGreaterThan(0);
  });

  it("keeps only the Quran.com link when the circle is archived", () => {
    setup([makeKhatm()], true);
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Unclaim" })).toBeNull();
    expect(screen.getAllByRole("link", { name: /on Quran\.com/ })).toHaveLength(2);
  });

  it("does not drop keyboard focus from Done while an action is running", async () => {
    let finish!: () => void;
    const onDone = vi.fn(() => new Promise<void>((r) => (finish = r)));
    render(<YourJuzBlock khatms={[makeKhatm()]} onDone={onDone} onUndo={vi.fn()} onUnclaim={vi.fn()} />, {
      wrapper: IntlWrapper,
    });
    const done = screen.getByRole("button", { name: "Done" });
    done.focus();
    fireEvent.click(done);
    expect(document.activeElement).toBe(done);
    expect(done.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(done);
    expect(onDone).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(done.getAttribute("aria-disabled")).toBe("false"));
  });
});
