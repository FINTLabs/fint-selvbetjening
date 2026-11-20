import type {
    MaskinportenClient,
    MaskinportenPayload,
    MaskinportenPublicJwk,
} from "~/server/maskinporten.server";
import type { IntegrationInput } from "~/types/integrations";

export type CreatedState = {
    input: IntegrationInput;
    payload: MaskinportenPayload;
    response: MaskinportenClient;
};

export type ActionData = Partial<CreatedState> & {
    publicJwk?: MaskinportenPublicJwk;
    privateKeyPem?: string;
    keySource?: "generated" | "uploaded";
    error?: string;
    jwkDraft?: string;
    fieldErrors?: {
        name?: string;
        description?: string;
    };
};