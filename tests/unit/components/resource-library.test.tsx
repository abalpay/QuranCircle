import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ResourceLibrary from "@/components/landing/resource-library";

const copy = {
  eyebrow: "Khatm organizer library",
  title: "Practical organizer resources",
  description: "Choose the guide that fits your group.",
  readResource: "Read resource",
  coordinationTitle: "Coordination guide",
  coordinationDescription: "Plan the full workflow.",
  whatsappTitle: "WhatsApp guide",
  whatsappDescription: "Coordinate through one shared link.",
  ramadanTitle: "Ramadan guide",
  ramadanDescription: "Plan a flexible Ramadan Khatm.",
};

describe("ResourceLibrary", () => {
  it("links all three resource intents from the homepage", () => {
    render(<ResourceLibrary copy={copy} />);

    expect(
      screen.getByRole("link", { name: /Coordination guide/i }),
    ).toHaveAttribute("href", "/khatm-coordination");
    expect(
      screen.getByRole("link", { name: /WhatsApp guide/i }),
    ).toHaveAttribute("href", "/group-khatm-whatsapp");
    expect(
      screen.getByRole("link", { name: /Ramadan guide/i }),
    ).toHaveAttribute("href", "/ramadan-group-khatm");
  });
});
