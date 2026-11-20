import { TextField } from "@navikt/ds-react";

export function readContactFields(formData: FormData) {
  return {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    mail: String(formData.get("mail") ?? "").trim(),
    nin: String(formData.get("nin") ?? "").trim(),
    mobile: String(formData.get("mobile") ?? "").trim(),
  };
}

export type ContactFieldValues = ReturnType<typeof readContactFields>;
type RequiredContactField = "firstName" | "lastName" | "mail" | "nin";

export type ContactFieldErrors = Partial<Record<RequiredContactField, string>>;

export function getContactFieldErrors(values: ContactFieldValues): ContactFieldErrors {
    const errors: ContactFieldErrors = {};

    if (!values.firstName) errors.firstName = "Skriv inn fornavn.";
    if (!values.lastName) errors.lastName = "Skriv inn etternavn.";
    if (!values.mail) errors.mail = "Skriv inn e-postadresse.";
    if (!values.nin) errors.nin = "Skriv inn fødselsnummer.";

    return errors;
}

export function ContactFields({ values, errors, readOnlyNin = false }: {
    values?: Partial<ContactFieldValues>;
    errors?: ContactFieldErrors;
    readOnlyNin?: boolean;
}) {
    return (
        <>
            <TextField
                name="firstName"
                label="Fornavn"
                size="small"
                defaultValue={values?.firstName}
                autoComplete="given-name"
                aria-required
                error={errors?.firstName}
            />
            <TextField
                name="lastName"
                label="Etternavn"
                size="small"
                defaultValue={values?.lastName}
                autoComplete="family-name"
                aria-required
                error={errors?.lastName}
            />
            <TextField
                name="mail"
                label="E-post"
                size="small"
                type="email"
                defaultValue={values?.mail}
                autoComplete="email"
                aria-required
                error={errors?.mail}
            />
            <TextField
                name="nin"
                label="Fødselsnummer"
                size="small"
                defaultValue={values?.nin}
                autoComplete="off"
                aria-required={!readOnlyNin}
                readOnly={readOnlyNin}
                error={errors?.nin}
            />
            <TextField
                name="mobile"
                label="Mobil"
                size="small"
                defaultValue={values?.mobile}
                autoComplete="tel"
            />
        </>
    );
}
