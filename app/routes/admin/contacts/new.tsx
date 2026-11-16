import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
  Select,
  TextField,
  VStack,
} from "@navikt/ds-react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import {
  getOrganisationById,
  listOrganisations,
} from "~/server/organisations.server";
import { createUser } from "~/server/users.server";
import type { Route } from "./+types/new";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ny kontakt - FINT Selvbetjening" },
    { name: "description", content: "Opprett en ny kontakt" },
  ];
}

type ContactValues = {
  firstName: string;
  lastName: string;
  mail: string;
  nin: string;
  mobile: string;
  organisationId: string;
};

type ActionData = {
  error?: string;
  values?: ContactValues;
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { organisations: await listOrganisations() };
}

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionData | Response> {
  await requireAdmin(request);
  const formData = await request.formData();
  const values: ContactValues = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    mail: String(formData.get("mail") ?? "").trim(),
    nin: String(formData.get("nin") ?? "").trim(),
    mobile: String(formData.get("mobile") ?? "").trim(),
    organisationId: String(formData.get("organisationId") ?? "").trim(),
  };

  if (
    !values.firstName ||
    !values.lastName ||
    !values.mail ||
    !values.nin ||
    !values.organisationId
  ) {
    return {
      error: "Fyll ut fornavn, etternavn, e-post, fødselsnummer og organisasjon.",
      values,
    };
  }

  const organisation = await getOrganisationById(values.organisationId);
  if (!organisation) {
    return {
      error: "Velg en gyldig organisasjon.",
      values,
    };
  }

  try {
    await createUser({
      firstName: values.firstName,
      lastName: values.lastName,
      mail: values.mail,
      nin: values.nin,
      mobile: values.mobile || null,
      organisationId: values.organisationId,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Kunne ikke opprette kontakten.",
      values,
    };
  }

  return redirect("/admin/kontakter");
}

export default function NewContact({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const { organisations } = loaderData;
  const values = actionData?.values;

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <Heading size="large">Ny kontakt</Heading>
      <BodyLong>
        Opprett en kontakt og knytt den til en organisasjon.
      </BodyLong>

      {organisations.length === 0 ? (
        <LocalAlert status="warning">
          <LocalAlert.Header>
            <LocalAlert.Title>Ingen organisasjoner</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>
              Du må opprette en organisasjon før du kan legge til en kontakt.
            </BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : null}

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
            name="firstName"
            label="Fornavn"
            defaultValue={values?.firstName}
            autoComplete="given-name"
          />
          <TextField
            name="lastName"
            label="Etternavn"
            defaultValue={values?.lastName}
            autoComplete="family-name"
          />
          <TextField
            name="mail"
            label="E-post"
            type="email"
            defaultValue={values?.mail}
            autoComplete="email"
          />
          <TextField
            name="nin"
            label="Fødselsnummer"
            defaultValue={values?.nin}
            autoComplete="off"
          />
          <TextField
            name="mobile"
            label="Mobil"
            defaultValue={values?.mobile}
            autoComplete="tel"
          />
          <Select
            name="organisationId"
            label="Organisasjon"
            defaultValue={values?.organisationId ?? ""}
            disabled={organisations.length === 0}
          >
            <option value="">Velg organisasjon</option>
            {organisations.map((organisation) => (
              <option key={organisation.id} value={organisation.id}>
                {organisation.displayName}
              </option>
            ))}
          </Select>
          <HStack gap="space-8">
            <Button
              type="submit"
              loading={submitting}
              disabled={organisations.length === 0}
            >
              Opprett
            </Button>
            <Button as={Link} to="/admin/kontakter" variant="secondary">
              Avbryt
            </Button>
          </HStack>
        </VStack>
      </Form>
    </VStack>
  );
}
