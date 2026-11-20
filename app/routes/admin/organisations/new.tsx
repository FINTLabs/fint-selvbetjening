import { data, redirect } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import { createOrganisation } from "~/server/organisations.server";

import { OrganisationForm, readOrganisationForm, type OrganisationFormActionData } from "./OrganisationForm";
import type { Route } from "./+types/new";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ny organisasjon - FINT Selvbetjening" },
    { name: "description", content: "Opprett en ny organisasjon" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const { values, errors } = readOrganisationForm(await request.formData(), "create");

  if (Object.keys(errors).length) {
    return data<OrganisationFormActionData>({ errors, values }, { status: 400 });
  }

  const primaryAssetId = values.primaryAssetId.toLowerCase();
  try {
    await createOrganisation({
      name: primaryAssetId.replaceAll(".", "_"),
      displayName: values.displayName,
      orgNumber: values.orgNumber,
      primaryAssetId,
    });
  } catch (error) {
    return data<OrganisationFormActionData>(
      {
        saveError: error instanceof Error ? error.message : "Kunne ikke opprette organisasjonen.",
        values,
      },
      { status: 400 },
    );
  }

  return redirect("/admin/organisasjoner");
}

export default function NewOrganisation({ actionData }: Route.ComponentProps) {
  return (
    <OrganisationForm
      mode="create"
      values={actionData?.values}
      errors={actionData?.errors}
      saveError={actionData?.saveError}
    />
  );
}
