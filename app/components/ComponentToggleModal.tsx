import { ExclamationmarkTriangleIcon } from "@navikt/aksel-icons";
import { Button, Heading, Modal, TextField } from "@navikt/ds-react";
import { useState } from "react";

type ComponentToggleModalProps = {
  isOpen: boolean;
  componentName: string;
  isChecked: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ComponentToggleModalContent({
  componentName,
  isChecked,
  onConfirm,
  onCancel,
}: Omit<ComponentToggleModalProps, "isOpen">) {
  const [typedName, setTypedName] = useState("");
  const isDeactivating = !isChecked;
  const canConfirm = isChecked || typedName === componentName;

  return (
    <>
      <Modal.Body>
        <Heading size="small">
          {isChecked
            ? "Er du sikker på at du vil slå på denne komponenten?"
            : "Er du sikker på at du vil slå av denne komponenten?"}
        </Heading>
        <p>
          Komponenten: <strong>{componentName}</strong>
        </p>
        {isDeactivating ? (
          <TextField
            label="Skriv inn komponentnavnet for å bekrefte"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            placeholder={componentName}
            size="small"
            autoComplete="off"
          />
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          variant="primary"
          onClick={onConfirm}
          disabled={!canConfirm}
          size="small"
        >
          Ja, jeg er sikker
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} size="small">
          Avbryt
        </Button>
      </Modal.Footer>
    </>
  );
}

export function ComponentToggleModal({
  isOpen,
  componentName,
  isChecked,
  onConfirm,
  onCancel,
}: ComponentToggleModalProps) {
  return (
    <Modal
      open={isOpen}
      header={{
        heading: "Bekreftelse",
        size: "small",
        icon: <ExclamationmarkTriangleIcon />,
      }}
      width="small"
      onClose={onCancel}
    >
      {isOpen ? (
        <ComponentToggleModalContent
          key={`${componentName}-${isChecked}`}
          componentName={componentName}
          isChecked={isChecked}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ) : null}
    </Modal>
  );
}
