import { DownloadIcon, FilesIcon } from "@navikt/aksel-icons";
import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
  Radio,
  RadioGroup,
  Stepper,
  Textarea,
  TextField,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { Form, Link, useNavigation } from "react-router";

import { ComponentCategoryGrid } from "~/components/ComponentCategoryGrid";
import { requireUser } from "~/server/auth.server";
import { listEnabledComponentsForOrganisation } from "~/server/components.server";
import { createIntegration } from "~/server/integrations.server";
import {
  createMaskinportenPayload,
  generateMaskinportenKeyPair,
  parseMaskinportenPublicJwk,
  registerMaskinportenClient,
  registerMaskinportenJwks,
  type MaskinportenClient,
  type MaskinportenPayload,
  type MaskinportenPublicJwk,
} from "~/server/maskinporten.server";
import {
  componentLabels,
  isIntegrationType,
  knownComponentNames,
  type ComponentRecord,
  type IntegrationType,
} from "~/types/integrations";
import type { Route } from "./+types/new";

const DEFAULT_TYPE: IntegrationType = "klient";
const STEPPER_LABEL = "Steg i opprettelsen";

type CreatedState = {
  input: { name: string; type: string; components: string[] };
  payload: MaskinportenPayload;
  response: MaskinportenClient;
};

type ActionData = Partial<CreatedState> & {
  publicJwk?: MaskinportenPublicJwk;
  privateKeyPem?: string;
  keySource?: "generated" | "uploaded";
  error?: string;
  jwkDraft?: string;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ny integrasjon - FINT Selvbetjening" },
    { name: "description", content: "Opprett en ny integrasjon" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return {
    components: user.organisation
      ? await listEnabledComponentsForOrganisation(user.organisation.id)
      : [],
    hasOrganisation: Boolean(user.organisation),
  };
}

export async function action({
  request,
}: Route.ActionArgs): Promise<ActionData> {
  const user = await requireUser(request);
  if (!user.organisation) {
    return {
      error: "Du er ikke tilknyttet en organisasjon.",
    };
  }
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "details");

  if (intent === "generate-key" || intent === "upload-key") {
    const created = readCreatedState(formData);

    try {
      if (intent === "generate-key") {
        const { publicJwk, privateKeyPem } = generateMaskinportenKeyPair(
          created.response.client_id,
          created.input.name,
        );
        await registerMaskinportenJwks(
          created.response.client_id,
          publicJwk,
        );
        return {
          ...created,
          publicJwk,
          privateKeyPem,
          keySource: "generated",
        };
      }

      const parsed = parseMaskinportenPublicJwk(
        String(formData.get("publicJwk") ?? ""),
        created.response.client_id,
        created.input.name,
      );

      if (!parsed.ok) {
        return {
          ...created,
          error: parsed.error,
          jwkDraft: String(formData.get("publicJwk") ?? ""),
        };
      }

      await registerMaskinportenJwks(
        created.response.client_id,
        parsed.jwk,
      );
      return {
        ...created,
        publicJwk: parsed.jwk,
        keySource: "uploaded",
      };
    } catch (error) {
      return {
        ...created,
        error:
          error instanceof Error
            ? error.message
            : "Kunne ikke registrere nøkkelen i Maskinporten.",
        jwkDraft: String(formData.get("publicJwk") ?? ""),
      };
    }
  }

  const components = await listEnabledComponentsForOrganisation(
    user.organisation.id,
  );
  const input = {
    name: String(formData.get("name")),
    type: String(formData.get("type")),
    components: knownComponentNames(
      formData.getAll("components").map(String),
      components,
    ),
  };

  try {
    const payload = createMaskinportenPayload(input, components, user);
    const response = await registerMaskinportenClient(payload);

    if (isIntegrationType(input.type)) {
      await createIntegration({
        name: input.name,
        type: input.type,
        components: input.components,
        clientId: response.client_id,
        organisationId: user.organisation.id,
      });
    }

    return { input, payload, response };
  } catch (error) {
    return {
      input,
      error:
        error instanceof Error
          ? error.message
          : "Kunne ikke registrere klienten i Maskinporten.",
    };
  }
}

