import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";

import { metadataHandlers } from "../mocks/handlers/metadata";
import { ensureMockServer, server } from "../mocks/node";

beforeAll(() => {
  ensureMockServer({ onUnhandledRequest: "error" });
  // Keep metadata out of the shared handlers so a real local catalog on
  // :8080 is not shadowed when Maskinporten starts MSW in the app.
  server.use(...metadataHandlers);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  server.use(...metadataHandlers);
});

afterAll(() => server.close());

export { server };
