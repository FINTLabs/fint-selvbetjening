import { BodyShort, Box, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { data, Form, Link, redirect, useLocation, useNavigation } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import { getUserById, updateUserContactInfo } from "~/server/users.server";

import type { Route } from "./+types/edit";
import {
  ContactFields,
  getContactFieldErrors,
  readContactFields,
  type ContactFieldErrors,
  type ContactFieldValues,
} from "./ContactFields";

type ActionData = {
  values: ContactFieldValues;
  errors?: ContactFieldErrors;
  saveError?: string;
};

async function getEditableContact(id: string) {
  const contact = await getUserById(id);
  if (!contact) {
    throw data("Kontakten finnes ikke.", { status: 404 });
  }

  const { firstName, lastName, mail, mobile, nin } = contact;
  return { firstName, lastName, mail, mobile: mobile ?? "", nin };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Rediger kontakt - FINT Selvbetjening" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { values: await getEditableContact(params.contactId) };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);
  const { nin } = await getEditableContact(params.contactId);
  const values = { ...readContactFields(await request.formData()), nin };
  const errors = getContactFieldErrors(values);

  if (Object.keys(errors).length > 0) {
    return data<ActionData>({ values, errors }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof updateUserContactInfo>>;
  try {
    result = await updateUserContactInfo(params.contactId, {
      firstName: values.firstName,
      lastName: values.lastName,
      mail: values.mail,
      mobile: values.mobile || null,
    });
  } catch {
    return data<ActionData>(
      { values, saveError: "Kunne ikke lagre kontakten. Prøv igjen." },
      { status: 500 },
    );
  }

  switch (result) {
    case "missing":
      throw data("Kontakten finnes ikke.", { status: 404 });
    case "duplicate-mail":
      return data<ActionData>(
        { values, errors: { mail: "E-postadressen er allerede i bruk." } },
        { status: 409 },
      );
    case "updated":
      return redirect(`/admin/kontakter/${params.contactId}${new URL(request.url).search}`);
  }
}

export default function EditContact({ actionData, loaderData, params }: Route.ComponentProps) {
  const { search } = useLocation();
  const navigation = useNavigation();
  const values = actionData?.values ?? loaderData.values;

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <Heading size="large">Rediger kontakt</Heading>
      {actionData?.saveError && <BodyShort role="alert">{actionData.saveError}</BodyShort>}

      <Form method="post">
        <VStack gap="space-16">
          <Box borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
            <VStack gap="space-16">
              <ContactFields values={values} errors={actionData?.errors} readOnlyNin />
            </VStack>
          </Box>
          <HStack gap="space-8" justify="end" wrap>
            <Button type="submit" size="small" loading={navigation.state === "submitting"}>
              Lagre
            </Button>
            <Button
              as={Link}
              to={{ pathname: `/admin/kontakter/${params.contactId}`, search }}
              variant="secondary"
              size="small"
            >
              Avbryt
            </Button>
          </HStack>
        </VStack>
      </Form>
    </VStack>
  );
}
