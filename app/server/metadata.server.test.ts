import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { server } from "../../test/setup";
import {
  fetchMetadata,
  fetchMetadataForPackage,
  getMetadataEndpoint,
  metadataPackageUrl,
} from "./metadata.server";

const endpoint = "http://localhost:8080/";

describe("getMetadataEndpoint", () => {
  const original = process.env.METADATA_ENDPOINT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.METADATA_ENDPOINT;
    } else {
      process.env.METADATA_ENDPOINT = original;
    }
  });

  it("uses METADATA_ENDPOINT when set", () => {
    process.env.METADATA_ENDPOINT = "http://metadata.example/";
    expect(getMetadataEndpoint()).toBe("http://metadata.example/");
  });

  it("falls back to the local catalog", () => {
    delete process.env.METADATA_ENDPOINT;
    expect(getMetadataEndpoint()).toBe(endpoint);
  });
});

describe("fetchMetadata", () => {
  afterEach(() => {
    delete process.env.METADATA_ENDPOINT;
  });

  it("returns catalog entries from the metadata endpoint", async () => {
    process.env.METADATA_ENDPOINT = endpoint;

    const metadata = await fetchMetadata();

    expect(metadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domainName: "arkiv",
          packageName: "kodeverk",
          resourceName: "journalposttype",
        }),
        expect.objectContaining({
          domainName: "felles",
          packageName: null,
          resourceName: "kontaktperson",
        }),
      ]),
    );
  });

  it("treats a missing packageName as null", async () => {
    process.env.METADATA_ENDPOINT = endpoint;
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json([
          {
            domainName: "felles",
            resourceName: "kontaktperson",
          },
        ]),
      ),
    );

    await expect(fetchMetadata()).resolves.toEqual([
      {
        domainName: "felles",
        packageName: null,
        resourceName: "kontaktperson",
        fields: [],
        idFields: [],
        writeable: false,
        relations: [],
      },
    ]);
  });

  it("throws when the service responds with an error", async () => {
    process.env.METADATA_ENDPOINT = endpoint;
    server.use(http.get(endpoint, () => HttpResponse.json({}, { status: 503 })));

    await expect(fetchMetadata()).rejects.toThrow(
      "Metadata-tjenesten svarte 503",
    );
  });

  it("builds a domain/package URL from the endpoint", () => {
    process.env.METADATA_ENDPOINT = endpoint;
    expect(metadataPackageUrl("utdanning", "elev")).toBe(
      "http://localhost:8080/utdanning/elev",
    );
  });

  it("returns resources for a domain and package", async () => {
    process.env.METADATA_ENDPOINT = endpoint;

    await expect(fetchMetadataForPackage("utdanning", "elev")).resolves.toEqual(
      [
        expect.objectContaining({
          domainName: "utdanning",
          packageName: "elev",
          resourceName: "elev",
        }),
      ],
    );
  });

  it("throws when the body is not a list", async () => {
    process.env.METADATA_ENDPOINT = endpoint;
    server.use(http.get(endpoint, () => HttpResponse.json({ domainName: "x" })));

    await expect(fetchMetadata()).rejects.toThrow(
      "Metadata-tjenesten returnerte ikke en liste.",
    );
  });
});
