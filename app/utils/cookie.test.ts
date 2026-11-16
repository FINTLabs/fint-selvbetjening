import { describe, expect, it } from "vitest";

import { selectOrgCookie } from "~/utils/cookie";

describe("selectOrgCookie", () => {
  it("serializes and parses organisation value", async () => {
    const cookie = await selectOrgCookie.serialize("jennifer_test");

    expect(await selectOrgCookie.parse(cookie)).toBe("jennifer_test");
  });

  it("returns null when cookie header is missing", async () => {
    expect(await selectOrgCookie.parse(null)).toBeNull();
  });
});
