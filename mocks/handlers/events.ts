import { http } from "msw";

import events from "../fixtures/events.json";
import { json } from "../http";

export const eventsHandlers = [
  http.get(
    "https://*.felleskomponent.no/events/api/:orgId/:component/:action",
    () => json(events),
  ),
  http.get("https://*.felleskomponent.no/events/api/id/:id", () => json(events)),
];
