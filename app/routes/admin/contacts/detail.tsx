import { ArrowLeftIcon, PencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HGrid, HStack, Label, Link as AkselLink, Table, Tag, VStack } from "@navikt/ds-react";
import { data, Link, useLocation } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import {
  listOrganisations,
  listOrganisationsWithLegalContacts,
  setOrganisationLegalContact,
} from "~/server/organisations.server";
import { addUserOrganisations, getUserById } from "~/server/users.server";

import { AddContactOrganisationsDialog } from "./AddContactOrganisationsDialog";
import { SetLegalContactDialog } from "./SetLegalContactDialog";
import type { Route } from "./+types/detail";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.name ?? "Kontakt"} - FINT Selvbetjening` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);

  const [contact, allOrganisations] = await Promise.all([
    getUserById(params.contactId),
    listOrganisationsWithLegalContacts(),
  ]);
  if (!contact) {
    throw data("Kontakten finnes ikke.", { status: 404 });
  }

  const { firstName, lastName, mail, mobile, nin } = contact;
  const organisationsById = new Map(allOrganisations.map((organisation) => [organisation.id, organisation]));
  const organisations = contact.organisations.map((membership) => {
    const organisation = organisationsById.get(membership.id);
    return {
      ...membership,
      legalContactId: organisation?.legalContactId ?? null,
      legalContactName: organisation?.legalContactName ?? null,
    };
  });
  const memberIds = new Set(organisations.map(({ id }) => id));
  const availableOrganisations = allOrganisations
    .filter(({ id }) => !memberIds.has(id))
    .map(({ id, displayName }) => ({ id, displayName }));
  return { name: `${firstName} ${lastName}`, mail, mobile, nin, organisations, availableOrganisations };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  switch (formData.get("intent")) {
    case "add-organisations": {
      const organisationIds = [...new Set(formData.getAll("organisationIds").map(String))];
      if (organisationIds.length === 0) {
        return data({ error: "Velg minst én organisasjon." }, { status: 400 });
      }

      const [contact, organisations] = await Promise.all([
        getUserById(params.contactId),
        listOrganisations(),
      ]);
      if (!contact) {
        return data({ error: "Kontakten finnes ikke." }, { status: 404 });
      }

      const validIds = new Set(organisations.map(({ id }) => id));
      if (!organisationIds.every((id) => validIds.has(id))) {
        return data({ error: "Velg gyldige organisasjoner." }, { status: 400 });
      }

      try {
        await addUserOrganisations(contact.id, organisationIds);
      } catch {
        return data({ error: "Kunne ikke legge til organisasjonene. Prøv igjen." }, { status: 500 });
      }
      return { ok: true };
    }
    case "set-legal-contact": {
      const organisationId = formData.get("organisationId");
      const expectedLegalContactId = formData.get("expectedLegalContactId");
      if (typeof organisationId !== "string" || !organisationId || typeof expectedLegalContactId !== "string") {
        return data({ error: "Ugyldig forespørsel." }, { status: 400 });
      }

      const contact = await getUserById(params.contactId);
      if (!contact) {
        return data({ error: "Kontakten finnes ikke." }, { status: 404 });
      }
      if (!contact.organisations.some(({ id }) => id === organisationId)) {
        return data({ error: "Den juridiske kontakten må være medlem av organisasjonen." }, { status: 400 });
      }

      try {
        const updated = await setOrganisationLegalContact(organisationId, contact.id, expectedLegalContactId || null);
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
      return data({ error: "Ukjent handling." }, { status: 400 });
  }
}

const sectionStyle = {
  borderRadius: "12",
  borderWidth: "1",
  borderColor: "neutral-subtle",
  padding: "space-24",
} as const;

export default function ContactDetail({ loaderData, params }: Route.ComponentProps) {
  const { name, mail, mobile, nin, organisations, availableOrganisations } = loaderData;
  const { search } = useLocation();

  return (
    <VStack gap="space-24" paddingBlock="space-24" className="[overflow-wrap:anywhere]">
      <AkselLink as={Link} to={{ pathname: "/admin/kontakter", search }} className="self-start">
        <ArrowLeftIcon aria-hidden /> Tilbake til kontakter
      </AkselLink>
      <Heading size="large">{name}</Heading>

      <Box as="section" aria-labelledby="contact-info" {...sectionStyle}>
        <VStack gap="space-16">
          <HStack justify="space-between" align="center" gap="space-12">
            <Heading id="contact-info" level="2" size="medium">Kontaktinformasjon</Heading>
            <Button
              as={Link}
              to={{ pathname: `/admin/kontakter/${params.contactId}/rediger`, search }}
              size="xsmall"
              variant="secondary"
              icon={<PencilIcon aria-hidden />}
            >Rediger</Button>
          </HStack>
          <HGrid as="dl" columns={{ xs: 1, sm: 2 }} gap="space-16" className="m-0">
            <div>
              <Label as="dt">Navn</Label>
              <BodyShort as="dd" className="m-0">{name}</BodyShort>
            </div>
            <div>
              <Label as="dt">E-post</Label>
              <BodyShort as="dd" className="m-0">{mail}</BodyShort>
            </div>
            <div>
              <Label as="dt">Mobil</Label>
              <BodyShort as="dd" className="m-0">{mobile ?? "Ikke registrert"}</BodyShort>
            </div>
            <div>
              <Label as="dt">Fødselsnummer</Label>
              <BodyShort as="dd" className="m-0">{nin}</BodyShort>
            </div>
          </HGrid>
        </VStack>
      </Box>

      <Box as="section" aria-labelledby="contact-organisations" {...sectionStyle}>
        <VStack gap="space-16">
          <HStack justify="space-between" align="center" gap="space-12">
            <Heading id="contact-organisations" level="2" size="medium">Organisasjoner</Heading>
            <AddContactOrganisationsDialog key={params.contactId} organisations={availableOrganisations} />
          </HStack>
          {organisations.length > 0 ? (
            <Box className="overflow-x-auto">
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Organisasjon</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Adminstatus</Table.HeaderCell>
                    <Table.HeaderCell scope="col" align="right">Handlinger</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {organisations.map((organisation) => (
                    <Table.Row key={organisation.id}>
                      <Table.HeaderCell scope="row">{organisation.displayName}</Table.HeaderCell>
                      <Table.DataCell>
                        {organisation.isAdmin ? <Tag variant="info" size="small">Admin</Tag> : "Medlem"}
                      </Table.DataCell>
                      <Table.DataCell align="right">
                        {organisation.legalContactId === params.contactId ? (
                          <Tag size="small" variant="moderate" data-color="neutral">Juridisk kontakt</Tag>
                        ) : (
                          <SetLegalContactDialog contactName={name} organisation={organisation} />
                        )}
                      </Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Box>
          ) : (
            <BodyShort>Ingen organisasjoner</BodyShort>
          )}
        </VStack>
      </Box>
    </VStack>
  );
}
