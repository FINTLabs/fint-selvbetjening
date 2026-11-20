import { Tag } from "@navikt/ds-react";
import type { IntegrationType } from "~/types/integrations";

export function IntegrationTypeTag({ type }: { type: IntegrationType }) {
  return (
    <Tag size="small" variant="moderate" data-color={type === "klient" ? "info" : "neutral"}>
      {type === "klient" ? "Klient" : "Adapter"}
    </Tag>
  );
}
