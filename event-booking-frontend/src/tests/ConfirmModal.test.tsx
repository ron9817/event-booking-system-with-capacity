import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ConfirmModal from "@/components/ConfirmModal";

function renderModal(overrides: Partial<Parameters<typeof ConfirmModal>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "Test Title",
    children: <p>Test body content</p>,
    ...overrides,
  };
  const result = render(<ConfirmModal {...props} />);
  return { ...result, props };
}

describe("ConfirmModal", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} title="X">
        content
      </ConfirmModal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title and content when open", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test body content")).toBeInTheDocument();
  });

  it("has correct ARIA attributes", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("calls onClose when cancel button clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ cancelLabel: "Go Back" });
    await user.click(screen.getByText("Go Back"));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when confirm button clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderModal({ confirmLabel: "Do It" });
    await user.click(screen.getByText("Do It"));
    expect(props.onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", async () => {
    const user = userEvent.setup();
    const { props } = renderModal();
    await user.keyboard("{Escape}");
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("shows loading state and disables buttons", () => {
    renderModal({ loading: true });
    expect(screen.getByText("Processing...")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    const actionButtons = buttons.filter((b) => b.hasAttribute("disabled"));
    expect(actionButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("close button has aria-label", () => {
    renderModal();
    expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
  });
});
