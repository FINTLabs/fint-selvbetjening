import { http } from "msw";

import { LINK_WALKER_URL } from "../config";
import walker from "../fixtures/walker.json";
import { json } from "../http";

export const linkWalkerHandlers = [
  http.get(`${LINK_WALKER_URL}/link-walker/tasks/:orgName`, () => json(walker)),
  http.all(`${LINK_WALKER_URL}/api/tests/:orgName/links/*`, () => json(walker)),
];
