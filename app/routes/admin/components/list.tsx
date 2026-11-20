import { PlusIcon, PuzzlePieceIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Box,
  Button,
  Heading,
  HGrid,
  HStack,
  Search,
  Select,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const query = search.trim().toLowerCase();
  const categories = [...new Set(components.map((component) => component.category))];
  const filteredComponents = components.filter((component) =>
    (!category || component.category === category) &&
    [component.name, component.description, categoryLabel(component.category), component.basePath]
      .some((value) => value.toLowerCase().includes(query)),
  );

  return (
    <VStack gap="space-24" paddingBlock="space-24">
      <HStack justify="space-between" align="center" gap="space-12" wrap>
        <HStack align="center" gap="space-8" wrap={false}>
          <PuzzlePieceIcon aria-hidden fontSize="2.25rem" />
          <Heading size="large">Komponenter</Heading>
        </HStack>
        <Button as={Link} to="/admin/komponenter/ny" icon={<PlusIcon aria-hidden />} size="small">
          Legg til
        </Button>
      </HStack>

      <Box
        as="section"
        aria-labelledby="component-filters"
        background="neutral-soft"
        borderRadius="12"
        borderWidth="1"
        borderColor="neutral-subtle"
        padding={{ xs: "space-16", sm: "space-24" }}
      >
        <VStack gap="space-16">
          <Heading id="component-filters" level="2" size="small">Filtrer komponenter</Heading>
          <HGrid columns={{ xs: 1, sm: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="space-20">
            <Search
              label="Søk etter komponenter"
              hideLabel={false}
              variant="simple"
              size="small"
              value={search}
              onChange={setSearch}
            />
            <Select
              label="Komponentkategori"
              size="small"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Alle kategorier</option>
              {categories.map((value) => (
                <option key={value} value={value}>{categoryLabel(value)}</option>
              ))}
            </Select>
          </HGrid>
        </VStack>
      </Box>

      <VStack gap="space-8">
        <BodyShort size="small" textColor="subtle" role="status">
          {filteredComponents.length > 0
            ? `Viser ${filteredComponents.length} av ${components.length} komponenter`
            : query || category ? "Ingen komponenter matcher filtrene." : "Ingen komponenter"}
        </BodyShort>
        <Box borderRadius="12" borderWidth="1" borderColor="neutral-subtle" className="overflow-x-auto">
          <Table zebraStripes className="min-w-[34rem] [overflow-wrap:anywhere]">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
                <Table.HeaderCell scope="col">Beskrivelse</Table.HeaderCell>
                <Table.HeaderCell scope="col">Kategori</Table.HeaderCell>
                <Table.HeaderCell scope="col">Sti</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredComponents.map((component) => {
                const detailPath = `/admin/komponenter/${component.id}`;

                return (
                  <Table.Row
                    key={component.id}
                    tabIndex={0}
                    onRowClick={() => navigate(detailPath)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        void navigate(detailPath);
                      }
                    }}
                  >
                    <Table.HeaderCell scope="row">{component.name}</Table.HeaderCell>
                    <Table.DataCell>{component.description}</Table.DataCell>
                    <Table.DataCell>
                      <Tag size="xsmall" variant="outline">
                        {categoryLabel(component.category)}
                      </Tag>
                    </Table.DataCell>
                    <Table.DataCell>{component.basePath}</Table.DataCell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </Box>
      </VStack>
    </VStack>
  );
}
