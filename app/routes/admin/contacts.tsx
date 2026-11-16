import { PlusIcon } from "@navikt/aksel-icons";
import { Button } from "@navikt/ds-react";
import { Link } from "react-router";

import { ContactTable } from "~/components/ContactTable";
import { requireAdmin } from "~/server/auth.server";
import { listUsers } from "~/server/users.server";
import type { Route } from "./+types/contacts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Alle kontakter - FINT Selvbetjening" },
    { name: "description", content: "Liste over alle kontakter" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { contacts: await listUsers() };
}

export default function AdminContacts({ loaderData }: Route.ComponentProps) {
  return (
    <ContactTable
      title="Alle kontakter"
      contacts={loaderData.contacts}
      showAdmin
      emptyTitle="Ingen kontakter"
      emptyDescription="Det er ingen kontakter i databasen ennå."
      headerAction={
        <Button
          as={Link}
          to="/admin/kontakter/ny"
          icon={<PlusIcon aria-hidden />}
          size="small"
        >
          Legg til
        </Button>
      }
    />
  );
}
