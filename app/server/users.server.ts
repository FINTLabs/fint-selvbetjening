import type { PoolClient } from "pg";

import { db, query } from "~/server/db.server";
import type { OrganisationRecord } from "~/server/organisations.server";

type OrganisationMembership = OrganisationRecord & { isAdmin: boolean };

export type UserRecord = {
  id: string;
  nin: string;
  firstName: string;
  lastName: string;
  mail: string;
  mobile: string | null;
  isAdmin: boolean;
  organisations: OrganisationMembership[];
};

type UserRow = {
  id: string;
  nin: string;
  first_name: string;
  last_name: string;
  mail: string;
  mobile: string | null;
  is_admin: boolean;
  organisations: OrganisationMembership[] | null;
};

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    nin: row.nin,
    firstName: row.first_name,
    lastName: row.last_name,
    mail: row.mail,
    mobile: row.mobile,
    isAdmin: row.is_admin,
    organisations: row.organisations ?? [],
  };
}

const USER_COLUMNS = `
  u.id, u.nin, u.first_name, u.last_name, u.mail, u.mobile, u.is_admin,
  coalesce(
    json_agg(
      json_build_object(
        'id', o.id,
        'name', o.name,
        'displayName', o.display_name,
        'orgNumber', o.org_number,
        'primaryAssetId', o.primary_asset_id,
        'isAdmin', ou.is_admin
      )
      order by o.display_name
    ) filter (where o.id is not null),
    '[]'::json
  ) as organisations
`;

const FROM_USERS = `
  from users u
  left join organisation_users ou on ou.user_id = u.id
  left join organisations o on o.id = ou.organisation_id
`;

const GROUP_BY_USERS = `
  group by u.id, u.nin, u.first_name, u.last_name, u.mail, u.mobile, u.is_admin
`;

export async function listAdminContacts(organisationId: string | null = null) {
  return query<{
    id: string;
    name: string;
    mail: string;
    mobile: string | null;
    hasOrganisationAdmin: boolean;
    organisations: { id: string; displayName: string; isAdmin: boolean }[];
  }>(
    `
      select u.id, u.first_name || ' ' || u.last_name as name, u.mail, u.mobile,
             coalesce(memberships.is_admin, false) as "hasOrganisationAdmin",
             coalesce(memberships.organisations, '[]'::json) as organisations
      from users u
      cross join lateral (
        select bool_or(membership.is_admin) as is_admin,
               json_agg(
                 json_build_object('id', o.id, 'displayName', o.display_name, 'isAdmin', membership.is_admin)
                 order by o.display_name, o.id
               ) as organisations
        from organisation_users membership
        join organisations o on o.id = membership.organisation_id
        where membership.user_id = u.id
      ) memberships
      where $1::uuid is null or exists (
        select 1
        from organisation_users membership
        where membership.user_id = u.id and membership.organisation_id = $1
      )
      order by u.last_name, u.first_name
    `,
    [organisationId],
  );
}

export async function listContactOptions(organisationId: string) {
  return query<{ id: string; name: string; mail: string }>(
    `
      select u.id, u.first_name || ' ' || u.last_name as name, u.mail
      from users u
      join organisation_users membership on membership.user_id = u.id
      where membership.organisation_id::text = $1
      order by u.last_name, u.first_name, u.mail
    `,
    [organisationId],
  );
}

export function listContactsOutsideOrganisation(organisationId: string) {
  return query<{ id: string; name: string; mail: string }>(
    `
      select u.id, u.first_name || ' ' || u.last_name as name, u.mail
      from users u
      where not exists (
        select 1 from organisation_users membership
        where membership.user_id = u.id and membership.organisation_id = $1
      )
      order by u.last_name, u.first_name, u.mail
    `,
    [organisationId],
  );
}

export async function listUsersByOrganisation(
  organisationId: string,
): Promise<UserRecord[]> {
  const rows = await query<UserRow>(
    `
      select ${USER_COLUMNS}
      ${FROM_USERS}
      where exists (
        select 1
        from organisation_users membership
        where membership.user_id = u.id
          and membership.organisation_id = $1
      )
      ${GROUP_BY_USERS}
      order by u.last_name, u.first_name
    `,
    [organisationId],
  );
  return rows.map(toUserRecord);
}

export async function getUserByNin(nin: string): Promise<UserRecord | null> {
  const rows = await query<UserRow>(
    `
      select ${USER_COLUMNS}
      ${FROM_USERS}
      where u.nin = $1
      ${GROUP_BY_USERS}
    `,
    [nin],
  );
  return rows[0] ? toUserRecord(rows[0]) : null;
}

