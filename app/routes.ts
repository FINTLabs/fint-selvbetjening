import {
  type RouteConfig,
  index,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  ...prefix("integrasjoner", [
    index("routes/integrations/list.tsx"),
    route("ny", "routes/integrations/new.tsx"),
    route(":integrationId", "routes/integrations/details.tsx"),
  ]),

  route("komponenter", "routes/components/list.tsx"),
  route("kontakter", "routes/contacts/list.tsx"),

  ...prefix("linkwalker", [
    index("routes/linkwalker/route.tsx"),
    route("broken", "routes/linkwalker_.broken/route.tsx"),
  ]),

  route("testrunner", "routes/testrunner/list.tsx"),

  route("admin", "routes/admin/layout.tsx", [
    index("routes/admin/index.tsx"),
    ...prefix("kontakter", [
      index("routes/admin/contacts/list.tsx"),
      route("ny", "routes/admin/contacts/new.tsx"),
      route(":contactId", "routes/admin/contacts/detail.tsx"),
      route(":contactId/rediger", "routes/admin/contacts/edit.tsx"),
    ]),
    ...prefix("organisasjoner", [
      index("routes/admin/organisations/list.tsx"),
      route("ny", "routes/admin/organisations/new.tsx"),
      route(":organisationId", "routes/admin/organisations/detail.tsx"),
      route(
        "rediger/:organisationId",
        "routes/admin/organisations/edit.tsx",
      ),
    ]),
    ...prefix("komponenter", [
      index("routes/admin/components/list.tsx"),
      route("ny", "routes/admin/components/new.tsx"),
      route(":componentId", "routes/admin/components/detail.tsx"),
    ]),
    ...prefix("integrasjoner", [
      index("routes/admin/integrations/list.tsx"),
      route(":integrationId", "routes/admin/integrations/detail.tsx"),
    ]),
  ]),

  route(".well-known/*", "routes/well-known.ts"),
] satisfies RouteConfig;
