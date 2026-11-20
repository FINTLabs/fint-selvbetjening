import { ClockIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Dialog, Table } from "@navikt/ds-react";
import type { Route } from "./+types/details";

type PurposeHistoryDialogProps = {
    integrationName: string;
    history: Route.ComponentProps["loaderData"]["history"];
};

const dateFormatter = new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Europe/Oslo",
});

export function HistoryDialog({
                                         integrationName,
                                         history,
                                     }: PurposeHistoryDialogProps) {
    return (
        <Dialog>
            <Dialog.Trigger>
                <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    icon={<ClockIcon aria-hidden />}
                    aria-label="Vis formålshistorikk"
                    title="Vis formålshistorikk"
                />
            </Dialog.Trigger>

            <Dialog.Popup width="large">
                <Dialog.Header>
                    <Dialog.Title>Formålshistorikk</Dialog.Title>
                    <Dialog.Description>
                        Endringer i formålet for {integrationName}.
                    </Dialog.Description>
                </Dialog.Header>

                <Dialog.Body>
                    {history.length === 0 ? (
                        <BodyShort>
                            Ingen endringer i formålet er registrert.
                        </BodyShort>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <Table size="small">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.HeaderCell scope="col">
                                            Tidspunkt
                                        </Table.HeaderCell>
                                        <Table.HeaderCell scope="col">
                                            Endret av
                                        </Table.HeaderCell>
                                        <Table.HeaderCell scope="col">
                                            Tidligere formål
                                        </Table.HeaderCell>
                                        <Table.HeaderCell scope="col">
                                            Nytt formål
                                        </Table.HeaderCell>
                                    </Table.Row>
                                </Table.Header>

                                <Table.Body>
                                    {history.map((entry) => (
                                        <Table.Row key={entry.id}>
                                            <Table.DataCell>
                                                <time dateTime={entry.changedAt}>
                                                    {dateFormatter.format(
                                                        new Date(entry.changedAt),
                                                    )}
                                                </time>
                                            </Table.DataCell>

                                            <Table.DataCell>
                                                {entry.changedByName}
                                            </Table.DataCell>

                                            <Table.DataCell
                                                style={{
                                                    whiteSpace: "pre-wrap",
                                                    overflowWrap: "anywhere",
                                                }}
                                            >
                                                {entry.oldPurpose || "Ikke angitt"}
                                            </Table.DataCell>

                                            <Table.DataCell
                                                style={{
                                                    whiteSpace: "pre-wrap",
                                                    overflowWrap: "anywhere",
                                                }}
                                            >
                                                {entry.newPurpose}
                                            </Table.DataCell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table>
                        </div>
                    )}
                </Dialog.Body>

                <Dialog.Footer>
                    <Dialog.CloseTrigger>
                        <Button type="button" variant="secondary" size="small">
                            Lukk
                        </Button>
                    </Dialog.CloseTrigger>
                </Dialog.Footer>
            </Dialog.Popup>
        </Dialog>
    );
}