export async function getUserByMail(mail: string): Promise<UserRecord | null> {
  const rows = await query<UserRow>(
    `
      select ${USER_COLUMNS}
      ${FROM_USERS}
      where u.mail = $1
      ${GROUP_BY_USERS}
    `,
    [mail],
  );
  return rows[0] ? toUserRecord(rows[0]) : null;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export type NewUserDetails = {
  nin: string;
  firstName: string;
  lastName: string;
  mail: string;
  mobile: string | null;
};

export async function insertUserWithMemberships(
  client: PoolClient,
  input: NewUserDetails,
  organisationIds: string[],
): Promise<string> {
  let userId: string;
  try {
    const inserted = await client.query<{ id: string }>(
      `
        insert into users (nin, first_name, last_name, mail, mobile)
        values ($1, $2, $3, $4, $5)
        returning id
      `,
      [input.nin, input.firstName, input.lastName, input.mail, input.mobile],
    );

    const row = inserted.rows[0];
    if (!row) {
      throw new Error("Kunne ikke opprette kontakten.");
    }
    userId = row.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        "Det finnes allerede en kontakt med dette fødselsnummeret eller denne e-postadressen.",
      );
    }
    throw error;
  }

  await client.query(
    `
      insert into organisation_users (organisation_id, user_id)
      select organisation_id, $2::uuid
      from unnest($1::uuid[]) as selected(organisation_id)
    `,
    [organisationIds, userId],
  );
  return userId;
}

export async function createUser(
  input: NewUserDetails & { organisationIds: string[] },
): Promise<UserRecord> {
  const organisationIds = [...new Set(input.organisationIds)];

  if (organisationIds.length === 0) {
    throw new Error("Velg minst én organisasjon.");
  }

  const client = await db().connect();
  try {
    await client.query("begin");
    await insertUserWithMemberships(client, input, organisationIds);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  const created = await getUserByNin(input.nin);
  if (!created) {
    throw new Error("Kontakten ble opprettet, men kunne ikke hentes.");
  }
  return created;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const rows = await query<UserRow>(
    `
            select ${USER_COLUMNS}
            ${FROM_USERS}
            where u.id::text = $1
            ${GROUP_BY_USERS}
        `,
    [id],
  );

  return rows[0] ? toUserRecord(rows[0]) : null;
}

export async function updateUserContactInfo(
  userId: string,
  input: Omit<NewUserDetails, "nin">,
): Promise<"updated" | "missing" | "duplicate-mail"> {
  try {
    const [updated] = await query<{ id: string }>(
      `
        update users
        set first_name = $2, last_name = $3, mail = $4, mobile = $5, updated_at = now()
        where id::text = $1
        returning id
      `,
      [userId, input.firstName, input.lastName, input.mail, input.mobile],
    );
    return updated ? "updated" : "missing";
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate-mail";
    throw error;
  }
}

const INSERT_ORGANISATION_MEMBERSHIPS = `
  insert into organisation_users (organisation_id, user_id)
  select organisation_id, $2::uuid
  from unnest($1::uuid[]) as selected(organisation_id)
  on conflict (organisation_id, user_id) do nothing
`;

export async function addUserOrganisations(userId: string, organisationIds: string[]) {
  await query(INSERT_ORGANISATION_MEMBERSHIPS, [organisationIds, userId]);
}

export async function removeUserOrganisation(userId: string, organisationId: string): Promise<boolean> {
  const rows = await query<{ user_id: string }>(
    `
      delete from organisation_users
      where organisation_id = $1 and user_id::text = $2
      returning user_id
    `,
    [organisationId, userId],
  );
  return rows.length === 1;
}

export async function updateUserOrganisations(
  userId: string,
  selectedOrganisationIds: string[],
): Promise<void> {
  const organisationIds = [...new Set(selectedOrganisationIds)];

  if (organisationIds.length === 0) {
    throw new Error("Velg minst én organisasjon.");
  }

  const client = await db().connect();

  try {
    await client.query("begin");

    // Updating the user row also serializes concurrent membership edits.
    const updated = await client.query(
      `
                update users
                set updated_at = now()
                where id = $1
                returning id
            `,
      [userId],
    );

    if (updated.rowCount !== 1) {
      throw new Error("Kontakten finnes ikke.");
    }

    await client.query(
      `
        delete from organisation_users
        where user_id = $1 and not (organisation_id = any($2::uuid[]))
      `,
      [userId, organisationIds],
    );

    await client.query(INSERT_ORGANISATION_MEMBERSHIPS, [organisationIds, userId]);

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function setUserAdminStatus(
    userId: string,
    isAdmin: boolean,
): Promise<void> {
    const rows = await query<{ id: string }>(
        `
            update users
            set is_admin = $2,
                updated_at = now()
            where id = $1
            returning id
        `,
        [userId, isAdmin],
    );

    if (!rows[0]) {
        throw new Error("Kontakten finnes ikke.");
    }
}
