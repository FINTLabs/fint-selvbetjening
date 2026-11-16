import type { OrganisationRecord } from "~/server/organisations.server";
import { getUserByNin } from "~/server/users.server";
import { selectOrgCookie } from "~/utils/cookie";
import { HeaderProperties } from "~/utils/headerProperties";

export type User = {
  id: string;
  nin: string;
  name: string;
  firstName: string;
  lastName: string;
  mail: string;
  isAdmin: boolean;
  organisation: OrganisationRecord | null;
  organisations: OrganisationRecord[];
};

function selectedOrganisation(
  organisations: OrganisationRecord[],
  cookieValue: string | null,
): OrganisationRecord | null {
  return (
    organisations.find((organisation) => organisation.name === cookieValue) ??
    organisations[0] ??
    null
  );
}

export async function fetchMe(): Promise<User> {
  const nin = HeaderProperties.getXnin();
  if (!nin) {
    throw new Response("Du er ikke innlogget.", {
      status: 401,
      statusText: "Du er ikke innlogget.",
    });
  }

  const record = await getUserByNin(nin);
  if (!record) {
    throw new Response("Du har ikke opprettet bruker.", {
      status: 406,
      statusText: "Du har ikke opprettet bruker.",
    });
  }

  const cookieValue = await selectOrgCookie.parse(HeaderProperties.getCookie());

  return {
    id: record.id,
    nin: record.nin,
    name: `${record.firstName} ${record.lastName}`.trim(),
    firstName: record.firstName,
    lastName: record.lastName,
    mail: record.mail,
    isAdmin: record.isAdmin,
    organisation: selectedOrganisation(record.organisations, cookieValue),
    organisations: record.organisations,
  };
}

export async function requireUser(request: Request): Promise<User> {
  HeaderProperties.setProperties(request);
  return fetchMe();
}

export async function requireAdmin(request: Request): Promise<User> {
  const user = await requireUser(request);
  if (!user.isAdmin) {
    throw new Response("Du har ikke tilgang.", {
      status: 403,
      statusText: "Du har ikke tilgang.",
    });
  }
  return user;
}
