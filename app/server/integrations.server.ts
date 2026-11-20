import { db, query } from "~/server/db.server";
import { isIntegrationType, type Integration } from "~/types/integrations";
import type {User} from "~/server/auth.server";

type IntegrationRow = {
  id: string;
  name: string;
  type: string;
  client_id: string | null;
  components: string[];
  description: string;
};

const INTEGRATION_COLUMNS = `
  i.id, i.name, i.description, i.type, i.client_id,
  coalesce(
    array_agg(c.name order by c.category, c.name)
      filter (where c.name is not null),
    '{}'
  ) as components
`;

const FROM_INTEGRATIONS = `
  from integrations i
  left join integration_components ic on ic.integration_id = i.id
  left join components c on c.id = ic.component_id
`;

type IntegrationDetailsRow = IntegrationRow & {
  created_at: Date;
  updated_at: Date;
};

function toIntegration(row: IntegrationRow): Integration {
  if (!isIntegrationType(row.type)) {
    throw new Error(`Unknown integration type: ${row.type}`);
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    components: row.components ?? [],
    description: row.description,
    clientId: row.client_id ?? undefined,
  };
}

function toIntegrationDetails(row: IntegrationDetailsRow) {
  return {
    ...toIntegration(row),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listIntegrationsForOrganisation(
  organisationId: string,
): Promise<Integration[]> {
  const rows = await query<IntegrationRow>(
    `
      select ${INTEGRATION_COLUMNS}
      ${FROM_INTEGRATIONS}
      where i.organisation_id = $1
      group by i.id
      order by i.created_at desc
    `,
    [organisationId],
  );
  return rows.map(toIntegration);
}

async function queryAdminIntegrations(integrationId: string | null) {
  const rows = await query<IntegrationDetailsRow & {
    organisation_id: string;
    organisation_name: string;
  }>(
    `
      select ${INTEGRATION_COLUMNS}, i.created_at, i.updated_at,
             o.id as organisation_id, o.display_name as organisation_name
      ${FROM_INTEGRATIONS}
      join organisations o on o.id = i.organisation_id
      where $1::uuid is null or i.id = $1
      group by i.id, o.id
      order by i.created_at desc, i.id
    `,
    [integrationId],
  );

  return rows.map((row) => ({
    ...toIntegrationDetails(row),
    organisationId: row.organisation_id,
    organisationName: row.organisation_name,
  }));
}

export function listAdminIntegrations() {
  return queryAdminIntegrations(null);
}

export function listIntegrationsUsingComponent(componentId: string) {
  return query<{ id: string; name: string; type: Integration["type"]; organisationName: string }>(
    `
      select i.id, i.name, i.type, o.display_name as "organisationName"
      from integration_components ic
      join integrations i on i.id = ic.integration_id
      join organisations o on o.id = i.organisation_id
      where ic.component_id = $1
      order by i.name, o.display_name, i.id
    `,
    [componentId],
  );
}

export async function getAdminIntegrationDetails(integrationId: string) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(integrationId)) {
    return null;
  }

  const [integration] = await queryAdminIntegrations(integrationId);
  return integration ?? null;
}

