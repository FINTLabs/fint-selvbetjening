import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/organisations.server", () => ({
  getOrganisationByRef: vi.fn(),
}));

vi.mock("~/server/components.server", () => ({
  listEnabledComponentsForOrganisation: vi.fn(),
}));

const { getOrganisationByRef } = await import("~/server/organisations.server");
const { listEnabledComponentsForOrganisation } = await import(
  "~/server/components.server"
);
const { loader } = await import("~/routes/api/organisations/components");

const organisation = {
  id: "00000000-0000-0000-0000-000000000010",
  name: "jennifer_test",
  displayName: "Test Organisation 1",
  orgNumber: "123456789",
};

describe("GET /api/organisation/:organisationId/components", () => {
  afterEach(() => {
    vi.mocked(getOrganisationByRef).mockReset();
    vi.mocked(listEnabledComponentsForOrganisation).mockReset();
  });

  it("returns enabled components for the organisation", async () => {
    vi.mocked(getOrganisationByRef).mockResolvedValue(organisation);
    vi.mocked(listEnabledComponentsForOrganisation).mockResolvedValue([
      {
        id: "comp-1",
        name: "elev",
        description: "Utdanning Elev",
        category: "utdanning",
        basePath: "/utdanning/elev",
      },
    ]);

    const response = await loader({
      params: { organisationId: "123456789" },
    });

    expect(getOrganisationByRef).toHaveBeenCalledWith("123456789");
    expect(listEnabledComponentsForOrganisation).toHaveBeenCalledWith(
      organisation.id,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: "comp-1",
        name: "elev",
        description: "Utdanning Elev",
        category: "utdanning",
        basePath: "/utdanning/elev",
      },
    ]);
  });

  it("returns 404 when the organisation does not exist", async () => {
    vi.mocked(getOrganisationByRef).mockResolvedValue(null);

    const response = await loader({
      params: { organisationId: "123456789" },
    });

    expect(response.status).toBe(404);
    expect(listEnabledComponentsForOrganisation).not.toHaveBeenCalled();
  });
});
