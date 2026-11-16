import { Heading, Link as AkselLink, VStack } from "@navikt/ds-react";
import { Link } from "react-router";

import { requireAdmin } from "~/server/auth.server";
import type { Route } from "./+types/index";

export async function loader({ request }: Route.LoaderArgs) {
    await requireAdmin(request);
    return {};
}

export default function AdminPage() {
    return (
        <VStack gap="space-24" paddingBlock="space-24">
            <Heading size="large">Admin</Heading>

            <VStack gap="space-16">
                <AkselLink as={Link} to="/admin/kontakter">
                    Kontakter
                </AkselLink>
                <AkselLink as={Link} to="/admin/organisasjoner">
                    Organisasjoner
                </AkselLink>
                <AkselLink as={Link} to="/admin/komponenter">
                    Komponenter
                </AkselLink>
            </VStack>
        </VStack>
    );
}