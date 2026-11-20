import { Buildings3Icon, ExclamationmarkTriangleFillIcon } from "@navikt/aksel-icons";
import { Button, Dialog, HStack, List, Tag } from "@navikt/ds-react";

export function ContactOrganisationsDialog({
    name,
    organisations,
}: {
    name: string;
    organisations: { id: string; displayName: string; isAdmin: boolean }[];
}) {
    if (organisations.length === 0) {
        return (
            <ExclamationmarkTriangleFillIcon
                title="Mangler organisasjon"
                fontSize="1.25rem"
                style={{ color: "var(--ax-text-warning-decoration)" }}
            />
        );
    }

    if (organisations.length === 1) {
        return organisations[0].displayName;
    }

    const label = `Vis organisasjoner for ${name}`;
    return (
        <Dialog>
            <Dialog.Trigger>
                <Button
                    type="button"
                    size="small"
                    variant="tertiary"
                    icon={<Buildings3Icon aria-hidden />}
                    aria-label={label}
                    title={label}
                />
            </Dialog.Trigger>
            <Dialog.Popup>
                <Dialog.Header>
                    <Dialog.Title>Organisasjoner</Dialog.Title>
                    <Dialog.Description>{name}</Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
                    <List as="ul" size="small">
                        {organisations.map((organisation) => (
                            <List.Item key={organisation.id}>
                                <HStack align="center" gap="space-8" wrap>
                                    <span>{organisation.displayName}</span>
                                    {organisation.isAdmin && (
                                        <Tag variant="moderate" data-color="info" size="xsmall">Admin</Tag>
                                    )}
                                </HStack>
                            </List.Item>
                        ))}
                    </List>
                </Dialog.Body>
            </Dialog.Popup>
        </Dialog>
    );
}
