import { ArrowLeftIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Heading, HGrid, Label, Link as AkselLink, Table, VStack } from "@navikt/ds-react";
import { data, Link, useNavigate } from "react-router";

import { IntegrationTypeTag } from "~/routes/admin/integrations/IntegrationTypeTag";
import { requireAdmin } from "~/server/auth.server";
import { getComponentById } from "~/server/components.server";
import { listIntegrationsUsingComponent } from "~/server/integrations.server";
import { categoryLabel } from "~/types/integrations";

import type { Route } from "./+types/detail";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.component.name ?? "Komponent"} - FINT Selvbetjening` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);

  const component = await getComponentById(params.componentId);
  if (!component) {
    throw data("Komponenten finnes ikke.", { status: 404 });
  }

  const integrations = await listIntegrationsUsingComponent(component.id);
  return { component, integrations };
}

export default function AdminComponentDetail({ loaderData }: Route.ComponentProps) {
  const { component, integrations } = loaderData;
  const navigate = useNavigate();

  return (
    <VStack gap="space-24" paddingBlock="space-24" className="wrap-anywhere">
      <AkselLink as={Link} to="/admin/komponenter" className="self-start">
        <ArrowLeftIcon aria-hidden /> Tilbake til komponenter
      </AkselLink>
      <Heading size="large">{component.description}</Heading>

      <Box
        as="section"
        aria-labelledby="component-details"
        borderRadius="12"
        borderWidth="1"
        borderColor="neutral-subtle"
        padding="space-24"
      >
        <VStack gap="space-16">
          <Heading id="component-details" level="2" size="medium">Komponentdetaljer</Heading>
          <HGrid as="dl" columns={{ xs: 1, sm: 2 }} gap="space-16" className="m-0">
              <div>
                  <Label as="dt">Kategori</Label>
                  <BodyShort as="dd" className="m-0">{categoryLabel(component.category)}</BodyShort>
              </div>
              <div>
              <Label as="dt">Navn</Label>
              <BodyShort as="dd" className="m-0">{component.name}</BodyShort>
            </div>

            <div>
              <Label as="dt">Sti</Label>
              <BodyShort as="dd" className="m-0">{component.basePath}</BodyShort>
            </div>
          </HGrid>
        </VStack>
      </Box>

      <Box
        as="section"
        aria-labelledby="component-integrations"
        borderRadius="12"
        borderWidth="1"
        borderColor="neutral-subtle"
        padding="space-24"
      >
        <VStack gap="space-16">
          <Heading id="component-integrations" level="2" size="medium">
            Integrasjoner som bruker komponenten
          </Heading>
          {integrations.length > 0 ? (
            <Table size="small" zebraStripes>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Type</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Organisasjon</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {integrations.map((integration) => {
                  const detailPath = `/admin/integrasjoner/${integration.id}`;

                  return (
                    <Table.Row
                      key={integration.id}
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
                      <Table.HeaderCell scope="row">{integration.name}</Table.HeaderCell>
                      <Table.DataCell><IntegrationTypeTag type={integration.type} /></Table.DataCell>
                      <Table.DataCell>{integration.organisationName}</Table.DataCell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          ) : (
            <BodyShort>Ingen integrasjoner bruker denne komponenten.</BodyShort>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
