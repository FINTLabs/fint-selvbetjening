import { setupServer } from "msw/node";

import { handlers } from "./handlers";

export const server = setupServer(...handlers);

let started = false;

export function ensureMockServer(
  options: { onUnhandledRequest?: "error" | "bypass" | "warn" } = {},
) {
  if (started) {
    return;
  }
  started = true;
  server.listen({
    onUnhandledRequest: options.onUnhandledRequest ?? "bypass",
  });
}
