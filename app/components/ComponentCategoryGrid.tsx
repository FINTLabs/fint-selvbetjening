import { ChevronRightIcon } from "@navikt/aksel-icons";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  FormSummary,
  HGrid,
  HStack,
} from "@navikt/ds-react";
import type { ChangeEvent } from "react";

import {
  cardsFromSortedList,
  categoryLabel,
  type ComponentRecord,
} from "~/types/integrations";

type ComponentCategoryGridProps = {
  components: ComponentRecord[];
  checkboxName?: string;
  defaultValue?: string[];
  selectedItems?: string[];
  onToggle?: (componentName: string, isChecked: boolean) => void;
  readOnly?: boolean;
  showChevron?: boolean;
};

export function ComponentCategoryGrid({
  components,
  checkboxName,
  defaultValue,
  selectedItems,
  onToggle,
  readOnly = false,
  showChevron = false,
}: ComponentCategoryGridProps) {
  const cards = cardsFromSortedList(components);
  const selected = selectedItems ?? defaultValue ?? [];
  const isControlled = selectedItems !== undefined || Boolean(onToggle);

  return (
    <HGrid gap="space-8" columns={{ xs: 1, md: 2, lg: 3 }}>
      {cards.map((card) => {
        const selectedInCard = selected.filter((name) =>
          card.components.some((component) => component.name === name),
        );

        return (
          <FormSummary key={card.category}>
            <FormSummary.Header>
              <FormSummary.Heading level="2">
                {categoryLabel(card.category)}
              </FormSummary.Heading>
            </FormSummary.Header>
            <FormSummary.Answers>
              <FormSummary.Answer>
                <CheckboxGroup
                  hideLegend
                  legend={categoryLabel(card.category)}
                  defaultValue={
                    checkboxName && !isControlled ? selectedInCard : undefined
                  }
                  value={isControlled ? selectedInCard : checkboxName ? undefined : []}
                  onChange={isControlled || !checkboxName ? () => undefined : undefined}
                  readOnly={readOnly}
                  size="small"
                >
                  {card.components.map((component) => (
                    <HStack
                      key={component.id}
                      justify="space-between"
                      align="center"
                    >
                      <Checkbox
                        name={onToggle ? undefined : checkboxName}
                        value={component.name}
                        onChange={
                          onToggle
                            ? (event: ChangeEvent<HTMLInputElement>) => {
                                event.preventDefault();
                                onToggle(component.name, event.target.checked);
                              }
                            : undefined
                        }
                      >
                        {component.name}
                      </Checkbox>
                      {showChevron && (
                        <Button
                          type="button"
                          variant="tertiary"
                          size="small"
                          icon={<ChevronRightIcon title="Åpne komponent" />}
                        />
                      )}
                    </HStack>
                  ))}
                </CheckboxGroup>
              </FormSummary.Answer>
            </FormSummary.Answers>
          </FormSummary>
        );
      })}
    </HGrid>
  );
}
