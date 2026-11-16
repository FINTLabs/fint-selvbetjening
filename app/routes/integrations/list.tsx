import { PlusIcon } from "@navikt/aksel-icons";
import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { Link } from "react-router";

import { listComponents } from "~/server/components.server";
import { listIntegrationsForOrganisation } from "~/server/integrations.server";
import { requireUser } from "~/server/auth.server";
import {
  componentLabels,
  type Integration,
} from "~/types/integrations";
import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Integrasjoner - FINT Selvbetjening" },
    { name: "description", content: "Liste over integrasjoner" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  if (!user.organisation) {
    return {
      integrations: [],
      components: [],
      hasOrganisation: false,
    };
  }

  return {
    integrations: await listIntegrationsForOrganisation(user.organisation.id),
    components: await listComponents(),
    hasOrganisation: true,
  };
}

function typeLabel(type: Integration["type"]) {
  return type === "klient" ? "Klient" : "Adapter";
}

export default function IntegrationsList({ loaderData }: Route.ComponentProps) {
  const { integrations, components, hasOrganisation } = loaderData;

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <HStack justify="space-between" align="center" wrap>
        <Heading size="large">Integrasjoner</Heading>
        {hasOrganisation ? (
          <Button
            as={Link}
            to="/integrasjoner/ny"
            icon={<PlusIcon aria-hidden />}
            size="small"
          >
            Legg til
          </Button>
        ) : null}
      </HStack>

      {!hasOrganisation ? (
        <LocalAlert status="announcement">
          <LocalAlert.Header>
            <LocalAlert.Title>Ingen organisasjon</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>Du er ikke tilknyttet en organisasjon.</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : integrations.length === 0 ? (
        <LocalAlert status="announcement">
          <LocalAlert.Header>
            <LocalAlert.Title>Ingen integrasjoner</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>Opprett en ny integrasjon for å komme i gang.</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Type</Table.HeaderCell>
              <Table.HeaderCell scope="col">Komponenter</Table.HeaderCell>
              <Table.HeaderCell scope="col">Client ID</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {integrations.map((integration) => (
              <Table.Row key={integration.id}>
                <Table.HeaderCell scope="row">{integration.name}</Table.HeaderCell>
                <Table.DataCell>
                  <Tag
                    size="small"
                    variant="moderate"
                    data-color={integration.type === "klient" ? "info" : "neutral"}
                  >
                    {typeLabel(integration.type)}
                  </Tag>
                </Table.DataCell>
                <Table.DataCell>
                  {componentLabels(integration.components, components)}
                </Table.DataCell>
                <Table.DataCell>{integration.clientId ?? "—"}</Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </VStack>
  );
}
