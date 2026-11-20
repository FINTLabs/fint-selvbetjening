import {BodyLong, Heading, LocalAlert, Stepper, VStack,} from "@navikt/ds-react";
import {useEffect, useState} from "react";
import {useNavigation} from "react-router";
import {requireUser} from "~/server/auth.server";
import {listEnabledComponentsForOrganisation} from "~/server/components.server";
import {createIntegration} from "~/server/integrations.server";
import {
  createMaskinportenPayload,
  generateMaskinportenKeyPair,
  type MaskinportenClient,
  type MaskinportenPayload,
  type MaskinportenPublicJwk,
  parseMaskinportenPublicJwk,
  registerMaskinportenClient,
  registerMaskinportenJwks,
} from "~/server/maskinporten.server";
import {
  type IntegrationInput,
  type IntegrationType,
  isIntegrationType,
  knownComponentNames,
} from "~/types/integrations";
import type {Route} from "./+types/new";
import type {ActionData, CreatedState} from "~/routes/integrations/new/types";
import {KeyStep} from "~/routes/integrations/new/KeyStep";
import {DetailsStep} from "~/routes/integrations/new/DetailsStep";
import {DoneStep} from "~/routes/integrations/new/DoneStep";

const STEPPER_LABEL = "Steg i opprettelsen";

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

  switch (intent) {
    case "details": {
      const components = await listEnabledComponentsForOrganisation(
          user.organisation.id,
      );

      const input: IntegrationInput = {
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        type: String(formData.get("type") ?? ""),
        components: knownComponentNames(
            formData.getAll("components").map(String),
            components,
        ),
      };

      const fieldErrors = {
        name: input.name ? undefined : "Skriv inn et navn.",
        description: input.description
            ? undefined
            : "Skriv inn en beskrivelse.",
      };

      if (fieldErrors.name || fieldErrors.description) {
        return {
          input,
          fieldErrors,
          // error: "Fyll ut navn og beskrivelse før du går videre.",
        };
      }

      if (!isIntegrationType(input.type)) {
        return {
          input,
          error: "Velg en gyldig integrasjonstype.",
        };
      }

      try {
        const payload = createMaskinportenPayload(
            input,
            components,
            user,
        );

        const response = await registerMaskinportenClient(payload);

        await createIntegration({
          name: input.name,
          description: input.description,
          type: input.type,
          components: input.components,
          clientId: response.client_id,
          organisationId: user.organisation.id,
        });

        return { input, payload, response };
      } catch (error) {
        return {
          input,
          error: error instanceof Error
              ? error.message
              : "Kunne ikke registrere klienten i Maskinporten.",
        };
      }
    }

    case "generate-key": {
      let created: CreatedState | undefined;

      try {
        created = readCreatedState(formData);

        const { publicJwk, privateKeyPem } =
            generateMaskinportenKeyPair(
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
      } catch (error) {
        return {
          ...created,
          error: error instanceof Error
              ? error.message
              : "Kunne ikke generere eller registrere nøkkelen.",
        };
      }
    }

    case "upload-key": {
      let created: CreatedState | undefined;
      const jwkDraft = String(formData.get("publicJwk") ?? "");

      try {
        created = readCreatedState(formData);

        const parsed = parseMaskinportenPublicJwk(
            jwkDraft,
            created.response.client_id,
            created.input.name,
        );

        if (!parsed.ok) {
          return {
            ...created,
            error: parsed.error,
            jwkDraft,
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
          jwkDraft,
          error: error instanceof Error
              ? error.message
              : "Kunne ikke registrere nøkkelen i Maskinporten.",
        };
      }
    }

    default:
      return {
        error: "Ukjent handling. Last siden på nytt og prøv igjen.",
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
              fieldErrors={actionData?.fieldErrors}
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

function readCreatedState(formData: FormData): CreatedState {
  return {
    input: {
      name: String(formData.get("name")),
      type: String(formData.get("type")),
      components: formData.getAll("components").map(String),
      description: String(formData.get("description")),
    },
    payload: JSON.parse(String(formData.get("payload"))) as MaskinportenPayload,
    response: JSON.parse(
      String(formData.get("response")),
    ) as MaskinportenClient,
  };
}