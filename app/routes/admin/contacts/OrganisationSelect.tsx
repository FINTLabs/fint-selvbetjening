import { UNSAFE_Combobox as Combobox } from "@navikt/ds-react";
import { useState } from "react";

type OrganisationSelectProps = {
  organisations: Array<{
    id: string;
    displayName: string;
  }>;
  defaultSelectedIds?: string[];
  error?: string;
  size?: "medium" | "small";
  multiple?: boolean;
};

export function OrganisationSelect({
  organisations,
  defaultSelectedIds = [],
  error,
  size,
  multiple = true,
}: OrganisationSelectProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds);

  const options = organisations.map((organisation) => ({
    label: organisation.displayName,
    value: organisation.id,
  }));

  function handleToggleSelected(organisationId: string, isSelected: boolean) {
    setSelectedIds((current) => {
      if (isSelected) {
        return multiple ? [...new Set([...current, organisationId])] : [organisationId];
      }

      return current.filter((id) => id !== organisationId);
    });
  }

  return (
    <>
      <Combobox
        label={multiple ? "Organisasjoner" : "Organisasjon"}
        size={size}
        description={multiple ? "Søk og velg én eller flere organisasjoner." : "Søk og velg en organisasjon."}
        options={options}
        selectedOptions={options.filter((option) =>
          selectedIds.includes(option.value),
        )}
        onToggleSelected={handleToggleSelected}
        isMultiSelect={multiple}
        allowNewValues={false}
        disabled={organisations.length === 0}
        error={error}
      />

      {selectedIds.map((organisationId) => (
        <input
          key={organisationId}
          type="hidden"
          name="organisationIds"
          value={organisationId}
        />
      ))}
    </>
  );
}
