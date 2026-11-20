import { expect, test } from "@playwright/test";

const adminPages = [
    {
        path: "/admin",
        heading: "Admin Page (work in progress)",
    },
    {
        path: "/admin/kontakter",
        heading: "Alle kontakter",
    },
    {
        path: "/admin/kontakter/ny",
        heading: "Ny kontakt",
    },
    {
        path: "/admin/organisasjoner",
        heading: "Organisasjoner",
    },
    {
        path: "/admin/organisasjoner/ny",
        heading: "Ny organisasjon",
    },
    {
        path: "/admin/organisasjoner/00000000-0000-0000-0000-000000000010",
        heading: "Test Organisation 1",
    },
    {
        path: "/admin/komponenter",
        heading: "Komponenter",
    },
    {
        path: "/admin/komponenter/ny",
        heading: "Ny komponent",
    },
];

const creationActions = [
    {
        path: "/admin/kontakter/ny",
        validationMessage:
            "Skriv inn fornavn.",
    },
    {
        path: "/admin/organisasjoner/ny",
        validationStatus: 400,
        validationMessage:
            "Skriv inn visningsnavn.",
    },
    {
        path: "/admin/komponenter/ny",
        validationMessage:
            "Skriv inn navn.",
    },
];

test.describe("administrator permissions", () => {
    test.use({
        extraHTTPHeaders: { "x-nin": "987654321" },
    });

    for (const adminPage of adminPages) {
        test(`can open ${adminPage.path}`, async ({ page }) => {
            const response = await page.goto(adminPage.path);

            expect(response?.status()).toBe(200);

            await expect(
                page.getByRole("main").getByRole("heading", {
                    name: adminPage.heading,
                    exact: true,
                }),
            ).toBeVisible();
        });
    }

    for (const action of creationActions) {
        test(`can submit to ${action.path}`, async ({ request }) => {
            const response = await request.post(action.path, {
                form: {},
                maxRedirects: 0,
            });

            expect(response.status()).toBe(action.validationStatus ?? 200);

            // These page routes return HTML for direct document requests.
            expect(await response.text()).toContain(
                action.validationMessage,
            );
        });
    }
});

type RestrictedIdentity = {
    name: string;
    headers: Record<string, string>;
    expectedStatus: number;
    expectedHeading: string;
};

const restrictedIdentities: RestrictedIdentity[] = [
    {
        name: "ordinary user",
        headers: { "x-nin": "33333333333" },
        expectedStatus: 403,
        expectedHeading: "Du har ikke tilgang.",
    },
    {
        name: "unauthenticated visitor",
        headers: {},
        expectedStatus: 401,
        expectedHeading: "Du er ikke innlogget.",
    },
];

for (const identity of restrictedIdentities) {
    test.describe(`${identity.name} restrictions`, () => {
        // Override the admin project's headers for this group.
        test.use({
            extraHTTPHeaders: identity.headers,
        });

        for (const adminPage of adminPages) {
            test(`cannot open ${adminPage.path}`, async ({ page }) => {
                const response = await page.goto(adminPage.path);

                expect(response?.status()).toBe(identity.expectedStatus);

                await expect(
                    page.getByRole("heading", {
                        name: identity.expectedHeading,
                        exact: true,
                    }),
                ).toBeVisible();
            });
        }

        for (const action of creationActions) {
            test(`cannot submit to ${action.path}`, async ({ request }) => {
                const response = await request.post(action.path, {
                    form: {},
                    maxRedirects: 0,
                });

                // Must reject access before checking required form fields.
                expect(response.status()).toBe(identity.expectedStatus);
            });
        }

        for (const intent of ["organisations", "admin"]) {
            test(`cannot invoke the contact ${intent} action`, async ({ request }) => {
                const response = await request.post("/admin/kontakter", {
                    form: {
                        intent,
                        userId: "00000000-0000-0000-0000-000000000000",
                        isAdmin: "true",
                    },
                    maxRedirects: 0,
                });

                // Authorization must happen before looking up the target user.
                // An unguarded action would return 404 for this nonexistent ID.
                expect(response.status()).toBe(identity.expectedStatus);
            });
        }

        test("cannot open or submit the organisation edit form", async ({ request }) => {
            const path = "/admin/organisasjoner/00000000-0000-0000-0000-000000000010/rediger";

            expect((await request.get(path)).status()).toBe(identity.expectedStatus);
            expect((await request.post(path, {
                form: { legalContactId: "invalid" },
                maxRedirects: 0,
            })).status()).toBe(identity.expectedStatus);
        });
    });
}
