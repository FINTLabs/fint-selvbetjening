import {
    BodyLong,
    Button,
    HStack,
    LocalAlert,
    VStack,
} from "@navikt/ds-react";
import { Link } from "react-router";

import {
    componentLabels,
    type ComponentRecord,
} from "~/types/integrations";

import { PrivateKeySave } from "./PrivateKeySave";

export function DoneStep({
                      name,
                      type,
                      components,
                      componentOptions,
                      clientId,
                      keySource,
                      privateKeyPem,
                      onBack,
                  }: {
    name: string;
    type: string;
    components: string[];
    componentOptions: ComponentRecord[];
    clientId: string;
    keySource?: "generated" | "uploaded";
    privateKeyPem?: string;
    onBack: () => void;
}) {
    const generatedKey = keySource === "generated" && Boolean(privateKeyPem);

    return (
        <VStack gap="space-24">
            <LocalAlert status="success">
                <LocalAlert.Header>
                    <LocalAlert.Title>Integrasjonen er opprettet</LocalAlert.Title>
                </LocalAlert.Header>
                <LocalAlert.Content>
                    <BodyLong>
                        {name} ({typeLabel(type)}) er klar. Client ID: {clientId}.
                        {components.length > 0
                            ? ` Komponenter: ${componentLabels(components, componentOptions)}.`
                            : ""}
                    </BodyLong>
                </LocalAlert.Content>
            </LocalAlert>

            <LocalAlert status="warning">
                <LocalAlert.Header>
                    <LocalAlert.Title>Lagre den private nøkkelen nå</LocalAlert.Title>
                </LocalAlert.Header>
                <LocalAlert.Content>
                    <BodyLong>
                        {generatedKey
                            ? "Nøkkelen lagres ikke i databasen. Kopier eller last den ned og oppbevar den trygt. Du får den ikke vist igjen."
                            : "Den private nøkkelen ble ikke lastet opp, og den lagres ikke i databasen. Du må selv sørge for at du har den lagret."}
                    </BodyLong>
                </LocalAlert.Content>
            </LocalAlert>

            {keySource === "generated" && privateKeyPem && (
                <PrivateKeySave name={name} privateKeyPem={privateKeyPem} />
            )}

            <HStack justify="space-between">
                <Button type="button" variant="secondary" onClick={onBack}>
                    Forrige
                </Button>
                <Button as={Link} to="/integrasjoner">
                    Til integrasjoner
                </Button>
            </HStack>
        </VStack>
    );
}

function typeLabel(type: string) {
    return type === "adapter" ? "Adapter" : "Klient";
}

