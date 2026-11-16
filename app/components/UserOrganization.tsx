import { Box, Select } from "@navikt/ds-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { useSubmit } from "react-router";

import type { User } from "~/server/auth.server";

export function UserOrganization({ user }: { user: User }) {
  const submit = useSubmit();
  const [orgName, setOrgName] = useState(user.organisation?.name);

  useEffect(() => {
    setOrgName(user.organisation?.name);
  }, [user.organisation?.name]);

  const handleOrgChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setOrgName(event.target.value);
    submit(
      {
        selectedOrganization: event.target.value,
        actionType: "UPDATE_SELECTED_ORGANIZATION",
      },
      {
        method: "POST",
        action: "/",
        navigate: false,
      },
    );
  };

  if (user.organisations.length === 1) {
    return (
      <Box padding="space-8">
        <div className="flex items-center">{user.organisations[0].displayName}</div>
      </Box>
    );
  }

  if (user.organisations.length < 2) {
    return null;
  }

  return (
    <Box padding="space-8">
      <Select
        size="small"
        label="Velg organisasjon"
        hideLabel
        onChange={handleOrgChange}
        value={orgName}
      >
        {user.organisations.map((organisation) => (
          <option key={organisation.id} value={organisation.name}>
            {organisation.displayName}
          </option>
        ))}
      </Select>
    </Box>
  );
}
