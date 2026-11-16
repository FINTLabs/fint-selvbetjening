import { http } from "msw";

import { TEST_RUNNER_URL } from "../config";
import health from "../fixtures/basistest-health.json";
import run from "../fixtures/basistest-run.json";
import { json } from "../http";

/**
 * TestsController proxies to test-runner, rewriting
 * `/api/tests/{org}/…` → `/test-runner/{org}/…`.
 * The old portal also posted `/run` instead of `/basic`.
 */
export const testRunnerHandlers = [
  http.post(`${TEST_RUNNER_URL}/test-runner/:orgName/health`, () =>
    json(health),
  ),
  http.post(`${TEST_RUNNER_URL}/test-runner/:orgName/basic`, () => json(run)),
  http.post(`${TEST_RUNNER_URL}/test-runner/:orgName/run`, () => json(run)),
  http.post(`${TEST_RUNNER_URL}/test-runner/:orgName/auth/*`, () =>
    json(health),
  ),
];