export default function NewIntegration({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const submittingIntent =
    navigation.state === "submitting"
      ? String(navigation.formData?.get("intent") ?? "details")
      : null;
  const created = Boolean(actionData?.response?.client_id);
  const keyRegistered = Boolean(actionData?.publicJwk) && !actionData?.error;
  const [userStep, setUserStep] = useState<number | null>(null);
  const [keyStepDone, setKeyStepDone] = useState(false);

  const activeStep = userStep ?? 1;
  const input = actionData?.input;
  const components = loaderData.components;

  useEffect(() => {
    if (created && userStep === null) {
      setUserStep(2);
    }
  }, [created, userStep]);

  useEffect(() => {
    if (keyRegistered) {
      setKeyStepDone(true);
      setUserStep(3);
    }
  }, [keyRegistered]);

  function goToStep(step: number) {
    if (step <= 1) {
      setUserStep(1);
      return;
    }
    if (step === 2 && created) {
      setUserStep(2);
      return;
    }
    if (step === 3 && keyStepDone) {
      setUserStep(3);
    }
  }

  if (!loaderData.hasOrganisation) {
    return (
      <VStack gap="space-16" paddingBlock="space-24">
        <Heading size="large">Ny integrasjon</Heading>
        <LocalAlert status="announcement">
          <LocalAlert.Header>
            <LocalAlert.Title>Ingen organisasjon</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>Du er ikke tilknyttet en organisasjon.</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      </VStack>
    );
  }

  return (
    <VStack gap="space-24" paddingBlock="space-24">
      <Heading size="large">Ny integrasjon</Heading>

      <Stepper
        aria-label={STEPPER_LABEL}
        activeStep={activeStep}
        onStepChange={goToStep}
        orientation="horizontal"
      >
        <Stepper.Step as="button" type="button" completed={created}>
          Detaljer
        </Stepper.Step>
        <Stepper.Step
          as="button"
          type="button"
          completed={keyStepDone}
          interactive={created}
        >
          Nøkkel
        </Stepper.Step>
        <Stepper.Step as="button" type="button" interactive={keyStepDone}>
          Ferdig
        </Stepper.Step>
      </Stepper>

      {activeStep === 1 && (
        <DetailsStep
          input={input}
          components={components}
          created={created}
          error={actionData?.error}
          isSubmitting={submittingIntent === "details"}
          onNext={() => goToStep(2)}
        />
      )}

      {activeStep === 2 &&
        actionData?.input &&
        actionData.payload &&
        actionData.response && (
        <KeyStep
          created={{
            input: actionData.input,
            payload: actionData.payload,
            response: actionData.response,
            error: actionData.error,
            jwkDraft: actionData.jwkDraft,
          }}
          isGenerating={submittingIntent === "generate-key"}
          isUploading={submittingIntent === "upload-key"}
          onBack={() => goToStep(1)}
        />
      )}

      {activeStep === 3 && actionData?.input && actionData.response && (
        <DoneStep
          name={actionData.input.name}
          type={actionData.input.type}
          components={actionData.input.components}
          componentOptions={components}
          clientId={actionData.response.client_id}
          keySource={actionData.keySource}
          privateKeyPem={actionData.privateKeyPem}
          onBack={() => goToStep(2)}
        />
      )}
    </VStack>
  );
}

function DetailsStep({
  input,
  components,
  created,
  error,
  isSubmitting,
  onNext,
}: {
  input?: { name: string; type: string; components: string[] };
  components: ComponentRecord[];
  created: boolean;
  error?: string;
  isSubmitting: boolean;
  onNext: () => void;
}) {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value="details" />
      <VStack gap="space-24">
        {error && !created && (
          <LocalAlert status="error">
            <LocalAlert.Header>
              <LocalAlert.Title>Kunne ikke opprette klient</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              <BodyLong>{error}</BodyLong>
            </LocalAlert.Content>
          </LocalAlert>
        )}

        <TextField
          name="name"
          label="Navn"
          defaultValue={input?.name}
          autoComplete="off"
          htmlSize={32}
          readOnly={created}
        />

        <RadioGroup
          legend="Type"
          name="type"
          defaultValue={input?.type ?? DEFAULT_TYPE}
          readOnly={created}
        >
          <Radio value="klient">Klient</Radio>
          <Radio value="adapter">Adapter</Radio>
        </RadioGroup>

        {components.length === 0 ? (
          <LocalAlert status="warning">
            <LocalAlert.Header>
              <LocalAlert.Title>Ingen komponenter er slått på</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              <BodyLong>
                Slå på komponenter under{" "}
                <Link to="/komponenter">Komponenter</Link> før du oppretter en
                integrasjon.
              </BodyLong>
            </LocalAlert.Content>
          </LocalAlert>
        ) : (
          <VStack gap="space-8">
            <Heading size="small" level="2">
              Komponenter
            </Heading>
            <ComponentCategoryGrid
              components={components}
              checkboxName="components"
              defaultValue={input?.components}
              readOnly={created}
              showChevron
            />
          </VStack>
        )}

        <HStack justify="end">
          {created ? (
            <Button type="button" onClick={onNext}>
              Neste
            </Button>
          ) : (
            <Button type="submit" loading={isSubmitting}>
              Neste
            </Button>
          )}
        </HStack>
      </VStack>
    </Form>
  );
}

function KeyStep({
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
    </>
  );
}

function DoneStep({
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

function PrivateKeySave({
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

function readCreatedState(formData: FormData): CreatedState {
  return {
    input: {
      name: String(formData.get("name")),
      type: String(formData.get("type")),
      components: formData.getAll("components").map(String),
    },
    payload: JSON.parse(String(formData.get("payload"))) as MaskinportenPayload,
    response: JSON.parse(
      String(formData.get("response")),
    ) as MaskinportenClient,
  };
}

function typeLabel(type: string) {
  return type === "adapter" ? "Adapter" : "Klient";
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
