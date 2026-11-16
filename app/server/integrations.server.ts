import { db, query } from "~/server/db.server";
import {
  isIntegrationType,
  type Integration,
} from "~/types/integrations";

type IntegrationRow = {
  id: string;
  name: string;
  type: string;
  client_id: string | null;
  components: string[];
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
    clientId: row.client_id ?? undefined,
  };
}

export async function listIntegrationsForOrganisation(
  organisationId: string,
): Promise<Integration[]> {
  const rows = await query<IntegrationRow>(
    `
      select
        i.id,
        i.name,
        i.type,
        i.client_id,
        coalesce(
          array_agg(c.name order by c.category, c.name)
            filter (where c.name is not null),
          '{}'
        ) as components
      from integrations i
      left join integration_components ic on ic.integration_id = i.id
      left join components c on c.id = ic.component_id
      where i.organisation_id = $1
      group by i.id
      order by i.created_at desc
    `,
    [organisationId],
  );
  return rows.map(toIntegration);
}

export async function createIntegration(
  input: Omit<Integration, "id"> & { organisationId: string },
): Promise<Integration> {
  const client = await db().connect();

  try {
    await client.query("begin");

    const inserted = await client.query<
      Omit<IntegrationRow, "components">
    >(
      `
        insert into integrations (name, type, client_id, organisation_id)
        values ($1, $2, $3, $4)
        returning id, name, type, client_id
      `,
      [input.name, input.type, input.clientId ?? null, input.organisationId],
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
