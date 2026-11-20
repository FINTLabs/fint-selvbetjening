import { PersonPlusIcon } from "@navikt/aksel-icons";
import { Button, Dialog, UNSAFE_Combobox as Combobox } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { action } from "./detail";

type ContactOptions = { id: string; name: string; mail: string }[];

export function AddTechnicalContactDialog({ contacts }: { contacts: ContactOptions }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button
          type="button"
          size="xsmall"
          variant="secondary"
          icon={<PersonPlusIcon aria-hidden />}
          disabled={contacts.length === 0}
        >
          Legg til kontakt
        </Button>
      </Dialog.Trigger>
      {open && <AddTechnicalContactPopup contacts={contacts} onSaved={() => setOpen(false)} />}
    </Dialog>
  );
}

function AddTechnicalContactPopup({ contacts, onSaved }: { contacts: ContactOptions; onSaved: () => void }) {
  const [contactId, setContactId] = useState("");
  const fetcher = useFetcher<typeof action>();
  const busy = fetcher.state !== "idle";
  const options = contacts.map(({ id, name, mail }) => ({ value: id, label: `${name} (${mail})` }));

  useEffect(() => {
    if (!busy && fetcher.data && "ok" in fetcher.data) {
      onSaved();
    }
  }, [busy, fetcher.data, onSaved]);

  return (
    <Dialog.Popup closeOnOutsideClick={!busy}>
      <Dialog.Header withClosebutton={!busy}>
        <Dialog.Title>Legg til teknisk kontakt</Dialog.Title>
      </Dialog.Header>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="add-technical-contact" />
        <input type="hidden" name="contactId" value={contactId} />
        <Dialog.Body>
          <Combobox
            label="Kontakt"
            description="Søk etter navn eller e-post."
            size="small"
            options={options}
            selectedOptions={options.filter(({ value }) => value === contactId)}
            onToggleSelected={(value, isSelected) => setContactId(isSelected ? value : "")}
            disabled={busy}
            error={fetcher.data && "error" in fetcher.data ? fetcher.data.error : undefined}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="submit" size="small" loading={busy} disabled={!contactId}>Legg til</Button>
          <Dialog.CloseTrigger>
            <Button type="button" size="small" variant="secondary" disabled={busy}>Avbryt</Button>
          </Dialog.CloseTrigger>
        </Dialog.Footer>
      </fetcher.Form>
    </Dialog.Popup>
  );
}
