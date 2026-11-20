import { ArrowLeftIcon, ClockIcon } from "@navikt/aksel-icons";
import { BodyLong, BodyShort, Box, Button, Heading, HGrid, HStack, Label, Link as AkselLink, List, VStack } from "@navikt/ds-react";
import { data, Link } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import { listComponents } from "~/server/components.server";
import { getAdminIntegrationDetails } from "~/server/integrations.server";
import { cardsFromSortedList, categoryLabel } from "~/types/integrations";

import type { Route } from "./+types/detail";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.integration.name ?? "Integrasjon"} – Admin – FINT Selvbetjening` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);

  const integration = await getAdminIntegrationDetails(params.integrationId);
  if (!integration) {
    throw data("Integrasjonen finnes ikke.", { status: 404 });
  }

  return { integration, components: await listComponents() };
}

const dateFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Oslo",
});

export default function AdminIntegrationDetail({ loaderData }: Route.ComponentProps) {
  const { integration, components } = loaderData;
  const linkedNames = new Set(integration.components);
  const componentGroups = cardsFromSortedList(components.filter((component) => linkedNames.has(component.name)));

  //TODO: make better breadcrumbs
  return (
    <VStack gap="space-24" paddingBlock="space-24" className="wrap-anywhere">
      <AkselLink as={Link} to="/admin/integrasjoner" className="self-start">
        <ArrowLeftIcon aria-hidden /> Tilbake til integrasjoner
      </AkselLink>
      <Heading size="large">{integration.name}</Heading>

      <Box as="section" aria-labelledby="integration-details" borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
        <VStack gap="space-16">
          <Heading id="integration-details" level="2" size="medium">Integrasjonsdetaljer</Heading>
          <HGrid as="dl" columns={{ xs: 1, sm: 2 }} gap="space-16" className="m-0">
            <div>
              <Label as="dt">Organisasjon</Label>
              <BodyShort as="dd" className="m-0">
                <Button variant={"tertiary"} size="xsmall" as={Link} to={`/admin/organisasjoner/${integration.organisationId}`}>{integration.organisationName}</Button>
              </BodyShort>
            </div>
            <div>
              <Label as="dt">Type</Label>
              <BodyShort as="dd" className="m-0">
                {integration.type === "klient" ? "Klient" : "Adapter"}
              </BodyShort>
            </div>
            <div>
              <Label as="dt">Integrasjons-ID</Label>
              <BodyShort as="dd" className="m-0">{integration.id}</BodyShort>
            </div>
            <div>
              <Label as="dt">Client ID</Label>
              <BodyShort as="dd" className="m-0">{integration.clientId ?? "Ikke angitt"}</BodyShort>
            </div>
            <div>
              <Label as="dt">Opprettet</Label>
              <BodyShort as="dd" className="m-0">
                <time dateTime={integration.createdAt}>
                  {dateFormatter.format(new Date(integration.createdAt))}
                </time>
              </BodyShort>
            </div>
            <div>
              <Label as="dt">Sist oppdatert</Label>
              <BodyShort as="dd" className="m-0">
                <time dateTime={integration.updatedAt}>
                  {dateFormatter.format(new Date(integration.updatedAt))}
                </time>
              </BodyShort>
            </div>
          </HGrid>
        </VStack>
      </Box>

      <Box as="section" aria-labelledby="integration-purpose" borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
        <VStack gap="space-8">
          <HStack justify="space-between" align="center" gap="space-12" wrap>
            <Heading id="integration-purpose" level="2" size="medium">Formål</Heading>
            <Button type="button" variant="secondary" size="small" icon={<ClockIcon aria-hidden />} disabled>
              Vis historikk
            </Button>
          </HStack>
          <BodyLong className="whitespace-pre-wrap">{integration.description || "Ikke angitt"}</BodyLong>
        </VStack>
      </Box>
      
      <Box as="section" aria-labelledby="integration-components" borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
        <VStack gap="space-16">
          <Heading id="integration-components" level="2" size="medium">Komponenter</Heading>
          {componentGroups.length > 0 ? (
            <HGrid columns={{ xs: 1, sm: 2, lg: 3 }} gap="space-16">
              {componentGroups.map(({ category, components }) => (
                <Box key={category} background="neutral-soft" borderRadius="8" padding="space-16">
                  <VStack gap="space-8">
                    <Heading level="3" size="small">{categoryLabel(category)}</Heading>
                    <List as="ul" size="small">
                      {components.map((component) => (
                        <List.Item key={component.id}>{component.name}</List.Item>
                      ))}
                    </List>
                  </VStack>
                </Box>
              ))}
            </HGrid>
          ) : (
            <BodyShort>Ingen komponenter</BodyShort>
          )}
        </VStack>
      </Box>


    </VStack>
  );
}
