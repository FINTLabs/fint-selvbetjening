import { randomInt, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

test.describe("remove platform administrator access", () => {
    const database = new Pool({
        connectionString:
            "postgres://selvbetjening:selvbetjening@127.0.0.1:5432/selvbetjening",
        max: 1,
    });

    let contactId = "";
    let contactNin = "";
    let organisationId = "";

    async function expectAdminStatus(expected: boolean) {
        const result = await database.query<{ is_admin: boolean }>(
            "select is_admin from users where id = $1",
            [contactId],
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].is_admin).toBe(expected);
    }

    async function expectMembershipUnchanged() {
        const result = await database.query<{ organisation_id: string; is_admin: boolean }>(
            `
                select organisation_id, is_admin
                from organisation_users
                where user_id = $1
            `,
            [contactId],
        );

        expect(result.rows).toEqual([
            { organisation_id: organisationId, is_admin: true },
        ]);
    }

    test.beforeEach(async () => {
        contactId = "";

        const organisations = await database.query<{ id: string }>(
            "select id from organisations where name = $1",
            ["jennifer_test"],
        );

        if (!organisations.rows[0]) {
            throw new Error("Test Organisation 1 is missing.");
        }

        organisationId = organisations.rows[0].id;

        const identifier = randomUUID();
        const firstName = "Playwright";
        const lastName = `RemoveAdmin-${identifier}`;

        contactNin = String(randomInt(10_000_000_000, 100_000_000_000));

        const inserted = await database.query<{ id: string }>(
            `
                insert into users (nin, first_name, last_name, mail, is_admin)
                values ($1, $2, $3, $4, true)
                returning id
            `,
            [
                contactNin,
                firstName,
                lastName,
                `remove-admin-${identifier}@example.test`,
            ],
        );

        contactId = inserted.rows[0].id;

        await database.query(
            `
                insert into organisation_users (organisation_id, user_id, is_admin)
                values ($1, $2, true)
            `,
            [organisationId, contactId],
        );

    });

    test.afterEach(async () => {
        if (contactId) {
            await database.query(
                "delete from users where id = $1",
                [contactId],
            );
        }
    });

    test.afterAll(async () => {
        await database.end();
    });

    test("updates portal access without changing the organisation role", async ({ request }) => {
        const response = await request.post("/admin/kontakter", {
            form: { intent: "admin", userId: contactId, isAdmin: "false" },
        });
        expect(response.ok()).toBe(true);
        await expectAdminStatus(false);
        await expectMembershipUnchanged();

        const access = await request.get("/admin", { headers: { "x-nin": contactNin } });
        expect(access.status()).toBe(403);
    });

    test("returns 404 for a deleted contact", async ({ request }) => {
        await database.query("delete from users where id = $1", [contactId]);
        const response = await request.post("/admin/kontakter", {
            form: { intent: "admin", userId: contactId, isAdmin: "false" },
        });
        expect(response.status()).toBe(404);
    });

    test("redirects home when the administrator revokes their own portal access", async ({ request }) => {
        const response = await request.post("/admin/kontakter", {
            headers: { "x-nin": contactNin },
            form: { intent: "admin", userId: contactId, isAdmin: "false" },
            maxRedirects: 0,
        });
        expect(response.status()).toBe(302);
        expect(response.headers().location).toBe("/");
        await expectAdminStatus(false);
        await expectMembershipUnchanged();
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
        test(`rejects removal from an ${identity.label}`, async ({ request }) => {
            const response = await request.post("/admin/kontakter", {
                headers: { "x-nin": identity.nin },
                form: {
                    intent: "admin",
                    userId: contactId,
                    isAdmin: "false",
                },
                maxRedirects: 0,
            });

            expect(response.status()).toBe(identity.expectedStatus);

            await expectAdminStatus(true);
            await expectMembershipUnchanged();
        });
    }
});