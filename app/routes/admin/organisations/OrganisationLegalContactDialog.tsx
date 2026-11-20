import { PencilIcon, PersonPlusIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Dialog, Select, VStack } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { action } from "./detail";

type LegalContactDialogProps = {
  organisation: {
    displayName: string;
    legalContactId: string | null;
    legalContactName: string | null;
  };
  contacts: { id: string; name: string; mail: string }[];
};

export function OrganisationLegalContactDialog({ organisation, contacts }: LegalContactDialogProps) {
  const [open, setOpen] = useState(false);
  const hasLegalContact = organisation.legalContactId !== null;
  const candidates = contacts.filter(({ id }) => id !== organisation.legalContactId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button
          type="button"
          size="xsmall"
          variant="secondary"
          icon={hasLegalContact ? <PencilIcon aria-hidden /> : <PersonPlusIcon aria-hidden />}
          disabled={candidates.length === 0}
        >
          {hasLegalContact ? "Endre juridisk kontakt" : "Sett juridisk kontakt"}
        </Button>
      </Dialog.Trigger>
      {open && (
        <LegalContactPopup organisation={organisation} contacts={contacts} onSaved={() => setOpen(false)} />
      )}
    </Dialog>
  );
}

function LegalContactPopup({
  organisation,
  contacts,
  onSaved,
}: LegalContactDialogProps & { onSaved: () => void }) {
  const [contactId, setContactId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [previousContact] = useState({
    id: organisation.legalContactId,
    name: organisation.legalContactName,
  });
  const candidates = contacts.filter(({ id }) => id !== previousContact.id);
  const selected = candidates.find(({ id }) => id === contactId);
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (!busy && fetcher.data && "ok" in fetcher.data) {
      onSaved();
    }
  }, [busy, fetcher.data, onSaved]);

  return (
    <Dialog.Popup closeOnOutsideClick={!busy}>
      <Dialog.Header withClosebutton={!busy}>
        <Dialog.Title>
          {confirming
            ? previousContact.id ? "Bytt juridisk kontakt" : "Bekreft juridisk kontakt"
            : "Velg juridisk kontakt"}
        </Dialog.Title>
      </Dialog.Header>
      {confirming && selected ? (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="set-legal-contact" />
          <input type="hidden" name="contactId" value={selected.id} />
          <input type="hidden" name="expectedLegalContactId" value={previousContact.id ?? ""} />
          <Dialog.Body>
            <VStack gap="space-8">
              {previousContact.id ? (
                <BodyShort>
                  Vil du erstatte <strong>{previousContact.name}</strong> med{" "}
                  <strong>{selected.name}</strong> som juridisk kontakt for <strong>{organisation.displayName}</strong>?
                </BodyShort>
              ) : (
                <BodyShort>
                  Vil du sette <strong>{selected.name}</strong> som juridisk kontakt for{" "}
                  <strong>{organisation.displayName}</strong>?
                </BodyShort>
              )}
              {fetcher.data && "error" in fetcher.data && <BodyShort role="alert">{fetcher.data.error}</BodyShort>}
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button type="submit" size="small" loading={busy}>
              {previousContact.id ? "Bytt juridisk kontakt" : "Bekreft"}
            </Button>
            <Button type="button" size="small" variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
              Tilbake
            </Button>
            <Dialog.CloseTrigger>
              <Button type="button" size="small" variant="tertiary" disabled={busy}>Avbryt</Button>
            </Dialog.CloseTrigger>
          </Dialog.Footer>
        </fetcher.Form>
      ) : (
        <>
          <Dialog.Body>
            <Select
              label="Juridisk kontakt"
              size="small"
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
            >
              <option value="">Velg et medlem</option>
              {candidates.map(({ id, name, mail }) => (
                <option key={id} value={id}>{name} ({mail})</option>
              ))}
            </Select>
          </Dialog.Body>
          <Dialog.Footer>
            <Button type="button" size="small" disabled={!selected} onClick={() => setConfirming(true)}>
              Fortsett
            </Button>
            <Dialog.CloseTrigger>
              <Button type="button" size="small" variant="secondary">Avbryt</Button>
            </Dialog.CloseTrigger>
          </Dialog.Footer>
        </>
      )}
    </Dialog.Popup>
  );
}
