import { ArrowLeftIcon, PencilIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Box,
  Button,
  Heading,
  HGrid,
  HStack,
  Label,
  Link as AkselLink,
  Table,
  VStack,
} from "@navikt/ds-react";
import { data, Link } from "react-router";

import { IntegrationList } from "~/routes/admin/integrations/IntegrationList";
import { requireAdmin } from "~/server/auth.server";
import { listComponents } from "~/server/components.server";
import { listIntegrationsForOrganisation } from "~/server/integrations.server";
import { getOrganisationWithLegalContact, isLegalContactMembershipViolation, setOrganisationLegalContact } from "~/server/organisations.server";
import { addUserOrganisations, getUserById, listContactOptions, listContactsOutsideOrganisation, removeUserOrganisation } from "~/server/users.server";

import type { Route } from "./+types/detail";
import { AddTechnicalContactDialog } from "./AddTechnicalContactDialog";
import { OrganisationLegalContactDialog } from "./OrganisationLegalContactDialog";
import { RemoveTechnicalContactDialog } from "./RemoveTechnicalContactDialog";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.organisation.displayName ?? "Organisasjon"} - FINT Selvbetjening` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);

  const [organisation, contacts] = await Promise.all([
    getOrganisationWithLegalContact(params.organisationId),
    listContactOptions(params.organisationId),
  ]);

  if (!organisation) {
    throw data("Organisasjonen finnes ikke.", { status: 404 });
  }

  const [integrations, components, availableContacts] = await Promise.all([
    listIntegrationsForOrganisation(organisation.id),
    listComponents(),
    listContactsOutsideOrganisation(organisation.id),
  ]);

  return { organisation, contacts, integrations, components, availableContacts };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || !contactId) {
    return data({ error: "Velg en kontakt." }, { status: 400 });
  }

  switch (formData.get("intent")) {
    case "remove-technical-contact": {
      const organisation = await getOrganisationWithLegalContact(params.organisationId);
      if (!organisation) {
        return data({ error: "Organisasjonen finnes ikke." }, { status: 404 });
      }
      const protectedContact = "Bytt juridisk kontakt før du fjerner medlemskapet.";
      if (organisation.legalContactId === contactId) {
        return data({ error: protectedContact }, { status: 409 });
      }

      try {
        if (!(await removeUserOrganisation(contactId, organisation.id))) {
          return data({ error: "Kontakten er ikke medlem av organisasjonen." }, { status: 404 });
        }
      } catch (error) {
        if (isLegalContactMembershipViolation(error)) {
          return data({ error: protectedContact }, { status: 409 });
        }
        return data({ error: "Kunne ikke fjerne kontakten. Prøv igjen." }, { status: 500 });
      }
      return { ok: true };
    }
    case "add-technical-contact": {
      const [organisation, contact] = await Promise.all([
        getOrganisationWithLegalContact(params.organisationId),
        getUserById(contactId),
      ]);
      if (!organisation) {
        return data({ error: "Organisasjonen finnes ikke." }, { status: 404 });
      }
      if (!contact) {
        return data({ error: "Kontakten finnes ikke." }, { status: 404 });
      }

      try {
        await addUserOrganisations(contact.id, [organisation.id]);
      } catch {
        return data({ error: "Kunne ikke legge til kontakten. Prøv igjen." }, { status: 500 });
      }

      return { ok: true };
    }
    case "set-legal-contact": {
      const expectedLegalContactId = formData.get("expectedLegalContactId");
      if (typeof expectedLegalContactId !== "string") {
        return data({ error: "Ugyldig forespørsel." }, { status: 400 });
      }

      const [organisation, contacts] = await Promise.all([
        getOrganisationWithLegalContact(params.organisationId),
        listContactOptions(params.organisationId),
      ]);
      if (!organisation) {
        return data({ error: "Organisasjonen finnes ikke." }, { status: 404 });
      }
      if (!contacts.some(({ id }) => id === contactId)) {
        return data({ error: "Den juridiske kontakten må være medlem av organisasjonen." }, { status: 400 });
      }

      try {
        const updated = await setOrganisationLegalContact(organisation.id, contactId, expectedLegalContactId || null);
        if (!updated) {
          return data(
            { error: "Den juridiske kontakten eller medlemskapet er endret. Last siden på nytt og prøv igjen." },
            { status: 409 },
          );
        }
      } catch {
        return data({ error: "Kunne ikke lagre juridisk kontakt. Prøv igjen." }, { status: 500 });
      }
      return { ok: true };
    }
    default:
      return data({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
}

export default function OrganisationDetail({ loaderData }: Route.ComponentProps) {
  const { organisation, contacts, integrations, components, availableContacts } = loaderData;

  return (
    <VStack gap="space-24" paddingBlock="space-24" className="wrap-anywhere">
      <AkselLink as={Link} to="/admin/organisasjoner" className="self-start">
        <ArrowLeftIcon aria-hidden /> Tilbake til organisasjoner
      </AkselLink>
      <Heading size="large">{organisation.displayName}</Heading>

      <Box as="section" aria-labelledby="organisation-info" borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
        <VStack gap="space-16">
          <HStack justify="space-between" align="center" gap="space-12">
            <Heading id="organisation-info" level="2" size="medium">
              Organisasjonsinformasjon
            </Heading>
            <Button
              as={Link}
              to={`/admin/organisasjoner/rediger/${organisation.id}`}
              size="xsmall"
              variant="secondary"
              icon={<PencilIcon aria-hidden />}
            >
              Rediger
            </Button>
          </HStack>
          <HGrid as="dl" columns={{ xs: 1, sm: 2 }} gap="space-16" className="m-0">
            <div>
              <Label as="dt">Navn</Label>
              <BodyShort as="dd" className="m-0">{organisation.name}</BodyShort>
            </div>
            <div>
              <Label as="dt">Visningsnavn</Label>
              <BodyShort as="dd" className="m-0">{organisation.displayName}</BodyShort>
            </div>
            <div>
              <Label as="dt">Organisasjonsnummer</Label>
              <BodyShort as="dd" className="m-0">{organisation.orgNumber}</BodyShort>
            </div>
            <div>
              <Label as="dt">Primær Asset ID</Label>
              <BodyShort as="dd" className="m-0">{organisation.primaryAssetId ?? "Ikke registrert"}</BodyShort>
            </div>
          </HGrid>
        </VStack>
      </Box>

      <Box as="section" aria-labelledby="organisation-legal-contact" borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
        <VStack gap="space-16">
          <HStack justify="space-between" align="center" gap="space-12">
            <Heading id="organisation-legal-contact" level="2" size="medium">
              Juridisk kontakt
            </Heading>
            <OrganisationLegalContactDialog key={organisation.id} organisation={organisation} contacts={contacts} />
          </HStack>
          {organisation.legalContactName ? (
            <div>
              <BodyShort>{organisation.legalContactName}</BodyShort>
              <BodyShort>{organisation.legalContactMail}</BodyShort>
            </div>
          ) : (
            <BodyShort>Ingen juridisk kontakt</BodyShort>
          )}
        </VStack>
      </Box>

      <Box as="section" aria-labelledby="organisation-contacts" borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
        <VStack gap="space-16">
          <HStack justify="space-between" align="center" gap="space-12">
            <Heading id="organisation-contacts" level="2" size="medium">
              Tekniske kontakter
            </Heading>
            <AddTechnicalContactDialog key={organisation.id} contacts={availableContacts} />
          </HStack>
          {contacts.length ? (
            <Box className="overflow-x-auto">
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
                    <Table.HeaderCell scope="col">E-post</Table.HeaderCell>
                    <Table.HeaderCell scope="col" align="right" className="whitespace-nowrap">
                      Handlinger
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {contacts.map((contact) => (
                    <Table.Row key={contact.id}>
                      <Table.HeaderCell scope="row">{contact.name}</Table.HeaderCell>
                      <Table.DataCell>{contact.mail}</Table.DataCell>
                      <Table.DataCell align="right" className="whitespace-nowrap">
                        <RemoveTechnicalContactDialog
                          contact={contact}
                          organisationName={organisation.displayName}
                          isLegalContact={organisation.legalContactId === contact.id}
                        />
                      </Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Box>
          ) : (
            <BodyShort>Ingen Tekniske kontakter</BodyShort>
          )}
        </VStack>
      </Box>
      <Box as="section" aria-labelledby="organisation-integrations" borderRadius="12" borderWidth="1" borderColor="neutral-subtle" padding="space-24">
        <VStack gap="space-16">
          <Heading id="organisation-integrations" level="2" size="medium">Integrasjoner</Heading>
          <IntegrationList key={organisation.id} integrations={integrations} components={components} />
        </VStack>
      </Box>
    </VStack>
  );
}
