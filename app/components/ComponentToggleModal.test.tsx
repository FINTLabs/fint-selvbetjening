import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ComponentToggleModal } from "~/components/ComponentToggleModal";

describe("ComponentToggleModal", () => {
  it("confirms turning a component on without typing the name", () => {
    const onConfirm = vi.fn();

    render(
      <ComponentToggleModal
        isOpen
        componentName="elev"
        isChecked
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />,
    );

    expect(
      screen.getByText("Er du sikker på at du vil slå på denne komponenten?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ja, jeg er sikker" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("requires the component name before turning it off", () => {
    const onConfirm = vi.fn();

    render(
      <ComponentToggleModal
        isOpen
        componentName="elev"
        isChecked={false}
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Ja, jeg er sikker" });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Skriv inn komponentnavnet for å bekrefte"), {
      target: { value: "elev" },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalled();
  });
});
