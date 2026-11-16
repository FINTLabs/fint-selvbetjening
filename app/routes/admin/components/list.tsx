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

import { requireAdmin } from "~/server/auth.server";
import { listComponents } from "~/server/components.server";
import { categoryLabel } from "~/types/integrations";
import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Komponenter - FINT Selvbetjening" },
    { name: "description", content: "Liste over komponenter" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { components: await listComponents() };
}

export default function AdminComponents({ loaderData }: Route.ComponentProps) {
  const { components } = loaderData;

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <HStack justify="space-between" align="center" wrap>
        <Heading size="large">Komponenter</Heading>
        <Button
          as={Link}
          to="/admin/komponenter/ny"
          icon={<PlusIcon aria-hidden />}
          size="small"
        >
          Legg til
        </Button>
      </HStack>

      {components.length === 0 ? (
        <LocalAlert status="announcement">
          <LocalAlert.Header>
            <LocalAlert.Title>Ingen komponenter</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>Opprett en ny komponent for å komme i gang.</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Beskrivelse</Table.HeaderCell>
              <Table.HeaderCell scope="col">Kategori</Table.HeaderCell>
              <Table.HeaderCell scope="col">Sti</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {components.map((component) => (
              <Table.Row key={component.id}>
                <Table.HeaderCell scope="row">{component.name}</Table.HeaderCell>
                <Table.DataCell>{component.description}</Table.DataCell>
                <Table.DataCell>
                  {categoryLabel(component.category)}
                </Table.DataCell>
                <Table.DataCell>{component.basePath}</Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </VStack>
  );
}
