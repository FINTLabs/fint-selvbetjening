import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Metadata } from "~/types/metadata";

import TestRunnerList, { loader, sortMetadata } from "./list";
import type { Route } from "./+types/list";

const { mockSetSearchParams } = vi.hoisted(() => ({
  mockSetSearchParams: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>(
    "react-router",
  );
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

vi.mock("~/server/auth.server", () => ({
  requireUser: vi.fn(),
}));

vi.mock("~/server/metadata.server", () => ({
  fetchMetadata: vi.fn(),
  fetchMetadataForPackage: vi.fn(),
  metadataPackageUrl: vi.fn(
    (domainName: string, packageName: string) =>
      `http://localhost:8080/${domainName}/${packageName}`,
  ),
}));

const { requireUser } = await import("~/server/auth.server");
const { fetchMetadata, fetchMetadataForPackage } = await import(
  "~/server/metadata.server"
);

const elev: Metadata = {
  domainName: "utdanning",
  packageName: "elev",
  resourceName: "elev",
  fields: ["systemId"],
  idFields: ["systemId"],
  writeable: false,
  relations: [],
};

const elevforhold: Metadata = {
  ...elev,
  resourceName: "elevforhold",
};

const fullmakt: Metadata = {
  domainName: "administrasjon",
  packageName: "fullmakt",
  resourceName: "fullmakt",
  fields: [],
  idFields: [],
  writeable: false,
  relations: [],
};

function renderList(
  loaderData: Partial<Route.ComponentProps["loaderData"]> = {},
) {
  return render(
    <TestRunnerList
      {...({
        loaderData: {
          metadata: [fullmakt, elev],
          error: null,
          domainName: "",
          packageName: "",
          resourceName: "",
          packageMetadata: null,
          packageError: null,
          packageUrl: null,
          ...loaderData,
        },
        params: {},
        matches: [],
      } as unknown as Route.ComponentProps)}
    />,
  );
}

describe("sortMetadata", () => {
  it("sorts by domain, package, then resource", () => {
    expect(
      sortMetadata([
        elev,
        fullmakt,
        { ...elev, resourceName: "basisgruppe" },
      ]).map((item) => `${item.domainName}/${item.packageName}/${item.resourceName}`),
    ).toEqual([
      "administrasjon/fullmakt/fullmakt",
      "utdanning/elev/basisgruppe",
      "utdanning/elev/elev",
    ]);
  });
});

describe("testrunner loader", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(fetchMetadata).mockReset();
    vi.mocked(fetchMetadataForPackage).mockReset();
  });

  it("does not fetch package data until a package is selected", async () => {
    vi.mocked(fetchMetadata).mockResolvedValue([elev, fullmakt]);

    const data = await loader({
      request: new Request("http://localhost/testrunner"),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    expect(fetchMetadataForPackage).not.toHaveBeenCalled();
    expect(data.packageMetadata).toBeNull();
  });

  it("fetches package metadata from the domain/package URL", async () => {
    vi.mocked(fetchMetadata).mockResolvedValue([elev, fullmakt]);
    vi.mocked(fetchMetadataForPackage).mockResolvedValue([elev, elevforhold]);

    const data = await loader({
      request: new Request(
        "http://localhost/testrunner?domainName=utdanning&packageName=elev",
      ),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    expect(fetchMetadataForPackage).toHaveBeenCalledWith("utdanning", "elev");
    expect(data.packageUrl).toBe("http://localhost:8080/utdanning/elev");
    expect(data.packageMetadata).toEqual([elev, elevforhold]);
  });
});

describe("TestRunnerList", () => {
  it("renders catalog rows", () => {
    renderList();

    expect(screen.getByRole("heading", { name: "Testrunner" })).toBeInTheDocument();
    expect(screen.getByLabelText("Domene")).toBeInTheDocument();
    expect(screen.getByLabelText("Pakke")).toBeInTheDocument();
    expect(screen.getByLabelText("Ressurs")).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "utdanning elev elev" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "administrasjon fullmakt fullmakt" }),
    ).toBeInTheDocument();
  });

  it("renders fetched package data under the form", () => {
    renderList({
      domainName: "utdanning",
      packageName: "elev",
      packageUrl: "http://localhost:8080/utdanning/elev",
      packageMetadata: [elev, elevforhold],
    });

    expect(
      screen.getByRole("heading", { name: "utdanning / elev" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("http://localhost:8080/utdanning/elev"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "utdanning elev elevforhold" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "administrasjon fullmakt fullmakt" }),
    ).toBeInTheDocument();
  });

  it("renders an error from the loader", () => {
    renderList({
      metadata: [],
      error: "Metadata-tjenesten svarte 503",
    });

    expect(screen.getByText("Kunne ikke hente metadata")).toBeInTheDocument();
    expect(
      screen.getByText("Metadata-tjenesten svarte 503"),
    ).toBeInTheDocument();
  });
});
