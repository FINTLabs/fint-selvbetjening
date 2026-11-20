import {PencilIcon, XMarkIcon, FloppydiskIcon} from "@navikt/aksel-icons";
import {BodyShort, Box, Button, Heading, HGrid, HStack, Label, Textarea, VStack,} from "@navikt/ds-react";
import {data, Link, useFetcher} from "react-router";

import {requireUser} from "~/server/auth.server";
import {listComponents} from "~/server/components.server";
import {
    getIntegrationDetails,
    listIntegrationPurposeHistory,
    updateIntegrationPurpose,
} from "~/server/integrations.server";
import type {Route} from "./+types/details";
import {componentLabels} from "~/types/integrations";
import {HistoryDialog} from "~/routes/integrations/HistoryDialog";
import {useEffect, useState} from "react";
import {LoginStatusIcon} from "~/routes/components/LoginStatusIcon";

function requireIntegrationId(value: string | undefined): string {
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Response("Integrasjonen finnes ikke.", { status: 404 });
  }

  return value;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const integrationId = requireIntegrationId(params.integrationId);

  const integration = await getIntegrationDetails(integrationId, user);

  const [history, components] = await Promise.all([
    listIntegrationPurposeHistory(integrationId, user),
    listComponents(),
  ]);

  return {
    integration,
    history,
    components,
    organisation: user.organisation,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
    const user = await requireUser(request);
    const integrationId = requireIntegrationId(params.integrationId);
    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "");

    switch (intent) {
        case "update-purpose": {
            const description = formData.get("description");

            if (typeof description !== "string" || !description.trim()) {
                return data(
                    { ok: false, error: "Skriv inn et formål." },
                    { status: 400 },
                );
            }

            try {
                await updateIntegrationPurpose(
                    integrationId,
                    description.trim(),
                    user,
                );

                return data({ ok: true, error: null });
            } catch (error) {
                if (error instanceof Response) {
                    throw error;
                }

                console.error("Kunne ikke oppdatere formålet.", error);

                return data(
                    {
                        ok: false,
                        error: "Kunne ikke lagre formålet. Prøv igjen.",
                    },
                    { status: 500 },
                );
            }
        }

        default:
            return data(
                {
                    ok: false,
                    error: "Ukjent handling. Last siden på nytt og prøv igjen.",
                },
                { status: 400 },
            );
    }
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: `${
        loaderData?.integration.name ?? "Integrasjon"
      } - FINT Selvbetjening`,
    },
  ];
}

const dateFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Oslo",
});

