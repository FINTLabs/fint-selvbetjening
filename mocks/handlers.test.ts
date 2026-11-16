import { describe, expect, it } from "vitest";

import {
  ADMIN_URL,
  LINK_WALKER_URL,
  MASKINPORTEN_URL,
  METADATA_URL,
  TEST_RUNNER_URL,
} from "./config";

const testBody = {
  baseUrl: "https://play-with-fint.felleskomponent.no",
  endpoint: "/administrasjon/fullmakt",
  clientName: "basistest@client.fintlabs.no",
};

async function post(url: string, body: unknown = {}) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("external service MSW handlers", () => {
  it("mocks test-runner health", async () => {
    const response = await post(
      `${TEST_RUNNER_URL}/test-runner/calvin_organizations/health`,
      testBody,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("FAILED");
  });

  it("mocks test-runner basic/run", async () => {
    const response = await post(
      `${TEST_RUNNER_URL}/test-runner/calvin_organizations/run`,
      testBody,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resourceResults).toHaveLength(2);
  });

  it("mocks the metadata catalog", async () => {
    const response = await fetch(`${METADATA_URL}/`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].domainName).toBe("arkiv");
    expect(body[0].resourceName).toBe("journalposttype");
  });

  it("mocks metadata for a domain and package", async () => {
    const response = await fetch(`${METADATA_URL}/utdanning/elev`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        domainName: "utdanning",
        packageName: "elev",
        resourceName: "elev",
      }),
    ]);
  });

  it("mocks link-walker tasks", async () => {
    const response = await fetch(
      `${LINK_WALKER_URL}/link-walker/tasks/calvin_organizations`,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].status).toBeTruthy();
  });

  it("mocks felleskomponent events", async () => {
    const response = await fetch(
      "https://api.felleskomponent.no/events/api/fintlabs.no/utdanning-elev/GET_ALL_BASISGRUPPE",
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].corrId).toBeTruthy();
  });

  it("mocks admin component configurations", async () => {
    const response = await fetch(`${ADMIN_URL}/api/components/configurations`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].name).toBeTruthy();
  });

  it("mocks Maskinporten client registration", async () => {
    const response = await post(`${MASKINPORTEN_URL}/clients`, {
      integration_type: "maskinporten",
      client_name: "Test integrasjon",
      token_endpoint_auth_method: "private_key_jwt",
      grant_types: ["urn:ietf:params:oauth:grant-type:jwt-bearer"],
      scopes: ["fint:elev:klient"],
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client_id).toBeTruthy();
    expect(body.client_orgno).toBe("123456789");
  });

  it("mocks Maskinporten JWKS registration", async () => {
    const response = await post(`${MASKINPORTEN_URL}/clients/client-1/jwks`, {
      keys: [{ kty: "RSA", kid: "test-key" }],
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ keys: [] });
  });
});
