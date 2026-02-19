import { createElement } from "react";
import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FloatingClaimBar from "@/components/floating-claim-bar";

const MULTI_SELECT_HINT_SEEN_KEY = "qc_multi_select_hint_seen_v1";

function setupLocalStorageMock() {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  };

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
}

function renderFloatingClaimBar(selectedCount: number) {
  return render(
    createElement(FloatingClaimBar, {
      selectedCount,
      onClaim: () => {},
      onClear: () => {},
    })
  );
}

describe("FloatingClaimBar", () => {
  beforeEach(() => {
    setupLocalStorageMock();
    vi.useRealTimers();
  });

  it("keeps both bar and coachmark hidden when nothing is selected", () => {
    renderFloatingClaimBar(0);

    expect(screen.getByTestId("floating-claim-bar")).toHaveAttribute(
      "data-state",
      "hidden"
    );
    expect(screen.getByTestId("multi-select-coachmark")).toHaveAttribute(
      "data-state",
      "hidden"
    );
  });

  it("shows coachmark when first single selection happens", () => {
    renderFloatingClaimBar(1);

    expect(screen.getByTestId("floating-claim-bar")).toHaveAttribute(
      "data-state",
      "visible"
    );
    expect(screen.getByTestId("multi-select-coachmark")).toHaveAttribute(
      "data-state",
      "visible"
    );
  });

  it("auto-hides coachmark after 2.5s and persists seen key", () => {
    vi.useFakeTimers();
    renderFloatingClaimBar(1);

    const coachmark = screen.getByTestId("multi-select-coachmark");
    expect(coachmark).toHaveAttribute("data-state", "visible");

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(coachmark).toHaveAttribute("data-state", "hidden");
    expect(window.localStorage.getItem(MULTI_SELECT_HINT_SEEN_KEY)).toBe("1");
  });

  it("does not show coachmark again when seen key already exists", () => {
    window.localStorage.setItem(MULTI_SELECT_HINT_SEEN_KEY, "1");

    renderFloatingClaimBar(1);

    expect(screen.getByTestId("multi-select-coachmark")).toHaveAttribute(
      "data-state",
      "hidden"
    );
  });

  it("hides coachmark immediately when selection changes from 1 to 2", () => {
    vi.useFakeTimers();
    const { rerender } = renderFloatingClaimBar(1);

    expect(screen.getByTestId("multi-select-coachmark")).toHaveAttribute(
      "data-state",
      "visible"
    );

    act(() => {
      rerender(
        createElement(FloatingClaimBar, {
          selectedCount: 2,
          onClaim: () => {},
          onClear: () => {},
        })
      );
    });

    expect(screen.getByTestId("multi-select-coachmark")).toHaveAttribute(
      "data-state",
      "hidden"
    );

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(window.localStorage.getItem(MULTI_SELECT_HINT_SEEN_KEY)).toBeNull();
  });

  it("does not render the old inline helper text inside the bar", () => {
    renderFloatingClaimBar(1);

    expect(
      within(screen.getByTestId("floating-claim-bar")).queryByText(
        "Tap more to select multiple"
      )
    ).not.toBeInTheDocument();
  });
});
