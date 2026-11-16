import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
  TextField,
  VStack,
} from "@navikt/ds-react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { createOrganisation } from "~/server/organisations.server";
import { requireAdmin } from "~/server/auth.server";
import type { Route } from "./+types/new";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ny organisasjon - FINT Selvbetjening" },
    { name: "description", content: "Opprett en ny organisasjon" },
  ];
}

type ActionData = {
  error?: string;
  values?: {
    name: string;
    displayName: string;
    orgNumber: string;
  };
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return {};
}

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionData | Response> {
  await requireAdmin(request);
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const orgNumber = String(formData.get("orgNumber") ?? "").trim();

  if (!name || !displayName || !orgNumber) {
    return {
      error: "Fyll ut visningsnavn, kortnavn og organisasjonsnummer.",
      values: { name, displayName, orgNumber },
    };
  }

  try {
    await createOrganisation({ name, displayName, orgNumber });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Kunne ikke opprette organisasjonen.",
      values: { name, displayName, orgNumber },
    };
  }

  return redirect("/admin/organisasjoner");
}

export default function NewOrganisation({
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <Heading size="large">Ny organisasjon</Heading>
      <BodyLong>
        Opprett en organisasjon. Brukere kan knyttes til den etterpå.
      </BodyLong>

      {actionData?.error ? (
        <LocalAlert status="error">
          <LocalAlert.Header>
            <LocalAlert.Title>Kunne ikke opprette</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>{actionData.error}</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : null}

      <Form method="post">
        <VStack gap="space-16">
          <TextField
            name="displayName"
            label="Visningsnavn"
            defaultValue={actionData?.values?.displayName}
            autoComplete="off"
          />
          <TextField
            name="name"
            label="Kortnavn"
            description="Teknisk navn, for eksempel jennifer_test"
            defaultValue={actionData?.values?.name}
            autoComplete="off"
          />
          <TextField
            name="orgNumber"
            label="Organisasjonsnummer"
            defaultValue={actionData?.values?.orgNumber}
            autoComplete="off"
          />
          <HStack gap="space-8">
            <Button type="submit" loading={submitting}>
              Opprett
            </Button>
            <Button as={Link} to="/admin/organisasjoner" variant="secondary">
              Avbryt
            </Button>
          </HStack>
        </VStack>
      </Form>
    </VStack>
  );
}
