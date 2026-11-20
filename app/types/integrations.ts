export const INTEGRATION_TYPES = ["klient", "adapter"] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export type ComponentRecord = {
  id: string;
  name: string;
  description: string;
  category: string;
  basePath: string;
};

export type IntegrationInput = {
  name: string;
  description: string;
  type: string;
  components: string[];
};

export type Integration = {
  id: string;
  name: string;
  description: string;
  type: IntegrationType;
  components: string[];
  clientId?: string;
};

export function isIntegrationType(value: string): value is IntegrationType {
  return INTEGRATION_TYPES.includes(value as IntegrationType);
}

export function knownComponentNames(
  selected: string[],
  components: ComponentRecord[],
): string[] {
  const names = new Set(components.map((component) => component.name));
  return selected.filter((name) => names.has(name));
}

export function componentLabels(
  names: string[],
  components: ComponentRecord[],
): string {
  return names
    .map(
      (name) =>
        components.find((component) => component.name === name)?.description ??
        name,
    )
    .join(", ");
}

const CATEGORY_LABELS: Record<string, string> = {
  okonomi: "Økonomi",
};

export function categoryLabel(category: string) {
  return (
    CATEGORY_LABELS[category] ??
    category.charAt(0).toUpperCase() + category.slice(1)
  );
}

export function cardsFromSortedList(components: ComponentRecord[]) {
  const cards: { category: string; components: ComponentRecord[] }[] = [];

  for (const component of components) {
    const current = cards.at(-1);
    if (current?.category === component.category) {
      current.components.push(component);
    } else {
      cards.push({ category: component.category, components: [component] });
    }
  }

  return cards;
}
