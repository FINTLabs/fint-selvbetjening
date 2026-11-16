import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/db.server", () => ({
  query: vi.fn(),
}));

const { query } = await import("~/server/db.server");
const {
  listEnabledComponentsForOrganisation,
  setOrganisationComponent,
} = await import("~/server/components.server");

describe("organisation components", () => {
  afterEach(() => {
    vi.mocked(query).mockReset();
  });

  it("lists only components that are on for the organisation", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        id: "comp-1",
        name: "elev",
        description: "Utdanning Elev",
        category: "utdanning",
        base_path: "/utdanning/elev",
      },
    ]);

    await expect(
      listEnabledComponentsForOrganisation("org-1"),
    ).resolves.toEqual([
      {
        id: "comp-1",
        name: "elev",
        description: "Utdanning Elev",
        category: "utdanning",
        basePath: "/utdanning/elev",
      },
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("organisation_components"),
      ["org-1"],
    );
  });

  it("turns a component on for the organisation", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: "comp-1" }])
      .mockResolvedValueOnce([]);

    await setOrganisationComponent("org-1", "elev", true);

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("insert into organisation_components"),
      ["org-1", "comp-1"],
    );
  });

  it("turns a component off for the organisation", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce([{ id: "comp-1" }])
      .mockResolvedValueOnce([]);

    await setOrganisationComponent("org-1", "elev", false);

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("delete from organisation_components"),
      ["org-1", "comp-1"],
    );
  });

  it("throws when the component does not exist", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);

    await expect(
      setOrganisationComponent("org-1", "missing", true),
    ).rejects.toThrow("Komponenten finnes ikke.");
  });
});
