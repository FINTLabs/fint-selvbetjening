import { http } from "msw";

import { ADMIN_URL } from "../config";
import configurations from "../fixtures/configurations.json";
import { json } from "../http";

export const adminHandlers = [
  http.get(`${ADMIN_URL}/api/components/configurations`, () =>
    json(configurations),
  ),
];
