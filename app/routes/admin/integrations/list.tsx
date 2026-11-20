import { LinkIcon } from "@navikt/aksel-icons";
import { Heading, HStack, VStack } from "@navikt/ds-react";

import { requireAdmin } from "~/server/auth.server";
import { listComponents } from "~/server/components.server";
import { listAdminIntegrations } from "~/server/integrations.server";
import { listOrganisations } from "~/server/organisations.server";

import { IntegrationList } from "./IntegrationList";
import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Integrasjoner – Admin – FINT Selvbetjening" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const [integrations, components, organisations] = await Promise.all([
    listAdminIntegrations(),
    listComponents(),
    listOrganisations(),
  ]);

  return { integrations, components, organisations };
}

export default function AdminIntegrations({ loaderData }: Route.ComponentProps) {
  return (
    <VStack gap="space-24" paddingBlock="space-24">
      <HStack align="center" gap="space-8" wrap={false}>
        <LinkIcon aria-hidden fontSize="2.25rem" />
        <Heading size="large">Integrasjoner</Heading>
      </HStack>
      <IntegrationList {...loaderData} />
    </VStack>
  );
}
