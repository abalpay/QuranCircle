import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
  it("exposes its accessible name and current value", () => {
    render(<Progress value={42.4} aria-label="Circle progress" />);

    expect(
      screen.getByRole("progressbar", { name: "Circle progress" })
    ).toHaveAttribute("aria-valuenow", "42");
  });

  it("clamps values to the supported range", () => {
    render(<Progress value={140} aria-label="Circle progress" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
  });
});
