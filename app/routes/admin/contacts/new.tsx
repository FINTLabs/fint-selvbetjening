import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
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
import { OrganisationSelect } from "./OrganisationSelect";
import {
  ContactFields,
  readContactFields,
  getContactFieldErrors,
  type ContactFieldValues,
} from "./ContactFields";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ny kontakt - FINT Selvbetjening" },
    { name: "description", content: "Opprett en ny kontakt" },
  ];
}

type ContactValues = ContactFieldValues & { organisationIds: string[] };

type ActionData = {
  error?: string;
  values?: ContactValues;
  contactErrors?: ReturnType<typeof getContactFieldErrors>;
  organisationError?: string;
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
    ...readContactFields(formData),
    organisationIds: [
      ...new Set(
        formData.getAll("organisationIds").map((value) => String(value)),
      ),
    ],
  };

  const contactErrors = getContactFieldErrors(values);
  const organisationError = values.organisationIds.length === 0
      ? "Velg minst én organisasjon."
      : undefined;

  if (Object.keys(contactErrors).length > 0 || organisationError) {
    return { values, contactErrors, organisationError };
  }

  const organisation = await getOrganisationById(values.organisationIds[0]);
  if (!organisation) {
    return {
      error: "Velg en gyldig organisasjon.",
      values,
      contactErrors,
    };
  }

  try {
    await createUser({
      firstName: values.firstName,
      lastName: values.lastName,
      mail: values.mail,
      nin: values.nin,
      mobile: values.mobile || null,
      organisationIds: values.organisationIds,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Kunne ikke opprette kontakten.",
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
      <BodyLong>Opprett en kontakt og knytt den til en organisasjon.</BodyLong>

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
          <ContactFields values={values} errors={actionData?.contactErrors} />
          <OrganisationSelect
              size="small"
              organisations={organisations}
              defaultSelectedIds={values?.organisationIds ?? []}
              error={actionData?.organisationError}
          />
          <HStack gap="space-8">
            <Button
              type="submit"
              size="small"
              loading={submitting}
              disabled={organisations.length === 0}
            >
              Opprett
            </Button>
            <Button as={Link} to="/admin/kontakter" variant="secondary" size="small">
              Avbryt
            </Button>
          </HStack>
        </VStack>
      </Form>
    </VStack>
  );
}
