import { PersonMinusIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Dialog, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";

import type { action } from "./detail";

type RemoveTechnicalContactDialogProps = {
  contact: { id: string; name: string };
  organisationName: string;
  isLegalContact: boolean;
};

export function RemoveTechnicalContactDialog({
  contact,
  organisationName,
  isLegalContact,
}: RemoveTechnicalContactDialogProps) {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : undefined;

  return (
    <Dialog>
      <Dialog.Trigger>
        <Button
          type="button"
          size="small"
          variant="tertiary"
          aria-label={`Fjern ${contact.name}`}
          icon={<PersonMinusIcon aria-hidden />}
          disabled={isLegalContact}
          title={isLegalContact ? "Bytt juridisk kontakt før du fjerner medlemskapet." : undefined}
        >
          Fjern
        </Button>
      </Dialog.Trigger>
      <Dialog.Popup closeOnOutsideClick={!busy}>
        <Dialog.Header withClosebutton={!busy}>
          <Dialog.Title>Fjern teknisk kontakt</Dialog.Title>
        </Dialog.Header>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="remove-technical-contact" />
          <input type="hidden" name="contactId" value={contact.id} />
          <Dialog.Body>
            <VStack gap="space-8">
              <BodyShort>
                Vil du fjerne <strong>{contact.name}</strong> som teknisk kontakt for{" "}
                <strong>{organisationName}</strong>?
              </BodyShort>
              {error && <BodyShort role="alert">{error}</BodyShort>}
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button type="submit" size="small" data-color="danger" loading={busy}>
              Fjern kontakt
            </Button>
            <Dialog.CloseTrigger>
              <Button type="button" size="small" variant="secondary" disabled={busy}>Avbryt</Button>
            </Dialog.CloseTrigger>
          </Dialog.Footer>
        </fetcher.Form>
      </Dialog.Popup>
    </Dialog>
  );
}
