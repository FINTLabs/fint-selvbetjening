import { PersonGavelIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Dialog, VStack } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { action } from "./detail";

type LegalContactDialogProps = {
  contactName: string;
  organisation: {
    id: string;
    displayName: string;
    legalContactId: string | null;
    legalContactName: string | null;
  };
};

export function SetLegalContactDialog({ contactName, organisation }: LegalContactDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button type="button" size="small" variant="tertiary" icon={<PersonGavelIcon aria-hidden />}>
          Sett som juridisk kontakt
        </Button>
      </Dialog.Trigger>
      {open && (
        <LegalContactConfirmation
          contactName={contactName}
          organisation={organisation}
          onSaved={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}

function LegalContactConfirmation({
  contactName,
  organisation,
  onSaved,
}: LegalContactDialogProps & { onSaved: () => void }) {
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  const replacing = organisation.legalContactId !== null;

  useEffect(() => {
    if (!busy && fetcher.data && "ok" in fetcher.data) {
      onSaved();
    }
  }, [busy, fetcher.data, onSaved]);

  return (
    <Dialog.Popup closeOnOutsideClick={!busy}>
      <Dialog.Header withClosebutton={!busy}>
        <Dialog.Title>{replacing ? "Bytt juridisk kontakt" : "Sett som juridisk kontakt"}</Dialog.Title>
      </Dialog.Header>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="set-legal-contact" />
        <input type="hidden" name="organisationId" value={organisation.id} />
        <input type="hidden" name="expectedLegalContactId" value={organisation.legalContactId ?? ""} />
        <Dialog.Body>
          <VStack gap="space-8">
            {replacing ? (
              <BodyShort>
                Vil du erstatte <strong>{organisation.legalContactName}</strong> med{" "}
                <strong>{contactName}</strong> som juridisk kontakt for <strong>{organisation.displayName}</strong>?
              </BodyShort>
            ) : (
              <BodyShort>
                Vil du sette <strong>{contactName}</strong> som juridisk kontakt for{" "}
                <strong>{organisation.displayName}</strong>?
              </BodyShort>
            )}
            {fetcher.data && "error" in fetcher.data && (
              <BodyShort role="alert">{fetcher.data.error}</BodyShort>
            )}
          </VStack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="submit" size="small" loading={busy}>
            {replacing ? "Bytt juridisk kontakt" : "Bekreft"}
          </Button>
          <Dialog.CloseTrigger>
            <Button type="button" size="small" variant="secondary" disabled={busy}>Avbryt</Button>
          </Dialog.CloseTrigger>
        </Dialog.Footer>
      </fetcher.Form>
    </Dialog.Popup>
  );
}
