import { data, redirect } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import {
  getOrganisationWithLegalContact,
  updateOrganisation,
} from "~/server/organisations.server";
import { listContactOptions } from "~/server/users.server";

import type { Route } from "./+types/edit";
import { OrganisationForm, readOrganisationForm, type OrganisationFormActionData } from "./OrganisationForm";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [organisation, contacts] = await Promise.all([
    getOrganisationWithLegalContact(params.organisationId),
    listContactOptions(params.organisationId),
  ]);

  if (!organisation) {
    throw data("Organisasjonen finnes ikke.", { status: 404 });
  }

  return { organisation, contacts };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);
  const { values, errors } = readOrganisationForm(await request.formData(), "edit");

  if (Object.keys(errors).length) {
    return data<OrganisationFormActionData>({ errors, values }, { status: 400 });
  }

  let updated: boolean;
  try {
    updated = await updateOrganisation(params.organisationId, values);
  } catch (error) {
    return data<OrganisationFormActionData>(
      {
        saveError: error instanceof Error ? error.message : "Kunne ikke lagre organisasjonen.",
        values,
      },
      { status: 400 },
    );
  }

  if (!updated) {
    if (!(await getOrganisationWithLegalContact(params.organisationId))) {
      throw data("Organisasjonen finnes ikke.", { status: 404 });
    }
    return data<OrganisationFormActionData>(
      { errors: { legalContactId: "Den juridiske kontakten må være medlem av organisasjonen." }, values },
      { status: 400 },
    );
  }

  return redirect(`/admin/organisasjoner/${params.organisationId}`);
}

export default function EditOrganisation({ actionData, loaderData }: Route.ComponentProps) {
  const { organisation, contacts } = loaderData;
  return (
    <OrganisationForm
      key={organisation.id}
      mode="edit"
      contacts={contacts}
      cancelTo={`/admin/organisasjoner/${organisation.id}`}
      values={{
        ...organisation,
        legalContactId: "",
        ...actionData?.values,
        primaryAssetId: organisation.primaryAssetId,
      }}
      errors={actionData?.errors}
      saveError={actionData?.saveError}
    />
  );
}
