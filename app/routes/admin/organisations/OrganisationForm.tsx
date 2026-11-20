import { PersonPlusIcon } from "@navikt/aksel-icons";
import {
  BodyLong,
  BodyShort,
  Box,
  Button,
  Heading,
  HStack,
  Link as AkselLink,
  Select,
  TextField,
  VStack,
} from "@navikt/ds-react";
import { Form, Link, useNavigation } from "react-router";

export function readOrganisationForm(formData: FormData, mode: "create" | "edit") {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    displayName: String(formData.get("displayName") ?? "").trim(),
    orgNumber: String(formData.get("orgNumber") ?? "").trim(),
    primaryAssetId: mode === "create" ? String(formData.get("primaryAssetId") ?? "").trim() : "",
    legalContactId: String(formData.get("legalContactId") ?? ""),
  };

  const errors: Partial<Record<keyof typeof values, string>> = {};
  if (!values.displayName) errors.displayName = "Skriv inn visningsnavn.";
  if (!values.orgNumber) errors.orgNumber = "Skriv inn organisasjonsnummer.";

  if (mode === "create") {
    const domain = values.primaryAssetId;
    if (!domain) {
      errors.primaryAssetId = "Skriv inn domenenavn.";
    } else if (
      domain.length > 253 ||
      domain.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
    ) {
      errors.primaryAssetId = "Skriv inn et gyldig domenenavn, for eksempel rfk.no.";
    }
  } else if (!values.name) {
    errors.name = "Skriv inn kortnavn.";
  }

  return { values, errors };
}

type OrganisationFormValues = ReturnType<typeof readOrganisationForm>["values"];

export type OrganisationFormActionData = {
  values: OrganisationFormValues;
  errors?: ReturnType<typeof readOrganisationForm>["errors"];
  saveError?: string;
};

type OrganisationFormProps = Pick<OrganisationFormActionData, "errors" | "saveError"> & {
  mode: "create" | "edit";
  contacts?: { id: string; name: string; mail: string }[];
  cancelTo?: string;
  values?: Omit<OrganisationFormValues, "primaryAssetId"> & {
    primaryAssetId: string | null;
  };
};

export function OrganisationForm({
  mode,
  contacts = [],
  cancelTo = "/admin/organisasjoner",
  values,
  errors,
  saveError,
}: OrganisationFormProps) {
  const creating = mode === "create";
  const navigation = useNavigation();

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <Heading size="large">{creating ? "Ny organisasjon" : "Rediger organisasjon"}</Heading>

      {saveError && <BodyLong role="alert">{saveError}</BodyLong>}

      <Form method="post">
        <VStack gap="space-24">
          <Box
            borderRadius="12"
            borderWidth="1"
            borderColor="neutral-subtle"
            padding="space-24"
          >
            <VStack gap={creating ? "space-4" : "space-16"}>
              <TextField
                name="displayName"
                size="small"
                label={creating ? "Vist navn" : "Visningsnavn"}
                defaultValue={values?.displayName}
                autoComplete="off"
                aria-required
                error={errors?.displayName}
              />
              {!creating && (
                <TextField
                  name="name"
                  size="small"
                  label="Kortnavn"
                  description="Teknisk navn, for eksempel jennifer_test"
                  defaultValue={values?.name}
                  autoComplete="off"
                  aria-required
                  error={errors?.name}
                />
              )}
              <TextField
                name="orgNumber"
                size="small"
                label="Organisasjonsnummer"
                defaultValue={values?.orgNumber}
                autoComplete="off"
                aria-required
                error={errors?.orgNumber}
              />
              <TextField
                name={creating ? "primaryAssetId" : undefined}
                size="small"
                label={creating ? "Domenenavn (f.eks. rfk.no)" : "Domenenavn"}
                defaultValue={values?.primaryAssetId ?? ""}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-required={creating}
                readOnly={!creating}
                error={errors?.primaryAssetId}
              />
              {creating ? (
                <VStack gap="space-4" align="start">
                  <Heading level="2" size="xsmall">Juridisk kontakt</Heading>
                  <BodyShort>Ingen valgt</BodyShort>
                  <Box marginBlock="space-16">
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      icon={<PersonPlusIcon aria-hidden />}
                      aria-disabled="true"
                    >
                      Velg juridisk kontakt
                    </Button>
                  </Box>
                </VStack>
              ) : (
                <>
                  <Select
                    name="legalContactId"
                    size="small"
                    label="Juridisk kontakt"
                    description="Velg et medlem av organisasjonen."
                    disabled={contacts.length === 0}
                    defaultValue={values?.legalContactId ?? ""}
                    error={errors?.legalContactId}
                  >
                    <option value="">Ingen endring</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.mail})
                      </option>
                    ))}
                  </Select>
                  {contacts.length === 0 && (
                    <BodyLong>
                      Legg til minst ett medlem i <AkselLink as={Link} to="/admin/kontakter">Kontakter</AkselLink> før du tildeler en juridisk kontakt.
                    </BodyLong>
                  )}
                </>
              )}
            </VStack>
          </Box>
          <HStack gap="space-8" justify="end" wrap>
            <Button
              type="submit"
              size="small"
              loading={navigation.state === "submitting"}
            >
              {creating ? "Legg til organisasjon" : "Lagre"}
            </Button>
            <Button as={Link} to={cancelTo} variant="secondary" size="small">
              Avbryt
            </Button>
          </HStack>
        </VStack>
      </Form>
    </VStack>
  );
}
