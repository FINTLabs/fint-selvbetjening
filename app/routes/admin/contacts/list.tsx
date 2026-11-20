import {PersonGroupIcon, PlusIcon} from "@navikt/aksel-icons";
import {BodyShort, Box, Button, Heading, HGrid, HStack, Search, Select, Table, Tag, VStack} from "@navikt/ds-react";
import {useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router";

import {requireAdmin} from "~/server/auth.server";
import {listOrganisations} from "~/server/organisations.server";
import {listAdminContacts,} from "~/server/users.server";

import {ContactOrganisationsDialog} from "./ContactOrganisationsDialog";
import type {Route} from "./+types/list";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Alle kontakter - FINT Selvbetjening" },
        { name: "description", content: "Liste over alle kontakter" },
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    await requireAdmin(request);

    const requestedOrganisation = new URL(request.url).searchParams.get("organisation");
    const organisations = await listOrganisations();
    const organisationId = organisations.find(({ id }) => id === requestedOrganisation)?.id ?? null;

    return { contacts: await listAdminContacts(organisationId), organisations, organisationId };
}

export async function action({ request }: Route.ActionArgs) {
    const administrator = await requireAdmin(request);

    // if (request.method !== "POST") {
    //     throw new Response("Method not allowed", {
    //         status: 405,
    //         headers: { Allow: "POST" },
    //     });
    // }
    //
    // const formData = await request.formData();
    // const userId = String(formData.get("userId") ?? "");
    // const intent = String(formData.get("intent") ?? "");
    //
    // const contact = await getUserById(userId);
    //
    // if (!contact) {
    //     return data(
    //         { error: "Kontakten finnes ikke." },
    //         { status: 404 },
    //     );
    // }
    //
    // switch (intent) {
    //     case "organisations": {
    //         const organisationIds = [
    //             ...new Set(
    //                 formData.getAll("organisationIds").map((value) => String(value)),
    //             ),
    //         ];
    //
    //         if (organisationIds.length === 0) {
    //             return data(
    //                 { error: "Velg minst én organisasjon." },
    //                 { status: 400 },
    //             );
    //         }
    //
    //         const organisations = await listOrganisations();
    //         const validIds = new Set(
    //             organisations.map((organisation) => organisation.id),
    //         );
    //
    //         if (!organisationIds.every((id) => validIds.has(id))) {
    //             return data(
    //                 { error: "Velg gyldige organisasjoner." },
    //                 { status: 400 },
    //             );
    //         }
    //
    //         try {
    //             await updateUserOrganisations(contact.id, organisationIds);
    //         } catch (error) {
    //             if (isLegalContactMembershipViolation(error)) {
    //                 return data(
    //                     { error: "Velg en ny juridisk kontakt for organisasjonen før du fjerner medlemskapet." },
    //                     { status: 409 },
    //                 );
    //             }
    //             return data(
    //                 { error: "Kunne ikke lagre organisasjonene. Prøv igjen." },
    //                 { status: 500 },
    //             );
    //         }
    //
    //         return { ok: true };
    //     }
    //
    //     case "admin": {
    //         const value = formData.get("isAdmin");
    //
    //         if (value !== "true" && value !== "false") {
    //             return data(
    //                 { error: "Velg en gyldig administratortilgang." },
    //                 { status: 400 },
    //             );
    //         }
    //
    //         const isAdmin = value === "true";
    //
    //         try {
    //             await setUserAdminStatus(contact.id, isAdmin);
    //         } catch {
    //             return data(
    //                 { error: "Kunne ikke endre administratortilgangen. Prøv igjen." },
    //                 { status: 500 },
    //             );
    //         }
    //
    //         if (contact.id === administrator.id && !isAdmin) {
    //             return redirect("/");
    //         }
    //
    //         return { ok: true };
    //     }
    //
    //     default:
    //         return data(
    //             { error: "Ukjent handling." },
    //             { status: 400 },
    //         );
    // }
}

