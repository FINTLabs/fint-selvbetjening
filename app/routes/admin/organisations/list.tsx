import { PlusIcon } from "@navikt/aksel-icons";
import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
  Table,
  VStack,
} from "@navikt/ds-react";
import { Link } from "react-router";

import { listOrganisations } from "~/server/organisations.server";
import { requireAdmin } from "~/server/auth.server";
import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Organisasjoner - FINT Selvbetjening" },
    { name: "description", content: "Liste over organisasjoner" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { organisations: await listOrganisations() };
}

export default function AdminOrganisations({
  loaderData,
}: Route.ComponentProps) {
  const { organisations } = loaderData;

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <HStack justify="space-between" align="center" wrap>
        <Heading size="large">Organisasjoner</Heading>
        <Button
          as={Link}
          to="/admin/organisasjoner/ny"
          icon={<PlusIcon aria-hidden />}
          size="small"
        >
          Legg til
        </Button>
      </HStack>

      {organisations.length === 0 ? (
        <LocalAlert status="announcement">
          <LocalAlert.Header>
            <LocalAlert.Title>Ingen organisasjoner</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>Opprett en ny organisasjon for å komme i gang.</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Visningsnavn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Kortnavn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Org.nr</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {organisations.map((organisation) => (
              <Table.Row key={organisation.id}>
                <Table.HeaderCell scope="row">
                  {organisation.displayName}
                </Table.HeaderCell>
                <Table.DataCell>{organisation.name}</Table.DataCell>
                <Table.DataCell>{organisation.orgNumber}</Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </VStack>
  );
}
