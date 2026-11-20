import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
  Radio,
  RadioGroup,
  Textarea,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { Form } from "react-router";

import type { ActionData, CreatedState } from "./types";

export function KeyStep({
  created,
  isGenerating,
  isUploading,
  onBack,
}: {
  created: CreatedState & Pick<ActionData, "error" | "jwkDraft">;
  isGenerating: boolean;
  isUploading: boolean;
  onBack: () => void;
}) {

  const [method, setMethod] = useState<"generate" | "own">(
    created.jwkDraft ? "own" : "generate",
  );

  useEffect(() => {
    if (created.jwkDraft) {
      setMethod("own");
    }
  }, [created.jwkDraft]);

  return (
    <Form method="post">
      <input
        type="hidden"
        name="intent"
        value={method === "own" ? "upload-key" : "generate-key"}
      />
      <HiddenCreatedFields created={created} />
      <VStack gap="space-24">
        <Heading size="medium" level="2">
          Nøkkeloppsett
        </Heading>
        <RadioGroup
          legend="Hvordan vil du legge til nøkkel?"
          value={method}
          onChange={setMethod}
        >
          <Radio
            value="generate"
            description="Vi genererer et nytt nøkkelpar. Den offentlige nøkkelen registreres i Maskinporten."
          >
            Generer nøkkel for meg
          </Radio>
          <Radio value="own">Bruk egen offentlig nøkkel</Radio>
        </RadioGroup>
        {method === "own" && (
          <Textarea
            name="publicJwk"
            label="Offentlig nøkkel (JWK)"
            description="Lim inn den offentlige nøkkelen som JWK eller JWKS. Den private nøkkelen skal ikke lastes opp."
            defaultValue={created.jwkDraft ?? ""}
            minRows={8}
            error={method === "own" ? created.error : undefined}
            spellCheck={false}
          />
        )}
        {created.error && method !== "own" && (
          <LocalAlert status="error">
            <LocalAlert.Header>
              <LocalAlert.Title>Kunne ikke registrere nøkkel</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              <BodyLong>{created.error}</BodyLong>
            </LocalAlert.Content>
          </LocalAlert>
        )}
        <HStack justify="space-between">
          <Button type="button" variant="secondary" onClick={onBack}>
            Forrige
          </Button>
          <Button
            type="submit"
            loading={method === "own" ? isUploading : isGenerating}
          >
            Fortsett
          </Button>
        </HStack>
      </VStack>
    </Form>
  );
}

function HiddenCreatedFields({ created }: { created: CreatedState }) {
    return (
        <>
            <input type="hidden" name="name" value={created.input.name} />
            <input type="hidden" name="type" value={created.input.type} />
            {created.input.components.map((component) => (
                <input
                    key={component}
                    type="hidden"
                    name="components"
                    value={component}
                />
            ))}
            <input
                type="hidden"
                name="payload"
                value={JSON.stringify(created.payload)}
            />
            <input
                type="hidden"
                name="response"
                value={JSON.stringify(created.response)}
            />
            <input
                type="hidden"
                name="description"
                value={created.input.description}
            />
        </>
    );
}
