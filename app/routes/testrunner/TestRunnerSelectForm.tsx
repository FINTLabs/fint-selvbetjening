import { Fieldset, HGrid, Select } from "@navikt/ds-react";
import { useMemo, type ChangeEvent } from "react";

import type { Metadata } from "~/types/metadata";

export const EMPTY_PACKAGE_VALUE = "__empty__";

export type Selection = {
  domainName: string;
  packageName: string;
  resourceName: string;
};

type TestRunnerSelectFormProps = {
  metadata: Metadata[];
  selection: Selection;
  onSelectChange: (name: keyof Selection, value: string) => void;
};

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "nb"));
}

export function optionsForSelection(
  metadata: Metadata[],
  selection: Pick<Selection, "domainName" | "packageName">,
) {
  const domains = uniqueSorted(metadata.map((item) => item.domainName));
  const inDomain = selection.domainName
    ? metadata.filter((item) => item.domainName === selection.domainName)
    : [];
  const packages = uniqueSorted(inDomain.map(packageValue));
  const inPackage = selection.packageName
    ? inDomain.filter((item) => packageValue(item) === selection.packageName)
    : [];

  return {
    domains,
    packages,
    resources: uniqueSorted(inPackage.map((item) => item.resourceName)),
  };
}

export function TestRunnerSelectForm({
  metadata,
  selection,
  onSelectChange,
}: TestRunnerSelectFormProps) {
  const options = useMemo(
    () => optionsForSelection(metadata, selection),
    [metadata, selection],
  );

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onSelectChange(event.target.name as keyof Selection, event.target.value);
  }

  return (
    <form>
      <Fieldset legend="Velg ressurs">
        <HGrid columns={{ xs: 1, sm: 3 }} gap="space-16">
          <Select
            name="domainName"
            label="Domene"
            value={selection.domainName}
            onChange={handleChange}
          >
            <option value="">Velg domene</option>
            {options.domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </Select>
          <Select
            name="packageName"
            label="Pakke"
            value={selection.packageName}
            onChange={handleChange}
            disabled={!selection.domainName}
          >
            <option value="">Velg pakke</option>
            {options.packages.map((packageName) => (
              <option key={packageName} value={packageName}>
                {packageLabel(packageName)}
              </option>
            ))}
          </Select>
          <Select
            name="resourceName"
            label="Ressurs"
            value={selection.resourceName}
            onChange={handleChange}
            disabled={!selection.domainName || !selection.packageName}
          >
            <option value="">Velg ressurs</option>
            {options.resources.map((resource) => (
              <option key={resource} value={resource}>
                {resource}
              </option>
            ))}
          </Select>
        </HGrid>
      </Fieldset>
    </form>
  );
}

function packageValue(item: Metadata): string {
  return item.packageName ?? EMPTY_PACKAGE_VALUE;
}

function packageLabel(value: string): string {
  return value === EMPTY_PACKAGE_VALUE ? "—" : value;
}
