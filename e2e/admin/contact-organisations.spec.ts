import { randomInt, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

test.describe("edit contact organisation memberships", () => {
    const database = new Pool({
        connectionString:
            "postgres://selvbetjening:selvbetjening@127.0.0.1:5432/selvbetjening",
        max: 1,
    });

    let contactId = "";
    let firstOrganisationId = "";
    let secondOrganisationId = "";

    async function expectMemberships(expectedNames: string[]) {
        const result = await database.query<{ name: string }>(
            `
                select organisation.name
                from organisation_users membership
                join organisations organisation
                  on organisation.id = membership.organisation_id
                where membership.user_id = $1
                order by organisation.name
            `,
            [contactId],
        );

        expect(result.rows.map((row) => row.name)).toEqual(expectedNames);
    }

    test.beforeEach(async () => {
        contactId = "";

        const organisations = await database.query<{
            id: string;
            name: string;
        }>(
            `
                select id, name
                from organisations
                where name = any($1::text[])
            `,
            [["jennifer_test", "test_org_2"]],
        );

        const firstOrganisation = organisations.rows.find(
            (organisation) => organisation.name === "jennifer_test",
        );

        const secondOrganisation = organisations.rows.find(
            (organisation) => organisation.name === "test_org_2",
        );

        if (!firstOrganisation || !secondOrganisation) {
            throw new Error("Both seeded test organisations must exist.");
        }

        firstOrganisationId = firstOrganisation.id;
        secondOrganisationId = secondOrganisation.id;

        const identifier = randomUUID();
        const firstName = "Playwright";
        const lastName = `Organisations-${identifier}`;

        const inserted = await database.query<{ id: string }>(
            `
                insert into users (nin, first_name, last_name, mail, is_admin)
                values ($1, $2, $3, $4, false)
                returning id
            `,
            [
                String(randomInt(10_000_000_000, 100_000_000_000)),
                firstName,
                lastName,
                `organisations-${identifier}@example.test`,
            ],
        );

        contactId = inserted.rows[0].id;

        await database.query(
            `
                insert into organisation_users (organisation_id, user_id, is_admin)
                values ($1, $2, true)
            `,
            [firstOrganisation.id, contactId],
        );

    });

    test.afterEach(async () => {
        if (contactId) {
            // Memberships are removed through ON DELETE CASCADE.
            await database.query(
                "delete from users where id = $1",
                [contactId],
            );
        }
    });

    test.afterAll(async () => {
        await database.end();
    });

    function membershipForm(organisationIds: string[]) {
        const form = new FormData();
        form.set("intent", "organisations");
        form.set("userId", contactId);
        for (const id of organisationIds) form.append("organisationIds", id);
        return form;
    }

    test("preserves roles on retained memberships and defaults new memberships to member", async ({ request }) => {
        const response = await request.post("/admin/kontakter", {
            form: membershipForm([firstOrganisationId, secondOrganisationId]),
        });
        expect(response.ok()).toBe(true);
        const memberships = await database.query(
            "select organisation_id, is_admin from organisation_users where user_id = $1 order by organisation_id",
            [contactId],
        );
        expect(memberships.rows).toHaveLength(2);
        expect(memberships.rows).toEqual(expect.arrayContaining([
            { organisation_id: firstOrganisationId, is_admin: true },
            { organisation_id: secondOrganisationId, is_admin: false },
        ]));

        const removal = await request.post("/admin/kontakter", {
            form: { intent: "organisations", userId: contactId, organisationIds: secondOrganisationId },
        });
        expect(removal.ok()).toBe(true);
        await expectMemberships(["test_org_2"]);
    });

    test("rejects empty or invalid memberships", async ({ request }) => {
        for (const organisationIds of [[], [randomUUID()]]) {
            const response = await request.post("/admin/kontakter", {
                form: membershipForm(organisationIds),
            });
            expect(response.status()).toBe(400);
            await expectMemberships(["jennifer_test"]);
        }
    });

    test("returns 404 for a deleted contact", async ({ request }) => {
        await database.query("delete from users where id = $1", [contactId]);
        const response = await request.post("/admin/kontakter", {
            form: { intent: "organisations", userId: contactId, organisationIds: secondOrganisationId },
        });
        expect(response.status()).toBe(404);
    });

    const restrictedIdentities = [
        {
            label: "ordinary user",
            nin: "33333333333",
            expectedStatus: 403,
        },
        {
            label: "request without an identity",
            nin: "",
            expectedStatus: 401,
        },
    ];

    for (const identity of restrictedIdentities) {
        test(`rejects membership updates from an ${identity.label}`, async ({ request }) => {
            const response = await request.post("/admin/kontakter", {
                headers: { "x-nin": identity.nin },
                form: {
                    intent: "organisations",
                    userId: contactId,
                    organisationIds: secondOrganisationId,
                },
                maxRedirects: 0,
            });

            expect(response.status()).toBe(identity.expectedStatus);

            await expectMemberships(["jennifer_test"]);
        });
    }
});
