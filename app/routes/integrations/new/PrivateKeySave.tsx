import { DownloadIcon, FilesIcon } from "@navikt/aksel-icons";
import {
    Button,
    HStack,
    Textarea,
    VStack,
} from "@navikt/ds-react";
import { useState } from "react";

export function PrivateKeySave({
                            name,
                            privateKeyPem,
                        }: {
    name: string;
    privateKeyPem: string;
}) {
    const [copied, setCopied] = useState(false);

    async function copyKey() {
        await navigator.clipboard.writeText(privateKeyPem);
        setCopied(true);
    }

    function downloadKey() {
        const blob = new Blob([privateKeyPem], { type: "application/x-pem-file" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${keyFileName(name)}.pem`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <VStack gap="space-8">
            <Textarea
                label="Privat nøkkel"
                value={privateKeyPem}
                readOnly
                minRows={8}
                spellCheck={false}
            />
            <HStack gap="space-8">
                <Button
                    type="button"
                    variant="secondary"
                    icon={<FilesIcon aria-hidden />}
                    onClick={() => void copyKey()}
                >
                    {copied ? "Kopiert" : "Kopier nøkkel"}
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    icon={<DownloadIcon aria-hidden />}
                    onClick={downloadKey}
                >
                    Last ned
                </Button>
            </HStack>
        </VStack>
    );
}

function keyFileName(value: string) {
    return (
        value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 32) || "integrasjon"
    );
}