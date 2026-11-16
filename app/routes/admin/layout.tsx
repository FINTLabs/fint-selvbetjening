import { Outlet } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return {};
}

export default function AdminLayout() {
  return <Outlet />;
}
