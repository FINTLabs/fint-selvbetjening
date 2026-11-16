import { http } from "msw";

import { MASKINPORTEN_URL } from "../config";
import { json } from "../http";

export const maskinportenHandlers = [
  http.post(`${MASKINPORTEN_URL}/clients`, () =>
    json({
      client_id: crypto.randomUUID(),
      client_orgno: "123456789",
    }),
  ),
  http.post(`${MASKINPORTEN_URL}/clients/:clientId/jwks`, () =>
    json({ keys: [] }),
  ),
];
