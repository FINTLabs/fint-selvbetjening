import { afterEach, describe, expect, it, vi } from "vitest";

import { HeaderProperties } from "~/utils/headerProperties";

vi.mock("~/server/users.server", () => ({
  getUserByNin: vi.fn(),
}));

const { getUserByNin } = await import("~/server/users.server");
const { fetchMe, requireAdmin, requireUser } = await import("~/server/auth.server");

function requestWithNin(nin?: string, cookie?: string) {
  const headers = new Headers();
  if (nin) {
    headers.set("x-nin", nin);
  }
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  return new Request("http://localhost/", { headers });
}

const twoOrgs = [
  {
    id: "org-1",
    name: "jennifer_test",
    displayName: "Test Organisation 1",
    orgNumber: "123456789",
  },
  {
    id: "org-2",
    name: "test_org_2",
    displayName: "Test Organisation 2",
    orgNumber: "555555555",
  },
];

describe("fetchMe", () => {
  afterEach(() => {
    HeaderProperties.setProperties(new Request("http://localhost/"));
    vi.mocked(getUserByNin).mockReset();
  });

  it("throws 401 when x-nin is missing", async () => {
    HeaderProperties.setProperties(requestWithNin());

    await expect(fetchMe()).rejects.toMatchObject({
      status: 401,
      statusText: "Du er ikke innlogget.",
    });
    expect(getUserByNin).not.toHaveBeenCalled();
  });

  it("throws 406 when no user exists for the nin", async () => {
    HeaderProperties.setProperties(requestWithNin("00000000000"));
    vi.mocked(getUserByNin).mockResolvedValue(null);

    await expect(fetchMe()).rejects.toMatchObject({
      status: 406,
      statusText: "Du har ikke opprettet bruker.",
    });
  });

  it("returns the user when x-nin matches a row", async () => {
    HeaderProperties.setProperties(requestWithNin("123456789"));
    vi.mocked(getUserByNin).mockResolvedValue({
      id: "user-1",
      nin: "123456789",
      firstName: "Calvin",
      lastName: "Ball",
      mail: "calvin.ball@fint.no",
      mobile: "+4712345678",
      organisations: twoOrgs,
      isAdmin: false,
    });

    await expect(fetchMe()).resolves.toMatchObject({
      id: "user-1",
      nin: "123456789",
      name: "Calvin Ball",
      firstName: "Calvin",
      lastName: "Ball",
      mail: "calvin.ball@fint.no",
      isAdmin: false,
      organisation: {
        name: "jennifer_test",
        displayName: "Test Organisation 1",
        orgNumber: "123456789",
      },
      organisations: twoOrgs,
    });
  });

  it("selects the organisation from the cookie when the user is a member", async () => {
    const { selectOrgCookie } = await import("~/utils/cookie");
    const cookie = await selectOrgCookie.serialize("test_org_2");
    HeaderProperties.setProperties(requestWithNin("123456789", cookie));
    vi.mocked(getUserByNin).mockResolvedValue({
      id: "user-1",
      nin: "123456789",
      firstName: "Calvin",
      lastName: "Ball",
      mail: "calvin.ball@fint.no",
      mobile: "+4712345678",
      organisations: twoOrgs,
      isAdmin: false,
    });

    const user = await fetchMe();

    expect(user.organisation).toMatchObject({ name: "test_org_2" });
  });

  it("falls back to the first organisation when the cookie is not a membership", async () => {
    const { selectOrgCookie } = await import("~/utils/cookie");
    const cookie = await selectOrgCookie.serialize("someone_elses_org");
    HeaderProperties.setProperties(requestWithNin("123456789", cookie));
    vi.mocked(getUserByNin).mockResolvedValue({
      id: "user-1",
      nin: "123456789",
      firstName: "Calvin",
      lastName: "Ball",
      mail: "calvin.ball@fint.no",
      mobile: "+4712345678",
      organisations: twoOrgs,
      isAdmin: false,
    });

    const user = await fetchMe();

    expect(user.organisation).toMatchObject({ name: "jennifer_test" });
  });
});

describe("requireUser", () => {
  afterEach(() => {
    HeaderProperties.setProperties(new Request("http://localhost/"));
    vi.mocked(getUserByNin).mockReset();
  });

  it("reads x-nin from the request before looking up the user", async () => {
    vi.mocked(getUserByNin).mockResolvedValue({
      id: "user-1",
      nin: "123456789",
      firstName: "Calvin",
      lastName: "Ball",
      mail: "calvin.ball@fint.no",
      mobile: null,
      organisations: [],
      isAdmin: false,
    });

    const user = await requireUser(requestWithNin("123456789"));

    expect(user.name).toBe("Calvin Ball");
    expect(getUserByNin).toHaveBeenCalledWith("123456789");
  });
});

describe("requireAdmin", () => {
  afterEach(() => {
    HeaderProperties.setProperties(new Request("http://localhost/"));
    vi.mocked(getUserByNin).mockReset();
  });

  it("throws 403 when the user is not an admin", async () => {
    vi.mocked(getUserByNin).mockResolvedValue({
      id: "user-1",
      nin: "123456789",
      firstName: "Calvin",
      lastName: "Ball",
      mail: "calvin.ball@fint.no",
      mobile: null,
      organisations: [],
      isAdmin: false,
    });

    await expect(requireAdmin(requestWithNin("123456789"))).rejects.toMatchObject({
      status: 403,
      statusText: "Du har ikke tilgang.",
    });
  });

  it("returns the user when they are an admin", async () => {
    vi.mocked(getUserByNin).mockResolvedValue({
      id: "user-2",
      nin: "987654321",
      firstName: "Jennifer",
      lastName: "Maarberg",
      mail: "jennifer.maarberg@fint.no",
      mobile: null,
      organisations: [],
      isAdmin: true,
    });

    const user = await requireAdmin(requestWithNin("987654321"));

    expect(user.isAdmin).toBe(true);
    expect(user.name).toBe("Jennifer Maarberg");
  });
});
