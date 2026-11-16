import { ContactTable } from "~/components/ContactTable";
import { requireUser } from "~/server/auth.server";
import { listUsersByOrganisation } from "~/server/users.server";
import type { Route } from "./+types/list";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kontakter - FINT Selvbetjening" },
    { name: "description", content: "Liste over kontakter" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  if (!user.organisation) {
    return { contacts: [], hasOrganisation: false };
  }

  return {
    contacts: await listUsersByOrganisation(user.organisation.id),
    hasOrganisation: true,
  };
}

export default function ContactsList({ loaderData }: Route.ComponentProps) {
  return (
    <ContactTable
      title="Kontakter"
      contacts={loaderData.contacts}
      emptyTitle={
        loaderData.hasOrganisation
          ? "Ingen kontakter"
          : "Ingen organisasjon"
      }
      emptyDescription={
        loaderData.hasOrganisation
          ? "Det er ingen kontakter i organisasjonen ennå."
          : "Du er ikke tilknyttet en organisasjon."
      }
    />
  );
}
