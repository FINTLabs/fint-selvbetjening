import { http } from "msw";

import { METADATA_URL } from "../config";
import metadata from "../fixtures/metadata.json";
import { json } from "../http";

export const metadataHandlers = [
  http.get(METADATA_URL, () => json(metadata)),
  http.get(`${METADATA_URL}/`, () => json(metadata)),
  http.get(`${METADATA_URL}/:domain/:package`, ({ params }) => {
    const items = metadata.filter(
      (item) =>
        item.domainName === params.domain &&
        item.packageName === params.package,
    );
    return json(items);
  }),
];
