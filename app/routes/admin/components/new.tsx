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

import { requireAdmin } from "~/server/auth.server";
import {
  categoryFromBasePath,
  createComponent,
  normalizeBasePath,
} from "~/server/components.server";
import type { Route } from "./+types/new";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ny komponent - FINT Selvbetjening" },
    { name: "description", content: "Opprett en ny komponent" },
  ];
}

type ComponentValues = {
  name: string;
  description: string;
  basePath: string;
};

type ActionData = {
  error?: string;
  values?: ComponentValues;
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
  const values: ComponentValues = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    basePath: normalizeBasePath(String(formData.get("basePath") ?? "")),
  };
  const category = categoryFromBasePath(values.basePath);

  if (!values.name || !values.description || !values.basePath || !category) {
    return {
      error:
        "Fyll ut navn, beskrivelse og sti. Stien må ha minst ett ledd, for eksempel /administrasjon/fullmakt.",
      values,
    };
  }

  try {
    await createComponent({
      name: values.name,
      description: values.description,
      category,
      basePath: values.basePath,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Kunne ikke opprette komponenten.",
      values,
    };
  }

  return redirect("/admin/komponenter");
}

export default function NewComponent({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <Heading size="large">Ny komponent</Heading>
      <BodyLong>
        Opprett en FINT-komponent. Kategori settes fra første ledd i stien.
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
            name="name"
            label="Navn"
            description="Teknisk navn, for eksempel fullmakt"
            defaultValue={actionData?.values?.name}
            autoComplete="off"
          />
          <TextField
            name="description"
            label="Beskrivelse"
            description="Visningsnavn, for eksempel Administrasjon Fullmakt"
            defaultValue={actionData?.values?.description}
            autoComplete="off"
          />
          <TextField
            name="basePath"
            label="Sti"
            description="For eksempel /administrasjon/fullmakt"
            defaultValue={actionData?.values?.basePath}
            autoComplete="off"
          />
          <HStack gap="space-8">
            <Button type="submit" loading={submitting}>
              Opprett
            </Button>
            <Button as={Link} to="/admin/komponenter" variant="secondary">
              Avbryt
            </Button>
          </HStack>
        </VStack>
      </Form>
    </VStack>
  );
}