export default function AdminContacts({ loaderData }: Route.ComponentProps) {
    const { organisations, organisationId } = loaderData;
    const navigate = useNavigate();
    const [, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const query = search.trim().toLowerCase();
    const detailSearch = organisationId ? `?${new URLSearchParams({ organisation: organisationId })}` : "";
    const contacts = loaderData.contacts.filter((contact) =>
        [contact.name, contact.mail, contact.mobile]
            .some((field) => field?.toLowerCase().includes(query)),
    );

    function filterByOrganisation(id: string) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (id) next.set("organisation", id);
            else next.delete("organisation");
            return next;
        }, { preventScrollReset: true });
    }

    return (
        <VStack gap="space-24" paddingBlock="space-24">
            <HStack justify="space-between" align="center" gap="space-12" wrap>
                <HStack align="center" gap="space-8" wrap={false}>
                    <PersonGroupIcon aria-hidden fontSize="2.25rem" />
                    <Heading size="large">Alle kontakter</Heading>
                </HStack>
                <Button as={Link} to="/admin/kontakter/ny" icon={<PlusIcon aria-hidden />} size="small">
                    Legg til
                </Button>
            </HStack>

            <Box
                as="section"
                aria-labelledby="contact-filters"
                background="neutral-soft"
                borderRadius="12"
                borderWidth="1"
                borderColor="neutral-subtle"
                padding={{ xs: "space-16", sm: "space-24" }}
            >
                <VStack gap="space-16">
                    <Heading id="contact-filters" level="2" size="small">Filtrer kontakter</Heading>
                    <HGrid columns={{ xs: 1, sm: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="space-20">
                        <Search
                            label="Søk etter kontakter"
                            hideLabel={false}
                            size="small"
                            variant="simple"
                            value={search}
                            onChange={setSearch}
                        />
                        <Select
                            label="Filtrer på organisasjon"
                            size="small"
                            value={organisationId ?? ""}
                            onChange={(event) => filterByOrganisation(event.target.value)}
                        >
                            <option value="">Alle organisasjoner</option>
                            {organisations.map((organisation) => (
                                <option key={organisation.id} value={organisation.id}>{organisation.displayName}</option>
                            ))}
                        </Select>
                    </HGrid>
                </VStack>
            </Box>

            <VStack gap="space-8">
                <BodyShort size="small" textColor="subtle" role="status">
                    {contacts.length > 0
                        ? `Viser ${contacts.length} av ${loaderData.contacts.length} kontakter`
                        : query ? "Ingen kontakter matcher søket." : organisationId ? "Ingen kontakter i organisasjonen." : "Ingen kontakter"}
                </BodyShort>
                <Box borderRadius="12" borderWidth="1" borderColor="neutral-subtle" className="overflow-x-auto">
                    <Table zebraStripes className="min-w-136 wrap-anywhere">
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
                                <Table.HeaderCell scope="col">E-post</Table.HeaderCell>
                                <Table.HeaderCell scope="col">Mobil</Table.HeaderCell>
                                <Table.HeaderCell scope="col">Organisasjon</Table.HeaderCell>
                                <Table.HeaderCell scope="col">Admin</Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {contacts.map((contact) => {
                                const detailPath = `/admin/kontakter/${contact.id}${detailSearch}`;
                                return (
                                    <Table.Row
                                        key={contact.id}
                                        tabIndex={0}
                                        onRowClick={(event) => {
                                            if (event.currentTarget.contains(event.target as Node)) {
                                                void navigate(detailPath);
                                            }
                                        }}
                                        onKeyDown={(event) => {
                                            if (
                                                event.target === event.currentTarget &&
                                                (event.key === "Enter" || event.key === " ")
                                            ) {
                                                event.preventDefault();
                                                void navigate(detailPath);
                                            }
                                        }}
                                    >
                                        <Table.HeaderCell scope="row">{contact.name}</Table.HeaderCell>
                                        <Table.DataCell>{contact.mail}</Table.DataCell>
                                        <Table.DataCell>{contact.mobile ?? "—"}</Table.DataCell>
                                        <Table.DataCell>
                                            <ContactOrganisationsDialog name={contact.name} organisations={contact.organisations} />
                                        </Table.DataCell>
                                        <Table.DataCell>
                                            {contact.hasOrganisationAdmin && <Tag variant="moderate" data-color="info" size="xsmall">Admin</Tag>}
                                        </Table.DataCell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table>
                </Box>
            </VStack>
        </VStack>
    );
}
