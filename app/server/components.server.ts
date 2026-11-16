import { query } from "~/server/db.server";
import type { ComponentRecord } from "~/types/integrations";

type ComponentRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  base_path: string;
};

function toComponentRecord(row: ComponentRow): ComponentRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    basePath: row.base_path,
  };
}

export async function listComponents(): Promise<ComponentRecord[]> {
  const rows = await query<ComponentRow>(
    `
      select id, name, description, category, base_path
      from components
      order by category, name
    `,
  );
  return rows.map(toComponentRecord);
}

export async function listEnabledComponentsForOrganisation(
  organisationId: string,
): Promise<ComponentRecord[]> {
  const rows = await query<ComponentRow>(
    `
      select c.id, c.name, c.description, c.category, c.base_path
      from components c
      join organisation_components oc on oc.component_id = c.id
      where oc.organisation_id = $1
      order by c.category, c.name
    `,
    [organisationId],
  );
  return rows.map(toComponentRecord);
}

export async function setOrganisationComponent(
  organisationId: string,
  componentName: string,
  enabled: boolean,
): Promise<void> {
  const components = await query<{ id: string }>(
    `
      select id
      from components
      where name = $1
    `,
    [componentName],
  );
  const component = components[0];
  if (!component) {
    throw new Error("Komponenten finnes ikke.");
  }

  if (enabled) {
    await query(
      `
        insert into organisation_components (organisation_id, component_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [organisationId, component.id],
    );
    return;
  }

  await query(
    `
      delete from organisation_components
      where organisation_id = $1
        and component_id = $2
    `,
    [organisationId, component.id],
  );
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function categoryFromBasePath(basePath: string): string {
  return basePath.split("/").filter(Boolean)[0] ?? "";
}

export function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export async function createComponent(input: {
  name: string;
  description: string;
  category: string;
  basePath: string;
}): Promise<ComponentRecord> {
  try {
    const rows = await query<ComponentRow>(
      `
        insert into components (name, description, category, base_path)
        values ($1, $2, $3, $4)
        returning id, name, description, category, base_path
      `,
      [input.name, input.description, input.category, input.basePath],
    );
    return toComponentRecord(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Det finnes allerede en komponent med dette navnet.");
    }
    throw error;
  }
}
