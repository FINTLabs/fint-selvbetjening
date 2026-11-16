import { db, query } from "~/server/db.server";
import type { OrganisationRecord } from "~/server/organisations.server";

export type UserRecord = {
  id: string;
  nin: string;
  firstName: string;
  lastName: string;
  mail: string;
  mobile: string | null;
  isAdmin: boolean;
  organisations: OrganisationRecord[];
};

type UserRow = {
  id: string;
  nin: string;
  first_name: string;
  last_name: string;
  mail: string;
  mobile: string | null;
  is_admin: boolean;
  organisations: OrganisationRecord[] | null;
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
        'orgNumber', o.org_number
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

export async function listUsers(): Promise<UserRecord[]> {
  const rows = await query<UserRow>(
    `
      select ${USER_COLUMNS}
      ${FROM_USERS}
      ${GROUP_BY_USERS}
      order by u.last_name, u.first_name
    `,
  );
  return rows.map(toUserRecord);
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

export async function createUser(input: {
  nin: string;
  firstName: string;
  lastName: string;
  mail: string;
  mobile: string | null;
  organisationId: string;
}): Promise<UserRecord> {
  const client = await db().connect();

  try {
    await client.query("begin");

    const inserted = await client.query<{ id: string }>(
      `
        insert into users (nin, first_name, last_name, mail, mobile)
        values ($1, $2, $3, $4, $5)
        returning id
      `,
      [
        input.nin,
        input.firstName,
        input.lastName,
        input.mail,
        input.mobile,
      ],
    );

    const row = inserted.rows[0];
    if (!row) {
      throw new Error("Kunne ikke opprette kontakten.");
    }

    await client.query(
      `
        insert into organisation_users (organisation_id, user_id)
        values ($1, $2)
      `,
      [input.organisationId, row.id],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    if (isUniqueViolation(error)) {
      throw new Error(
        "Det finnes allerede en kontakt med dette fødselsnummeret eller denne e-postadressen.",
      );
    }
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
