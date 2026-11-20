import {
  BodyShort,
  Box,
  Heading,
  HGrid,
  HStack,
  Radio,
  RadioGroup,
  Search,
  Select,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { categoryLabel, type ComponentRecord, type Integration, type IntegrationType } from "~/types/integrations";

import { IntegrationTypeTag } from "./IntegrationTypeTag";

type IntegrationListProps = {
  components: ComponentRecord[];
  integrations: (Integration & { organisationId?: string; organisationName?: string })[];
  organisations?: { id: string; displayName: string }[];
};

export function IntegrationList({ components, integrations, organisations }: IntegrationListProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [organisationId, setOrganisationId] = useState("");
  const [type, setType] = useState<IntegrationType | "all">("all");
  const query = search.trim().toLowerCase();
  const componentsByName = new Map(components.map((component) => [component.name, component]));
  const categories = [...new Set(components.map((component) => component.category))];
  const filteredIntegrations = integrations
    .filter((integration) =>
      (!organisationId || integration.organisationId === organisationId) &&
      (type === "all" || integration.type === type) &&
      [integration.name, integration.organisationName, integration.clientId]
        .some((field) => field?.toLowerCase().includes(query)),
    )
    .flatMap((integration) => {
      const linkedComponents = integration.components
        .map((name) => componentsByName.get(name))
        .filter((component) => component !== undefined);
      const labels = category
        ? linkedComponents.filter((component) => component.category === category).map((component) => component.name)
        : [...new Set(linkedComponents.map((component) => component.category))].map(categoryLabel);

      return category && labels.length === 0
        ? []
        : [{ integration, componentNames: labels }];
    });

  return (
    <VStack gap="space-24">
      <Box
        as="section"
        aria-labelledby="integration-filters"
        background="neutral-soft"
        borderRadius="12"
        borderWidth="1"
        borderColor="neutral-subtle"
        padding={{ xs: "space-16", sm: "space-24" }}
      >
        <VStack gap="space-16">
          <Heading id="integration-filters" level={organisations ? "2" : "3"} size="small">
            Filtrer integrasjoner
          </Heading>
          {organisations && (
            <Search
              label="Søk etter integrasjoner"
              placeholder="Søk etter integrasjoner"
              variant="simple"
              value={search}
              onChange={setSearch}
            />
          )}
          <HGrid
            columns={{
              xs: 1,
              sm: 2,
              lg: organisations ? "minmax(0, 1fr) minmax(0, 1fr) minmax(17rem, 1fr)" : 2,
            }}
            gap="space-20"
          >
            <Select label="Komponentkategori" size="small" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Alle kategorier</option>
              {categories.map((value) => (
                <option key={value} value={value}>{categoryLabel(value)}</option>
              ))}
            </Select>
            {organisations && (
              <Select label="Filtrer på organisasjon" size="small" value={organisationId} onChange={(event) => setOrganisationId(event.target.value)}>
                <option value="">Alle organisasjoner</option>
                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>{organisation.displayName}</option>
                ))}
              </Select>
            )}
            <RadioGroup
              legend="Type"
              name="integration-type-filter"
              size="small"
              value={type}
              onChange={setType}
              className={organisations ? "sm:col-span-2 lg:col-span-1" : undefined}
            >
              <HStack gap="space-12" wrap>
                <Radio value="all">Alle typer</Radio>
                <Radio value="klient">Klient</Radio>
                <Radio value="adapter">Adapter</Radio>
              </HStack>
            </RadioGroup>
          </HGrid>
        </VStack>
      </Box>

      <VStack gap="space-8">
        <BodyShort size="small" textColor="subtle" role="status">
          {filteredIntegrations.length === 0
            ? (query || category || organisationId || type !== "all"
              ? "Ingen integrasjoner matcher filtrene."
              : "Ingen integrasjoner")
            : `Viser ${filteredIntegrations.length} av ${integrations.length} integrasjoner`}
        </BodyShort>
        <Box borderRadius="12" borderWidth="1" borderColor="neutral-subtle" className="overflow-x-auto">
          <Table zebraStripes className="[overflow-wrap:anywhere] max-sm:text-sm!">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
                {organisations && <Table.HeaderCell scope="col">Organisasjon</Table.HeaderCell>}
                <Table.HeaderCell scope="col">Type</Table.HeaderCell>
                <Table.HeaderCell scope="col">Komponenter</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredIntegrations.map(({ integration, componentNames }) => {
                const detailPath = `/admin/integrasjoner/${integration.id}`;
                return (
                  <Table.Row
                    key={integration.id}
                    tabIndex={0}
                    onRowClick={() => navigate(detailPath)}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        void navigate(detailPath);
                      }
                    }}
                  >
                    <Table.HeaderCell scope="row">{integration.name}</Table.HeaderCell>
                    {organisations && <Table.DataCell>{integration.organisationName}</Table.DataCell>}
                    <Table.DataCell>
                      <IntegrationTypeTag type={integration.type} />
                    </Table.DataCell>
                    <Table.DataCell>
                      {componentNames.length > 0 ? (
                        <HStack gap="space-4" wrap>
                          {componentNames.map((name) => (
                            <Tag key={name} variant="outline" size="xsmall" className="max-sm:text-xs!">{name}</Tag>
                          ))}
                        </HStack>
                      ) : "—"}
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
