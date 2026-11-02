import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import messages from "../../../messages/en.json";
import LandingMetrics from "@/components/landing/landing-metrics";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: "en", messages, namespace: namespace as "LandingMetrics" }),
  getFormatter: async () => ({ number: (n: number) => n.toLocaleString("en") }),
}));

describe("LandingMetrics", () => {
  it("shows completed khatms with exact numbers and no 'active' or '+' wording", async () => {
    render(
      await LandingMetrics({
        stats: { totalCircles: 9, totalJuzClaimed: 1200, khatmsCompleted: 3 },
      }),
    );

    expect(screen.getByText("Khatms completed")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });
});
