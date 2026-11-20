import { PlusIcon } from "@navikt/aksel-icons";
import { Button, Dialog } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import type { action } from "./detail";
import { OrganisationSelect } from "./OrganisationSelect";

type OrganisationOptions = { id: string; displayName: string }[];

export function AddContactOrganisationsDialog({ organisations }: { organisations: OrganisationOptions }) {
  const [open, setOpen] = useState(false);
  const label = "Legg til organisasjon";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button
          type="button"
          size="xsmall"
          variant="secondary"
          icon={<PlusIcon aria-hidden />}
          aria-label={label}
          title={label}
          disabled={organisations.length === 0}
        >Legg til</Button>
      </Dialog.Trigger>
      {open && (
        <AddOrganisationsPopup organisations={organisations} onSaved={() => setOpen(false)} />
      )}
    </Dialog>
  );
}

function AddOrganisationsPopup({
  organisations,
  onSaved,
}: {
  organisations: OrganisationOptions;
  onSaved: () => void;
}) {
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
        <Dialog.Title>Legg til organisasjon</Dialog.Title>
      </Dialog.Header>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="add-organisations" />
        <Dialog.Body>
          <OrganisationSelect
            organisations={organisations}
            size="small"
            multiple={false}
            error={fetcher.data && "error" in fetcher.data ? fetcher.data.error : undefined}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="submit" size="small" loading={busy}>Legg til</Button>
          <Dialog.CloseTrigger>
            <Button type="button" size="small" variant="secondary" disabled={busy}>Avbryt</Button>
          </Dialog.CloseTrigger>
        </Dialog.Footer>
      </fetcher.Form>
    </Dialog.Popup>
  );
}
