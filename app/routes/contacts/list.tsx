import { BodyShort, Box, Heading, Link, VStack } from "@navikt/ds-react";

import { ContactTable } from "~/components/ContactTable";
import { requireUser } from "~/server/auth.server";
import { getOrganisationWithLegalContact } from "~/server/organisations.server";
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
    return { contacts: [], hasOrganisation: false, legalContact: null };
  }

  const [contacts, organisation] = await Promise.all([
    listUsersByOrganisation(user.organisation.id),
    getOrganisationWithLegalContact(user.organisation.id),
  ]);

  return {
    contacts,
    hasOrganisation: true,
    legalContact: organisation?.legalContactName
      ? { name: organisation.legalContactName, mail: organisation.legalContactMail }
      : null,
  };
}

export default function ContactsList({ loaderData }: Route.ComponentProps) {
  const { contacts, hasOrganisation, legalContact } = loaderData;

  return (
    <ContactTable
      title="Kontakter"
      contacts={contacts}
      emptyTitle={
        hasOrganisation ? "Ingen kontakter" : "Ingen organisasjon"
      }
      emptyDescription={
        hasOrganisation
          ? "Det er ingen kontakter i organisasjonen ennå."
          : "Du er ikke tilknyttet en organisasjon."
      }
    >
      {hasOrganisation ? (
        <Box
          as="section"
          aria-labelledby="legal-contact-heading"
          padding="space-16"
          borderColor="neutral-subtle"
          borderWidth="1"
          borderRadius="12"
        >
          <VStack gap="space-4" align="start">
            <Heading id="legal-contact-heading" level="2" size="small">
              Juridisk kontakt
            </Heading>
            {legalContact ? (
              <>
                <BodyShort>{legalContact.name}</BodyShort>
                {legalContact.mail && (
                  <Link href={`mailto:${legalContact.mail}`}>
                    {legalContact.mail}
                  </Link>
                )}
              </>
            ) : (
              <BodyShort>Ingen juridisk kontakt er tildelt.</BodyShort>
            )}
          </VStack>
        </Box>
      ) : null}
    </ContactTable>
  );
}
