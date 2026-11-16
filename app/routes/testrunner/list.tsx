import {
  BodyLong,
  Heading,
  LocalAlert,
  Table,
  VStack,
} from "@navikt/ds-react";
import { useSearchParams } from "react-router";

import { requireUser } from "~/server/auth.server";
import {
  fetchMetadata,
  fetchMetadataForPackage,
  metadataPackageUrl,
} from "~/server/metadata.server";
import type { Metadata } from "~/types/metadata";
import {
  EMPTY_PACKAGE_VALUE,
  TestRunnerSelectForm,
  type Selection,
} from "./TestRunnerSelectForm";
import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Testrunner - FINT Selvbetjening" },
    { name: "description", content: "Metadata for testrunner-rapporten" },
  ];
}

function searchValue(url: URL, name: keyof Selection): string {
  return url.searchParams.get(name) ?? "";
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const url = new URL(request.url);
  const domainName = searchValue(url, "domainName");
  const packageName = searchValue(url, "packageName");
  const resourceName = searchValue(url, "resourceName");
  const hasPackageSelection =
    Boolean(domainName) &&
    Boolean(packageName) &&
    packageName !== EMPTY_PACKAGE_VALUE;

  let metadata: Metadata[] = [];
  let error: string | null = null;
  try {
    metadata = sortMetadata(await fetchMetadata());
  } catch (caught) {
    error =
      caught instanceof Error ? caught.message : "Kunne ikke hente metadata.";
  }

  let packageMetadata: Metadata[] | null = null;
  let packageError: string | null = null;
  let packageUrl: string | null = null;
  if (hasPackageSelection) {
    packageUrl = metadataPackageUrl(domainName, packageName);
    try {
      packageMetadata = sortMetadata(
        await fetchMetadataForPackage(domainName, packageName),
      );
    } catch (caught) {
      packageError =
        caught instanceof Error
          ? caught.message
          : "Kunne ikke hente pakkedata.";
    }
  }

  return {
    metadata,
    error,
    domainName,
    packageName,
    resourceName,
    packageMetadata,
    packageError,
    packageUrl,
  };
}

export default function TestRunnerList({ loaderData }: Route.ComponentProps) {
  const {
    metadata,
    error,
    domainName,
    packageName,
    resourceName,
    packageMetadata,
    packageError,
    packageUrl,
  } = loaderData;
  const [, setSearchParams] = useSearchParams();

  function handleSelectChange(name: keyof Selection, value: string) {
    const nextParams = new URLSearchParams();
    const nextSelection: Selection = {
      domainName,
      packageName,
      resourceName,
      [name]: value,
    };

    if (name === "domainName") {
      nextSelection.packageName = "";
      nextSelection.resourceName = "";
    } else if (name === "packageName") {
      nextSelection.resourceName = "";
    }

    if (nextSelection.domainName) {
      nextParams.set("domainName", nextSelection.domainName);
    }
    if (nextSelection.packageName) {
      nextParams.set("packageName", nextSelection.packageName);
    }
    if (nextSelection.resourceName) {
      nextParams.set("resourceName", nextSelection.resourceName);
    }

    setSearchParams(nextParams, { preventScrollReset: true });
  }

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <Heading size="large">Testrunner</Heading>
      <BodyLong>
        Ressurser fra metadatakatalogen. Disse brukes senere til å kjøre
        testrunner-rapporten.
      </BodyLong>

      {error ? (
        <LocalAlert status="error">
          <LocalAlert.Header>
            <LocalAlert.Title>Kunne ikke hente metadata</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>{error}</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : metadata.length === 0 ? (
        <LocalAlert status="announcement">
          <LocalAlert.Header>
            <LocalAlert.Title>Ingen metadata</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>Metadatakatalogen returnerte ingen ressurser.</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : (
        <>
          <TestRunnerSelectForm
            metadata={metadata}
            selection={{ domainName, packageName, resourceName }}
            onSelectChange={handleSelectChange}
          />

          {packageError ? (
            <LocalAlert status="error">
              <LocalAlert.Header>
                <LocalAlert.Title>Kunne ikke hente pakkedata</LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                <BodyLong>{packageError}</BodyLong>
              </LocalAlert.Content>
            </LocalAlert>
          ) : packageMetadata ? (
            <VStack gap="space-8">
              <Heading size="medium">
                {domainName} / {packageName}
              </Heading>
              {packageUrl ? <BodyLong>{packageUrl}</BodyLong> : null}
              <MetadataTable
                items={packageMetadata}
                emptyText="Pakken har ingen ressurser."
              />
            </VStack>
          ) : (
            <LocalAlert status="announcement">
              <LocalAlert.Header>
                <LocalAlert.Title>Ingen pakke valgt</LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                <BodyLong>
                  Velg domene og pakke for å hente data fra
                  metadata-endepunktet.
                </BodyLong>
              </LocalAlert.Content>
            </LocalAlert>
          )}

          <MetadataTable items={metadata} />
        </>
      )}
    </VStack>
  );
}

function MetadataTable({
  items,
  emptyText,
}: {
  items: Metadata[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <LocalAlert status="announcement">
        <LocalAlert.Header>
          <LocalAlert.Title>Ingen metadata</LocalAlert.Title>
        </LocalAlert.Header>
        <LocalAlert.Content>
          <BodyLong>{emptyText ?? "Ingen ressurser å vise."}</BodyLong>
        </LocalAlert.Content>
      </LocalAlert>
    );
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell scope="col">Domene</Table.HeaderCell>
          <Table.HeaderCell scope="col">Pakke</Table.HeaderCell>
          <Table.HeaderCell scope="col">Ressurs</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {items.map((item) => (
          <Table.Row key={metadataKey(item)}>
            <Table.HeaderCell scope="row">{item.domainName}</Table.HeaderCell>
            <Table.DataCell>{item.packageName ?? "—"}</Table.DataCell>
            <Table.DataCell>{item.resourceName}</Table.DataCell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

export function sortMetadata(metadata: Metadata[]): Metadata[] {
  return [...metadata].sort((a, b) => {
    const domain = a.domainName.localeCompare(b.domainName, "nb");
    if (domain !== 0) {
      return domain;
    }
    const packageName = (a.packageName ?? "").localeCompare(
      b.packageName ?? "",
      "nb",
    );
    if (packageName !== 0) {
      return packageName;
    }
    return a.resourceName.localeCompare(b.resourceName, "nb");
  });
}

function metadataKey(item: Metadata): string {
  return `${item.domainName}/${item.packageName ?? "-"}/${item.resourceName}`;
}
