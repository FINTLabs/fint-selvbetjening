import {
  ArchiveIcon,
  Buildings3Icon,
  ExclamationmarkTriangleFillIcon,
  MenuElipsisVerticalIcon,
  PersonGavelIcon,
  PersonMinusIcon,
  PersonPlusIcon,
  PlusIcon,
} from "@navikt/aksel-icons";
import {
  ActionMenu,
  BodyShort,
  Box,
  Button,
  Heading,
  HStack,
  Search,
  Table,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import { listOrganisationsWithLegalContacts } from "~/server/organisations.server";

import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Organisasjoner - FINT Selvbetjening" },
    { name: "description", content: "Liste over organisasjoner" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { organisations: await listOrganisationsWithLegalContacts() };
}

export default function AdminOrganisations({
  loaderData,
}: Route.ComponentProps) {
  const { organisations } = loaderData;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredOrganisations = organisations
    .filter((organisation) =>
      [organisation.name, organisation.displayName, organisation.orgNumber, organisation.primaryAssetId]
        .some((field) => field?.toLowerCase().includes(query)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));

  return (
    <VStack gap="space-24" paddingBlock="space-24">
      <HStack justify="space-between" align="center" gap="space-12" wrap>
        <HStack align="center" gap="space-8" wrap={false}>
          <Buildings3Icon aria-hidden fontSize="2.25rem" />
          <Heading size="large">Organisasjoner</Heading>
        </HStack>
        <Button
          as={Link}
          to="/admin/organisasjoner/ny"
          icon={<PlusIcon aria-hidden />}
          size="small"
        >
          Legg til
        </Button>
      </HStack>

      <Box
        as="section"
        aria-labelledby="organisation-filters"
        background="neutral-soft"
        borderRadius="12"
        borderWidth="1"
        borderColor="neutral-subtle"
        padding={{ xs: "space-16", sm: "space-24" }}
      >
        <VStack gap="space-16">
          <Heading id="organisation-filters" level="2" size="small">Filtrer organisasjoner</Heading>
          <Search
            label="Søk etter organisasjoner"
            hideLabel={false}
            size="small"
            variant="simple"
            value={search}
            onChange={setSearch}
          />
        </VStack>
      </Box>

      <VStack gap="space-8">
        <BodyShort size="small" textColor="subtle" role="status">
          {filteredOrganisations.length > 0
            ? `Viser ${filteredOrganisations.length} av ${organisations.length} organisasjoner`
            : query ? "Ingen organisasjoner matcher søket." : "Ingen organisasjoner"}
        </BodyShort>
        <Box borderRadius="12" borderWidth="1" borderColor="neutral-subtle" className="overflow-x-auto">
          <Table zebraStripes className="min-w-136 wrap-anywhere">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
                <Table.HeaderCell scope="col">Visningsnavn</Table.HeaderCell>
                <Table.HeaderCell scope="col">Primær Asset ID</Table.HeaderCell>
                <Table.HeaderCell scope="col">Juridisk kontakt</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredOrganisations.map((organisation) => {
                const detailPath = `/admin/organisasjoner/${organisation.id}`;

                return (
                  <Table.Row
                    key={organisation.id}
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
                    <Table.HeaderCell scope="row">
                      {organisation.name}
                    </Table.HeaderCell>
                    <Table.DataCell>{organisation.displayName}</Table.DataCell>
                    <Table.DataCell>{organisation.primaryAssetId}</Table.DataCell>
                    <Table.DataCell>
                      {organisation.legalContactName ?? (
                        <ExclamationmarkTriangleFillIcon
                          title="Mangler juridisk kontakt"
                          fontSize="1.25rem"
                          style={{ color: "var(--ax-text-warning-decoration)" }}
                        />
                      )}
                    </Table.DataCell>
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