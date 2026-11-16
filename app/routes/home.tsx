import { BodyLong, Heading, HStack, List, Tag, VStack } from "@navikt/ds-react";
import { useRouteLoaderData } from "react-router";

import type { Route as RootRoute } from "../+types/root";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FINT Selvbetjening" },
    { name: "description", content: "Selvbetjening for FINT" },
  ];
}

const remaining = [
  "Ressurser",
  "Basistest",
  "Hendelseslogg",
  "tilgang styring",
  "admin:tools - needed?",
  "contacts new routine ?? who adds what",
  "API endpoints security",
    "Types of users / permissons / legal / technical ??",
    "Personal numbers: encript ??",
    "Instead of reports, set up a notification system for users"
];

export default function Home() {
  const { user } = useRouteLoaderData("root") as RootRoute.ComponentProps["loaderData"];

  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <Heading size="large">Velkommen</Heading>
      <HStack gap="space-8" align="center" wrap>
        <BodyLong>Bruker: {user?.name ?? "—"}</BodyLong>
        {user?.isAdmin ? (
          <Tag variant="info" size="small">
            Admin
          </Tag>
        ) : null}
      </HStack>
      <BodyLong>
        Organisasjon: {user?.organisation?.displayName ?? "—"}
      </BodyLong>
      <List>
        {remaining.map((item) => (
          <List.Item key={item}>{item}</List.Item>
        ))}
      </List>
    </VStack>
  );
}
