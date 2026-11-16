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
      index("routes/admin/contacts.tsx"),
      route("ny", "routes/admin/contacts/new.tsx"),
    ]),
    ...prefix("organisasjoner", [
      index("routes/admin/organisations/list.tsx"),
      route("ny", "routes/admin/organisations/new.tsx"),
    ]),
    ...prefix("komponenter", [
      index("routes/admin/components/list.tsx"),
      route("ny", "routes/admin/components/new.tsx"),
    ]),
  ]),

  route(".well-known/*", "routes/well-known.ts"),
  route(
    "api/organisation/:organisationId/components",
    "routes/api/organisations/components.ts",
  ),
] satisfies RouteConfig;
