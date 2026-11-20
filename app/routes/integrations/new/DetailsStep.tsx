import {
  BodyLong,
  Button,
  Heading,
  HStack,
  LocalAlert,
  Radio,
  RadioGroup,
  Textarea,
  TextField,
  VStack,
} from "@navikt/ds-react";
import { Form, Link } from "react-router";
import type { ActionData } from "./types";
import { ComponentCategoryGrid } from "~/components/ComponentCategoryGrid";
import type {
  ComponentRecord,
  IntegrationInput,
  IntegrationType,
} from "~/types/integrations";
import {useState} from "react";

const DEFAULT_TYPE: IntegrationType = "klient";

export function DetailsStep({
  input,
  fieldErrors,
  components,
  created,
  error,
  isSubmitting,
  onNext,
}: {
  input?: IntegrationInput;
  fieldErrors?: ActionData["fieldErrors"];
  components: ComponentRecord[];
  created: boolean;
  error?: string;
  isSubmitting: boolean;
  onNext: () => void;
}) {
  const [name, setName] = useState(input?.name ?? "");
  const [description, setDescription] = useState(input?.description ?? "");
  const [touched, setTouched] = useState({
    name: false,
    description: false,
  });

  const nameError = name.trim() ? undefined : "Skriv inn et navn.";
  const descriptionError = description.trim()
      ? undefined
      : "Skriv inn en beskrivelse.";

  const hasErrors = Boolean(nameError || descriptionError);

  return (
      <Form
          method="post"
          noValidate
          onSubmit={(event) => {
            if (hasErrors || isSubmitting) {
              event.preventDefault();
              setTouched({ name: true, description: true });
            }
          }}
      >
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
              error={touched.name || fieldErrors?.name ? nameError : undefined}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched((previous) => ({ ...previous, name: true }))}
              autoComplete="off"
              htmlSize={32}
              readOnly={created}
          />

          <Textarea
              name="description"
              label="Formål"
              description="Beskriv hva integrasjonen skal brukes til."
              minRows={3}
              readOnly={created}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => setTouched((previous) => ({ ...previous, description: true }))}
              error={
                touched.description || fieldErrors?.description
                    ? descriptionError
                    : undefined
              }
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
            <Button type="button" onClick={onNext} disabled={hasErrors || isSubmitting} size={"small"}>
              Neste
            </Button>
          ) : (
            <Button type="submit" loading={isSubmitting} disabled={hasErrors || isSubmitting} size={"small"}>
              Neste
            </Button>
          )}
        </HStack>
      </VStack>
    </Form>
  );
}
