import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBadge from "@/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders Confirmed badge", () => {
    render(<StatusBadge status="CONFIRMED" />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("renders Cancelled badge", () => {
    render(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});
