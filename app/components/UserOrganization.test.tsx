import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserOrganization } from "~/components/UserOrganization";
import type { User } from "~/server/auth.server";

const { mockUseSubmit } = vi.hoisted(() => ({
  mockUseSubmit: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useSubmit: () => mockUseSubmit,
  };
});

function createUser(
  organisations: Array<{ name: string; displayName: string }>,
  selectedName?: string,
): User {
  const mapped = organisations.map((organisation, index) => ({
    id: `org-${index + 1}`,
    name: organisation.name,
    displayName: organisation.displayName,
    orgNumber: `${index + 1}`,
  }));

  return {
    id: "user-1",
    nin: "123456789",
    name: "Calvin Ball",
    firstName: "Calvin",
    lastName: "Ball",
    mail: "calvin.ball@fint.no",
    isAdmin: false,
    organisations: mapped,
    organisation:
      mapped.find((organisation) => organisation.name === selectedName) ??
      mapped[0] ??
      null,
  };
}

describe("UserOrganization", () => {
  it("renders display name when user has a single organization", () => {
    render(
      <UserOrganization
        user={createUser([{ name: "org-a", displayName: "Org A" }], "org-a")}
      />,
    );

    expect(screen.getByText("Org A")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders a select and submits update when organization changes", () => {
    render(
      <UserOrganization
        user={createUser(
          [
            { name: "org-a", displayName: "Org A" },
            { name: "org-b", displayName: "Org B" },
          ],
          "org-a",
        )}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("org-a");
    expect(screen.getByRole("option", { name: "Org A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Org B" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "org-b" } });

    expect(mockUseSubmit).toHaveBeenCalledWith(
      {
        selectedOrganization: "org-b",
        actionType: "UPDATE_SELECTED_ORGANIZATION",
      },
      {
        method: "POST",
        action: "/",
        navigate: false,
      },
    );
  });
});
