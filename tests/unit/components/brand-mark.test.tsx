import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BrandMark from "@/components/brand-mark";

describe("BrandMark", () => {
  it("is decorative by default", () => {
    const { container } = render(<BrandMark data-testid="brand-mark" />);
    const mark = container.querySelector("svg");

    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark).not.toHaveAttribute("role");
  });

  it("exposes an accessible name when a title is supplied", () => {
    render(<BrandMark title="QuranCircle" />);

    expect(screen.getByRole("img", { name: "QuranCircle" })).toBeInTheDocument();
  });

  it("renders the light-surface palette", () => {
    const { container } = render(<BrandMark variant="on-light" />);
    const paths = container.querySelectorAll("path");

    expect(paths[1]).toHaveAttribute("fill", "#17473b");
    expect(paths[2]).toHaveAttribute("fill", "#718f7b");
  });
});
