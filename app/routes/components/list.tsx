import {
  BodyLong,
  Box,
  Heading,
  LocalAlert,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";

import { ComponentCategoryGrid } from "~/components/ComponentCategoryGrid";
import { ComponentToggleModal } from "~/components/ComponentToggleModal";
import { requireUser } from "~/server/auth.server";
import {
  listComponents,
  listEnabledComponentsForOrganisation,
  setOrganisationComponent,
} from "~/server/components.server";
import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Komponenter - FINT Selvbetjening" },
    { name: "description", content: "Liste over komponenter" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const components = await listComponents();
  const enabled = user.organisation
    ? await listEnabledComponentsForOrganisation(user.organisation.id)
    : [];

  return {
    components,
    enabledNames: enabled.map((component) => component.name),
    hasOrganisation: Boolean(user.organisation),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  if (!user.organisation) {
    throw new Response("Du er ikke tilknyttet en organisasjon.", {
      status: 403,
      statusText: "Du er ikke tilknyttet en organisasjon.",
    });
  }

  const formData = await request.formData();
  const componentName = String(formData.get("componentName") ?? "");
  const isChecked = formData.get("isChecked") === "true";

  try {
    await setOrganisationComponent(
      user.organisation.id,
      componentName,
      isChecked,
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere komponenten.",
    };
  }
}

export default function ComponentsList({ loaderData }: Route.ComponentProps) {
  const { components, enabledNames, hasOrganisation } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const [pendingChange, setPendingChange] = useState<{
    componentName: string;
    isChecked: boolean;
  } | null>(null);

  function handleToggle(componentName: string, isChecked: boolean) {
    setPendingChange({ componentName, isChecked });
  }

  function handleConfirm() {
    if (!pendingChange) {
      return;
    }

    fetcher.submit(
      {
        componentName: pendingChange.componentName,
        isChecked: String(pendingChange.isChecked),
      },
      { method: "post" },
    );
    setPendingChange(null);
  }

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      {components.length === 0 ? (
        <>
          <Heading size="large">Komponenter</Heading>
          <LocalAlert status="announcement">
            <LocalAlert.Header>
              <LocalAlert.Title>Ingen komponenter</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              <BodyLong>Det er ingen komponenter i databasen ennå.</BodyLong>
            </LocalAlert.Content>
          </LocalAlert>
        </>
      ) : (
        <Box padding="space-24">
          <VStack gap="space-16">
            <Heading size="medium">Komponenter</Heading>
            {!hasOrganisation ? (
              <LocalAlert status="announcement">
                <LocalAlert.Header>
                  <LocalAlert.Title>Ingen organisasjon</LocalAlert.Title>
                </LocalAlert.Header>
                <LocalAlert.Content>
                  <BodyLong>
                    Du er ikke tilknyttet en organisasjon, så du kan ikke slå
                    komponenter på.
                  </BodyLong>
                </LocalAlert.Content>
              </LocalAlert>
            ) : null}
            {fetcher.data && "error" in fetcher.data && fetcher.data.error ? (
              <LocalAlert status="error">
                <LocalAlert.Header>
                  <LocalAlert.Title>Kunne ikke oppdatere</LocalAlert.Title>
                </LocalAlert.Header>
                <LocalAlert.Content>
                  <BodyLong>{fetcher.data.error}</BodyLong>
                </LocalAlert.Content>
              </LocalAlert>
            ) : null}
            <ComponentCategoryGrid
              components={components}
              selectedItems={enabledNames}
              onToggle={hasOrganisation ? handleToggle : undefined}
              readOnly={!hasOrganisation}
              showChevron
            />
          </VStack>
        </Box>
      )}

      <ComponentToggleModal
        isOpen={pendingChange !== null}
        componentName={pendingChange?.componentName ?? ""}
        isChecked={pendingChange?.isChecked ?? false}
        onConfirm={handleConfirm}
        onCancel={() => setPendingChange(null)}
      />
    </VStack>
  );
}