export default function IntegrationDetails({
  loaderData,
}: Route.ComponentProps) {
  const { integration, history, components, organisation } = loaderData;
    const fetcher = useFetcher<typeof action>();
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const isSaving = fetcher.state !== "idle";

    useEffect(() => {
        // if (fetcher.state !== "idle" || !fetcher.data) {
        //     return;
        // }

        if (fetcher.data?.ok) {
            setIsEditing(false);
            setError(undefined);
        } else {
            setError(fetcher.data?.error ?? undefined);
        }
    }, [fetcher.state, fetcher.data]);

    function handleEdit() {
        setError(undefined);
        setIsEditing(true);
        console.log(isEditing);
    }

    function handleCancel() {
        setError(undefined);
        setIsEditing(false);
    }

  return (
    <>
      <VStack gap={"space-24"}>
        <Link to="/integrasjoner">Tilbake til integrasjoner</Link>
        <Box
          padding="space-16"
          borderColor="neutral-subtle"
          borderWidth="2"
          borderRadius="12"
        >

          <section aria-labelledby="integration-details">
            <VStack gap="space-24">
              <Heading size="medium" level="2">
                Integrasjonsdetaljer
              </Heading>

              <HGrid
                as="dl"
                columns={{ xs: 1, md: 2 }}
                gap="space-24 space-40"
                style={{ margin: 0 }}
              >
                <VStack gap="space-4" style={{ minWidth: 0 }}>
                  <Label as="dt">Integrasjons-ID</Label>
                  <BodyShort
                    as="dd"
                    style={{ margin: 0, overflowWrap: "anywhere" }}
                  >
                    {integration.id}
                  </BodyShort>
                </VStack>
                <VStack gap="space-4" style={{ minWidth: 0 }}>
                  <Label as="dt">Client ID</Label>
                  <BodyShort
                    as="dd"
                    style={{ margin: 0, overflowWrap: "anywhere" }}
                  >
                    {integration.clientId ?? "Ikke angitt"}
                  </BodyShort>
                </VStack>

                <VStack gap="space-4">
                  <Label as="dt">Opprettet</Label>
                  <BodyShort as="dd" style={{ margin: 0 }}>
                    <time dateTime={integration.createdAt}>
                      {dateFormatter.format(new Date(integration.createdAt))}
                    </time>
                  </BodyShort>
                </VStack>

                <VStack gap="space-4">
                  <Label as="dt">Sist oppdatert</Label>
                  <BodyShort as="dd" style={{ margin: 0 }}>
                    <time dateTime={integration.updatedAt}>
                      {dateFormatter.format(new Date(integration.updatedAt))}
                    </time>
                  </BodyShort>
                </VStack>

                  <VStack gap="space-4">
                      <Label as="dt">Sist logget inn (no data here yet)</Label>
                      <BodyShort as="dd" style={{ margin: 0 }}>
                          <LoginStatusIcon lastLoginTime={integration.updatedAt} />
                          <time dateTime={integration.updatedAt}>
                              {dateFormatter.format(new Date(integration.updatedAt))}
                          </time>
                      </BodyShort>
                  </VStack>

                {/*<VStack gap="space-4" style={{ minWidth: 0 }}>*/}
                {/*  <Label as="dt">Formål</Label>*/}
                {/*  <BodyShort*/}
                {/*    as="dd"*/}
                {/*    style={{*/}
                {/*      margin: 0,*/}
                {/*      whiteSpace: "pre-wrap",*/}
                {/*      overflowWrap: "anywhere",*/}
                {/*    }}*/}
                {/*  >*/}
                {/*    {integration.description}*/}
                {/*  </BodyShort>*/}
                {/*</VStack>*/}

                {/*<VStack gap="space-4">*/}
                {/*  <Label as="dt">Type</Label>*/}
                {/*  <BodyShort as="dd" style={{ margin: 0 }}>*/}
                {/*    {integration.type === "klient" ? "Klient" : "Adapter"}*/}
                {/*  </BodyShort>*/}
                {/*</VStack>*/}
              </HGrid>
            </VStack>
          </section>
        </Box>
        <VStack gap="space-24" paddingBlock="space-24">
          {/*<section aria-labelledby="description-history">*/}
          {/*  <Box*/}
          {/*    padding="space-16"*/}
          {/*    borderColor="neutral-subtle"*/}
          {/*    borderWidth="2"*/}
          {/*    borderRadius="12"*/}
          {/*    // background="neutral-soft"*/}
          {/*  >*/}
          {/*    <VStack gap="space-16">*/}
          {/*      <HStack*/}
          {/*        justify="space-between"*/}
          {/*        align="center"*/}
          {/*        wrap*/}
          {/*        gap="space-16"*/}
          {/*      >*/}
          {/*        <HStack*/}
          {/*          align="center"*/}
          {/*          gap="space-12"*/}
          {/*          wrap*/}
          {/*          style={{ paddingBottom: 32 }}*/}
          {/*        >*/}
          {/*          <Heading size="medium" level="2">*/}
          {/*            Formål*/}
          {/*          </Heading>*/}
          {/*        </HStack>*/}
          {/*        <HStack gap="space-8">*/}
          {/*          <Button*/}
          {/*            type="button"*/}
          {/*            variant="secondary"*/}
          {/*            size="small"*/}
          {/*            icon={<PencilIcon aria-hidden />}*/}
          {/*            aria-label="Rediger integrasjon"*/}
          {/*            title="Rediger integrasjon"*/}
          {/*            disabled*/}
          {/*          />*/}

          {/*            <HistoryDialog*/}
          {/*                integrationName={integration.name}*/}
          {/*                history={history}*/}
          {/*            />*/}
          {/*        </HStack>*/}
          {/*      </HStack>*/}
          {/*      <BodyShort>{integration.description}</BodyShort>*/}
          {/*    </VStack>*/}
          {/*  </Box>*/}
          {/*</section>*/}
            <section aria-labelledby="purpose-heading">
                <Box
                    padding="space-16"
                    borderColor="neutral-subtle"
                    borderWidth="2"
                    borderRadius="12"
                >
                    <fetcher.Form method="post">
                        <input
                            type="hidden"
                            name="intent"
                            value="update-purpose"
                        />

                        <VStack gap="space-16">
                            <HStack
                                justify="space-between"
                                align="center"
                                wrap
                                gap="space-16"
                            >
                                <Heading
                                    size="medium"
                                    level="2"
                                    id="purpose-heading"
                                >
                                    Formål
                                </Heading>
                                <BodyShort>{dateFormatter.format(new Date(integration.updatedAt))}</BodyShort>
                                <HStack gap="space-8">
                                    {/*{isEditing ? (*/}
                                    {/*    <>*/}
                                    {/*        <Button*/}
                                    {/*            type="submit"*/}
                                    {/*            variant="secondary"*/}
                                    {/*            size="small"*/}
                                    {/*            icon={<FloppydiskIcon aria-hidden />}*/}
                                    {/*            aria-label="Lagre formål"*/}
                                    {/*            title="Lagre formål"*/}
                                    {/*            loading={isSaving}*/}
                                    {/*            disabled={isSaving}*/}
                                    {/*        />*/}

                                    {/*        <Button*/}
                                    {/*            type="button"*/}
                                    {/*            variant="secondary"*/}
                                    {/*            size="small"*/}
                                    {/*            icon={<XMarkIcon aria-hidden />}*/}
                                    {/*            aria-label="Avbryt redigering"*/}
                                    {/*            title="Avbryt redigering"*/}
                                    {/*            onClick={handleCancel}*/}
                                    {/*            disabled={isSaving}*/}
                                    {/*        />*/}
                                    {/*    </>*/}
                                    {/*) : (*/}

                                    {!isEditing && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="small"
                                                icon={<PencilIcon aria-hidden />}
                                                aria-label="Rediger formål"
                                                title="Rediger formål"
                                                onClick={handleEdit}
                                            />

                                            <HistoryDialog
                                                integrationName={integration.name}
                                                history={history}
                                            />
                                        </>
                                    )}

                                    {/*)}*/}
                                </HStack>
                            </HStack>

                            {isEditing ? (
                                <>
                                <Textarea
                                    name="description"
                                    label="Formål"
                                    hideLabel
                                    defaultValue={integration.description}
                                    minRows={3}
                                    resize="vertical"
                                    autoFocus
                                    readOnly={isSaving}
                                    error={error}
                                />
                                <HStack gap="space-8" justify={"end"}>
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        size="small"
                                        icon={<FloppydiskIcon aria-hidden />}
                                        aria-label="Lagre formål"
                                        title="Lagre formål"
                                        loading={isSaving}
                                        disabled={isSaving}
                                    />

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="small"
                                        icon={<XMarkIcon aria-hidden />}
                                        aria-label="Avbryt redigering"
                                        title="Avbryt redigering"
                                        onClick={handleCancel}
                                        disabled={isSaving}
                                    />
                                </HStack>
                                </>
                            ) : (
                                <BodyShort
                                    style={{
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {integration.description}
                                </BodyShort>
                            )}
                        </VStack>
                    </fetcher.Form>
                </Box>
            </section>
            <section aria-labelledby="component-list">
                <Box
                    padding="space-16"
                    borderColor="neutral-subtle"
                    borderWidth="2"
                    borderRadius="12"
                >
                    <Heading size="medium" level="2">
                        Komponenter
                    </Heading>

                    {integration.components.length === 0 ? (
                        <BodyShort>Ingen komponenter</BodyShort>
                    ) : (
                        <ul style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
                            {integration.components.map((name) => (
                                <li key={name}>
                                    {componentLabels([name], components)}
                                </li>
                            ))}
                        </ul>
                    )}

                </Box>

            </section>
        </VStack>
      </VStack>
    </>
  );
}
