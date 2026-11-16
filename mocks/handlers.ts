import { adminHandlers } from "./handlers/admin";
import { eventsHandlers } from "./handlers/events";
import { linkWalkerHandlers } from "./handlers/link-walker";
import { maskinportenHandlers } from "./handlers/maskinporten";
import { testRunnerHandlers } from "./handlers/test-runner";

export const handlers = [
  ...testRunnerHandlers,
  ...linkWalkerHandlers,
  ...eventsHandlers,
  ...adminHandlers,
  ...maskinportenHandlers,
];
