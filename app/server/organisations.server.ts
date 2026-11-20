import { query } from "~/server/db.server";

export type OrganisationRecord = {
  id: string;
  name: string;
  displayName: string;
  orgNumber: string;
  primaryAssetId: string | null;
};

type OrganisationRow = {
  id: string;
  name: string;
  display_name: string;
  org_number: string;
  primary_asset_id: string | null;
};

function toOrganisationRecord(row: OrganisationRow): OrganisationRecord {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    orgNumber: row.org_number,
    primaryAssetId: row.primary_asset_id,
  };
}

const ORGANISATION_COLUMNS = `
  o.id, o.name, o.display_name, o.org_number, o.primary_asset_id
`;

type OrganisationWithLegalContactRow = OrganisationRow & {
  legal_contact_id: string | null;
  legal_contact_name: string | null;
  legal_contact_mail: string | null;
};

const FROM_ORGANISATIONS_WITH_LEGAL_CONTACT = `
  select ${ORGANISATION_COLUMNS}, o.legal_contact_id,
         contact.first_name || ' ' || contact.last_name as legal_contact_name,
         contact.mail as legal_contact_mail
  from organisations o
  left join users contact on contact.id = o.legal_contact_id
`;

function toOrganisationWithLegalContact(row: OrganisationWithLegalContactRow) {
  return {
    ...toOrganisationRecord(row),
    legalContactId: row.legal_contact_id,
    legalContactName: row.legal_contact_name,
    legalContactMail: row.legal_contact_mail,
  };
}

export async function listOrganisationsWithLegalContacts() {
  const rows = await query<OrganisationWithLegalContactRow>(
    `${FROM_ORGANISATIONS_WITH_LEGAL_CONTACT} order by o.display_name`,
  );
  return rows.map((row) => ({
    ...toOrganisationRecord(row),
    legalContactId: row.legal_contact_id,
    legalContactName: row.legal_contact_name,
  }));
}

export async function getOrganisationWithLegalContact(id: string) {
  const rows = await query<OrganisationWithLegalContactRow>(
    `${FROM_ORGANISATIONS_WITH_LEGAL_CONTACT} where o.id::text = $1`,
    [id],
  );
  return rows[0] ? toOrganisationWithLegalContact(rows[0]) : null;
}

export async function listOrganisations(): Promise<OrganisationRecord[]> {
  const rows = await query<OrganisationRow>(
    `
      select ${ORGANISATION_COLUMNS}
      from organisations o
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
      from organisations o
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
      from organisations o
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

type OrganisationInput = {
  name: string;
  displayName: string;
  orgNumber: string;
  legalContactId: string;
};

const DUPLICATE_ORGANISATION =
  "Det finnes allerede en organisasjon med dette navnet eller organisasjonsnummeret.";

export async function createOrganisation(
  input: Omit<OrganisationInput, "legalContactId"> & {
    primaryAssetId: string;
  },
): Promise<OrganisationRecord> {
  try {
    const [organisation] = await query<OrganisationRow>(
      `
        insert into organisations as o (name, display_name, org_number, primary_asset_id)
        values ($1, $2, $3, $4)
        returning ${ORGANISATION_COLUMNS}
      `,
      [input.name, input.displayName, input.orgNumber, input.primaryAssetId],
    );
    return toOrganisationRecord(organisation);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(DUPLICATE_ORGANISATION);
    }
    throw error;
  }
}

export async function updateOrganisation(
  organisationId: string,
  input: OrganisationInput,
): Promise<boolean> {
  try {
    const rows = await query<{ id: string }>(
      `
        update organisations o
        set name = $2, display_name = $3, org_number = $4,
            legal_contact_id = coalesce(nullif($5::text, '')::uuid, o.legal_contact_id),
            updated_at = now()
        where o.id::text = $1
          and ($5 = '' or exists (
            select 1 from organisation_users membership
            where membership.organisation_id = o.id and membership.user_id::text = $5
          ))
        returning o.id
      `,
      [organisationId, input.name, input.displayName, input.orgNumber, input.legalContactId],
    );
    return rows.length === 1;
  } catch (error) {
    if (isLegalContactMembershipViolation(error)) {
      return false;
    }
    if (isUniqueViolation(error)) {
      throw new Error(DUPLICATE_ORGANISATION);
    }
    throw error;
  }
}

export async function setOrganisationLegalContact(
  organisationId: string,
  userId: string,
  expectedLegalContactId: string | null,
): Promise<boolean> {
  try {
    const rows = await query<{ id: string }>(
      `
        update organisations o
        set legal_contact_id = membership.user_id, updated_at = now()
        from organisation_users membership
        where o.id::text = $1
          and membership.organisation_id = o.id
          and membership.user_id = $2
          and o.legal_contact_id::text is not distinct from $3::text
        returning o.id
      `,
      [organisationId, userId, expectedLegalContactId],
    );
    return rows.length === 1;
  } catch (error) {
    if (isLegalContactMembershipViolation(error)) return false;
    throw error;
  }
}

export function isLegalContactMembershipViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503" &&
    "constraint" in error &&
    error.constraint === "organisations_legal_contact_membership_fk"
  );
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
