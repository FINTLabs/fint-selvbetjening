import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Metadata } from "~/types/metadata";

import {
  EMPTY_PACKAGE_VALUE,
  optionsForSelection,
  TestRunnerSelectForm,
} from "./TestRunnerSelectForm";

const elev: Metadata = {
  domainName: "utdanning",
  packageName: "elev",
  resourceName: "elev",
  fields: [],
  idFields: [],
  writeable: false,
  relations: [],
};

const basisgruppe: Metadata = {
  ...elev,
  resourceName: "basisgruppe",
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

const kontaktperson: Metadata = {
  domainName: "felles",
  packageName: null,
  resourceName: "kontaktperson",
  fields: [],
  idFields: [],
  writeable: false,
  relations: [],
};

describe("optionsForSelection", () => {
  const metadata = [elev, basisgruppe, fullmakt, kontaktperson];

  it("lists all domains before a domain is chosen", () => {
    expect(
      optionsForSelection(metadata, { domainName: "", packageName: "" })
        .domains,
    ).toEqual(["administrasjon", "felles", "utdanning"]);
  });

  it("narrows packages to the selected domain", () => {
    const options = optionsForSelection(metadata, {
      domainName: "utdanning",
      packageName: "",
    });

    expect(options.packages).toEqual(["elev"]);
    expect(options.resources).toEqual([]);
  });

  it("narrows resources to the selected package", () => {
    expect(
      optionsForSelection(metadata, {
        domainName: "utdanning",
        packageName: "elev",
      }).resources,
    ).toEqual(["basisgruppe", "elev"]);
  });

  it("uses a sentinel for a missing package name", () => {
    expect(
      optionsForSelection(metadata, {
        domainName: "felles",
        packageName: "",
      }).packages,
    ).toEqual([EMPTY_PACKAGE_VALUE]);
  });
});

describe("TestRunnerSelectForm", () => {
  it("fills dropdowns from the catalog columns", async () => {
    const user = userEvent.setup();
    const onSelectChange = vi.fn();

    const { rerender } = render(
      <TestRunnerSelectForm
        metadata={[elev, basisgruppe, fullmakt, kontaktperson]}
        selection={{ domainName: "", packageName: "", resourceName: "" }}
        onSelectChange={onSelectChange}
      />,
    );

    const domain = screen.getByLabelText("Domene");
    const pkg = screen.getByLabelText("Pakke");
    const resource = screen.getByLabelText("Ressurs");

    expect(pkg).toBeDisabled();
    expect(resource).toBeDisabled();

    await user.selectOptions(domain, "utdanning");
    expect(onSelectChange).toHaveBeenCalledWith("domainName", "utdanning");

    rerender(
      <TestRunnerSelectForm
        metadata={[elev, basisgruppe, fullmakt, kontaktperson]}
        selection={{
          domainName: "utdanning",
          packageName: "",
          resourceName: "",
        }}
        onSelectChange={onSelectChange}
      />,
    );

    expect(screen.getByLabelText("Pakke")).toBeEnabled();
    expect(screen.getByRole("option", { name: "elev" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "fullmakt" }),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Pakke"), "elev");
    expect(onSelectChange).toHaveBeenCalledWith("packageName", "elev");

    rerender(
      <TestRunnerSelectForm
        metadata={[elev, basisgruppe, fullmakt, kontaktperson]}
        selection={{
          domainName: "utdanning",
          packageName: "elev",
          resourceName: "",
        }}
        onSelectChange={onSelectChange}
      />,
    );

    expect(screen.getByLabelText("Ressurs")).toBeEnabled();
    expect(
      screen.getByRole("option", { name: "basisgruppe" }),
    ).toBeInTheDocument();
  });
});
