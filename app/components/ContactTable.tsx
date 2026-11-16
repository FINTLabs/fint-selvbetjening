import type { ReactNode } from "react";
import {
  BodyLong,
  Heading,
  HStack,
  LocalAlert,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";

import type { UserRecord } from "~/server/users.server";

type ContactTableProps = {
  contacts: UserRecord[];
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  showAdmin?: boolean;
  headerAction?: ReactNode;
};

export function ContactTable({
  contacts,
  title,
  emptyTitle,
  emptyDescription,
  showAdmin = false,
  headerAction,
}: ContactTableProps) {
  return (
    <VStack gap="space-16" paddingBlock="space-24">
      <HStack justify="space-between" align="center" wrap>
        <Heading size="large">{title}</Heading>
        {headerAction}
      </HStack>

      {contacts.length === 0 ? (
        <LocalAlert status="announcement">
          <LocalAlert.Header>
            <LocalAlert.Title>{emptyTitle}</LocalAlert.Title>
          </LocalAlert.Header>
          <LocalAlert.Content>
            <BodyLong>{emptyDescription}</BodyLong>
          </LocalAlert.Content>
        </LocalAlert>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Organisasjon</Table.HeaderCell>
              {showAdmin ? (
                <Table.HeaderCell scope="col">Admin</Table.HeaderCell>
              ) : null}
              <Table.HeaderCell scope="col">E-post</Table.HeaderCell>
              <Table.HeaderCell scope="col">Mobil</Table.HeaderCell>
              <Table.HeaderCell scope="col">NIN</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {contacts.map((contact) => (
              <Table.Row key={contact.id}>
                <Table.HeaderCell scope="row">
                  {contact.firstName} {contact.lastName}
                </Table.HeaderCell>
                <Table.DataCell>
                  {contact.organisations.length > 0
                    ? contact.organisations
                        .map((organisation) => organisation.displayName)
                        .join(", ")
                    : "—"}
                </Table.DataCell>
                {showAdmin ? (
                  <Table.DataCell>
                    {contact.isAdmin ? (
                      <Tag variant="info" size="small">
                        Admin
                      </Tag>
                    ) : (
                      "—"
                    )}
                  </Table.DataCell>
                ) : null}
                <Table.DataCell>{contact.mail}</Table.DataCell>
                <Table.DataCell>{contact.mobile ?? "—"}</Table.DataCell>
                <Table.DataCell>{contact.nin}</Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </VStack>
  );
}
