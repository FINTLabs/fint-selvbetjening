import { query } from "~/server/db.server";

export type OrganisationRecord = {
  id: string;
  name: string;
  displayName: string;
  orgNumber: string;
};

type OrganisationRow = {
  id: string;
  name: string;
  display_name: string;
  org_number: string;
};

function toOrganisationRecord(row: OrganisationRow): OrganisationRecord {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    orgNumber: row.org_number,
  };
}

const ORGANISATION_COLUMNS = `
  id, name, display_name, org_number
`;

export async function listOrganisations(): Promise<OrganisationRecord[]> {
  const rows = await query<OrganisationRow>(
    `
      select ${ORGANISATION_COLUMNS}
      from organisations
      order by display_name
    `,
  );
  return rows.map(toOrganisationRecord);
}

export async function getOrganisationById(
  id: string,
): Promise<OrganisationRecord | null> {
  const rows = await query<OrganisationRow>(
    `
      select ${ORGANISATION_COLUMNS}
      from organisations
      where id = $1
    `,
    [id],
  );
  return rows[0] ? toOrganisationRecord(rows[0]) : null;
}

export async function getOrganisationByRef(
  organisationRef: string,
): Promise<OrganisationRecord | null> {
  const rows = await query<OrganisationRow>(
    `
      select ${ORGANISATION_COLUMNS}
      from organisations
      where id::text = $1
         or name = $1
         or org_number = $1
    `,
    [organisationRef],
  );
  return rows[0] ? toOrganisationRecord(rows[0]) : null;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function createOrganisation(input: {
  name: string;
  displayName: string;
  orgNumber: string;
}): Promise<OrganisationRecord> {
  try {
    const rows = await query<OrganisationRow>(
      `
        insert into organisations (name, display_name, org_number)
        values ($1, $2, $3)
        returning ${ORGANISATION_COLUMNS}
      `,
      [input.name, input.displayName, input.orgNumber],
    );
    return toOrganisationRecord(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        "Det finnes allerede en organisasjon med dette navnet eller organisasjonsnummeret.",
      );
    }
    throw error;
  }
}

export async function listOrganisationsForUser(
  userId: string,
): Promise<OrganisationRecord[]> {
  const rows = await query<OrganisationRow>(
    `
      select ${ORGANISATION_COLUMNS}
      from organisations o
      join organisation_users ou on ou.organisation_id = o.id
      where ou.user_id = $1
      order by o.display_name
    `,
    [userId],
  );
  return rows.map(toOrganisationRecord);
}
