import { listEnabledComponentsForOrganisation } from "~/server/components.server";
import { getOrganisationByRef } from "~/server/organisations.server";

export async function loader({
  params,
}: {
  params: { organisationId?: string };
}) {
  const organisationRef = params.organisationId ?? "";
  const organisation = await getOrganisationByRef(organisationRef);
  if (!organisation) {
    return Response.json(
      { message: "Organisasjonen finnes ikke." },
      { status: 404 },
    );
  }

  const components = await listEnabledComponentsForOrganisation(
    organisation.id,
  );
  return Response.json(components);
}
