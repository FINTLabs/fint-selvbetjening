import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ComponentCategoryGrid } from "~/components/ComponentCategoryGrid";
import type { ComponentRecord } from "~/types/integrations";

const elev: ComponentRecord = {
  id: "comp-1",
  name: "elev",
  description: "Utdanning Elev",
  category: "utdanning",
  basePath: "/utdanning/elev",
};

describe("ComponentCategoryGrid", () => {
  it("calls onToggle when a component is turned on", () => {
    const onToggle = vi.fn();

    render(
      <ComponentCategoryGrid
        components={[elev]}
        selectedItems={[]}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "elev" }));
    expect(onToggle).toHaveBeenCalledWith("elev", true);
  });

  it("marks enabled components as checked", () => {
    render(
      <ComponentCategoryGrid components={[elev]} selectedItems={["elev"]} />,
    );

    expect(screen.getByRole("checkbox", { name: "elev" })).toBeChecked();
  });
});
