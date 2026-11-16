import type { Metadata, MetadataRelation } from "~/types/metadata";

const DEFAULT_METADATA_ENDPOINT = "http://localhost:8080/";

export function getMetadataEndpoint(): string {
  const value = process.env.METADATA_ENDPOINT?.trim();
  return value || DEFAULT_METADATA_ENDPOINT;
}

export function metadataPackageUrl(
  domainName: string,
  packageName: string,
): string {
  const base = getMetadataEndpoint().replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(domainName)}/${encodeURIComponent(packageName)}`;
}

export async function fetchMetadata(): Promise<Metadata[]> {
  return fetchMetadataList(getMetadataEndpoint());
}

export async function fetchMetadataForPackage(
  domainName: string,
  packageName: string,
): Promise<Metadata[]> {
  return fetchMetadataList(metadataPackageUrl(domainName, packageName));
}

async function fetchMetadataList(url: string): Promise<Metadata[]> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Metadata-tjenesten svarte ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    throw new Error("Metadata-tjenesten returnerte ikke en liste.");
  }

  return body.map((item, index) => parseMetadata(item, index));
}

function parseMetadata(value: unknown, index: number): Metadata {
  if (!isRecord(value)) {
    throw new Error(`Ugyldig metadata-objekt på indeks ${index}`);
  }
  if (typeof value.domainName !== "string" || value.domainName.length === 0) {
    throw new Error(`Mangler domainName på indeks ${index}`);
  }
  if (
    typeof value.resourceName !== "string" ||
    value.resourceName.length === 0
  ) {
    throw new Error(`Mangler resourceName på indeks ${index}`);
  }

  return {
    domainName: value.domainName,
    packageName:
      typeof value.packageName === "string" ? value.packageName : null,
    resourceName: value.resourceName,
    fields: parseStringList(value.fields),
    idFields: parseStringList(value.idFields),
    writeable: value.writeable === true,
    relations: parseRelations(value.relations),
  };
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function parseRelations(value: unknown): MetadataRelation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string") {
      return [];
    }
    return [
      {
        name: item.name,
        multiplicity:
          typeof item.multiplicity === "string" ? item.multiplicity : "",
        classPackageName:
          typeof item.classPackageName === "string"
            ? item.classPackageName
            : "",
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
