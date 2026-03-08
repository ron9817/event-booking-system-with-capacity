import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CapacityBar from "@/components/CapacityBar";

describe("CapacityBar", () => {
  it("shows booked count label when plenty of spots left", () => {
    render(<CapacityBar booked={10} capacity={100} />);
    expect(screen.getByText("10 of 100 booked")).toBeInTheDocument();
  });

  it('shows "X spots left" when 5 or fewer remain', () => {
    render(<CapacityBar booked={97} capacity={100} />);
    expect(screen.getByText("3 spots left")).toBeInTheDocument();
  });

  it('shows "1 spot left" singular', () => {
    render(<CapacityBar booked={99} capacity={100} />);
    expect(screen.getByText("1 spot left")).toBeInTheDocument();
  });

  it('shows "Sold out" when fully booked', () => {
    render(<CapacityBar booked={100} capacity={100} />);
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    render(<CapacityBar booked={10} capacity={100} showLabel={false} />);
    expect(screen.queryByText("10 of 100 booked")).not.toBeInTheDocument();
  });

  it("handles zero capacity gracefully", () => {
    render(<CapacityBar booked={0} capacity={0} />);
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });
});
