import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TypeBadge, { getBorderColor, getTypeConfig } from "@/components/TypeBadge";

describe("TypeBadge", () => {
  it("renders the type label capitalized", () => {
    render(<TypeBadge type="concert" />);
    expect(screen.getByText("Concert")).toBeInTheDocument();
  });

  it('renders "Event" for null type', () => {
    render(<TypeBadge type={null} />);
    expect(screen.getByText("Event")).toBeInTheDocument();
  });

  it("handles unknown type with default style", () => {
    const config = getTypeConfig("unknown_type");
    expect(config.className).toContain("bg-gray");
  });
});

describe("getBorderColor", () => {
  it("returns purple for concert", () => {
    expect(getBorderColor("concert")).toContain("purple");
  });

  it("returns gray for null", () => {
    expect(getBorderColor(null)).toContain("gray");
  });
});