export async function createIntegration(
  input: Omit<Integration, "id"> & { organisationId: string },
): Promise<Integration> {
  const client = await db().connect();

  try {
    await client.query("begin");

    const inserted = await client.query<Omit<IntegrationRow, "components">>(
      `
        insert into integrations (name, type, client_id, organisation_id, description)
        values ($1, $2, $3, $4, $5)
        returning id, name, type, client_id, description
      `,
      [
        input.name,
        input.type,
        input.clientId ?? null,
        input.organisationId,
        input.description,
      ],
    );
    const row = inserted.rows[0];
    if (!row) {
      throw new Error("Kunne ikke opprette integrasjonen.");
    }

    if (input.components.length > 0) {
      await client.query(
        `
          insert into integration_components (integration_id, component_id)
          select $1, id
          from components
          where name = any($2::text[])
        `,
        [row.id, input.components],
      );
    }

    await client.query("commit");
    return toIntegration({ ...row, components: input.components });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

type PurposeIntegration = {
  id: string;
  name: string;
  description: string;
};

type PurposeHistoryRow = {
  id: string;
  old_purpose: string;
  new_purpose: string;
  changed_at: Date;
  changed_by_user_id: string;
  changed_by_name: string;
};

function requirePurposeOrganisation(user: User): string {
  if (!user.organisation) {
    throw new Response("Du har ikke tilgang.", { status: 403 });
  }

  return user.organisation.id;
}

export async function getIntegrationPurpose(
  integrationId: string,
  user: User,
): Promise<PurposeIntegration> {
  const organisationId = requirePurposeOrganisation(user);

  const rows = await query<PurposeIntegration>(
    `
      select id, name, description
      from integrations
      where id = $1 and organisation_id = $2
    `,
    [integrationId, organisationId],
  );

  if (!rows[0]) {
    throw new Response("Integrasjonen finnes ikke.", { status: 404 });
  }

  return rows[0];
}

export async function listIntegrationPurposeHistory(
  integrationId: string,
  user: User,
) {
  const organisationId = requirePurposeOrganisation(user);

  const rows = await query<PurposeHistoryRow>(
    `
      select
        h.id,
        h.old_purpose,
        h.new_purpose,
        h.changed_at,
        h.changed_by_user_id,
        h.changed_by_name
      from integration_purpose_history h
      join integrations i on i.id = h.integration_id
      where i.id = $1 and i.organisation_id = $2
      order by h.id desc
    `,
    [integrationId, organisationId],
  );

  return rows.map((row) => ({
    id: row.id,
    oldPurpose: row.old_purpose,
    newPurpose: row.new_purpose,
    changedAt: row.changed_at.toISOString(),
    changedByUserId: row.changed_by_user_id,
    changedByName: row.changed_by_name,
  }));
}

export async function updateIntegrationPurpose(
  integrationId: string,
  purpose: string,
  user: User,
): Promise<void> {
  const organisationId = requirePurposeOrganisation(user);
  const newPurpose = purpose.trim();

  if (!newPurpose) {
    throw new Response("Skriv inn et formål.", { status: 400 });
  }

  const client = await db().connect();

  try {
    await client.query("begin");

    const result = await client.query<{ description: string }>(
      `
        select description
        from integrations
        where id = $1 and organisation_id = $2
        for update
      `,
      [integrationId, organisationId],
    );

    const current = result.rows[0];

    if (!current) {
      throw new Response("Integrasjonen finnes ikke.", { status: 404 });
    }

    if (current.description !== newPurpose) {
      await client.query(
        `
          update integrations
          set description = $1, updated_at = clock_timestamp()
          where id = $2 and organisation_id = $3
        `,
        [newPurpose, integrationId, organisationId],
      );

      await client.query(
        `
          insert into integration_purpose_history (
            integration_id,
            old_purpose,
            new_purpose,
            changed_by_user_id,
            changed_by_name
          )
          values ($1, $2, $3, $4, $5)
        `,
        [integrationId, current.description, newPurpose, user.id, user.name],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getIntegrationDetails(
    integrationId: string,
    user: User,
) {
  const organisationId = requirePurposeOrganisation(user);

  const rows = await query<IntegrationDetailsRow>(
    `
      select ${INTEGRATION_COLUMNS}, i.created_at, i.updated_at
      ${FROM_INTEGRATIONS}
      where i.id = $1 and i.organisation_id = $2
      group by i.id
    `,
    [integrationId, organisationId],
  );

  const row = rows[0];

  if (!row) {
    throw new Response("Integrasjonen finnes ikke.", { status: 404 });
  }

  return {
    ...toIntegrationDetails(row),
    organisationId,
  };
}
