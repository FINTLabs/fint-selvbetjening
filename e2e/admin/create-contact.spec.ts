import { randomInt, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test, type Page } from "@playwright/test";

type ContactDraft = {
    firstName: string;
    lastName: string;
    mail: string;
    nin: string;
    mobile: string;
};

test.describe("create contact", () => {
    const database = new Pool({
        connectionString:
            "postgres://selvbetjening:selvbetjening@127.0.0.1:5432/selvbetjening",
        max: 1,
    });

    const duplicateMessage =
        "Det finnes allerede en kontakt med dette fødselsnummeret eller denne e-postadressen.";

    let contact: ContactDraft;

    async function fillDetails(page: Page) {
        const fields = [
            ["Fornavn", contact.firstName],
            ["Etternavn", contact.lastName],
            ["E-post", contact.mail],
            ["Fødselsnummer", contact.nin],
            ["Mobil", contact.mobile],
        ];

        for (const [label, value] of fields) {
            await page.getByRole("textbox", {
                name: label,
                exact: true,
            }).fill(value);
        }
    }

    async function toggleOrganisation(page: Page, name: string) {
        const input = page.getByRole("combobox", {
            name: "Organisasjoner",
            exact: true,
        });

        await input.fill(name);

        await page.getByRole("listbox").getByRole("option", {
            name,
            exact: true,
        }).click();

        await input.press("Escape");
    }

    async function submit(page: Page) {
        await page.getByRole("button", {
            name: "Opprett",
            exact: true,
        }).click();
    }

    function contactRow(page: Page) {
        return page.getByRole("table").getByRole("row").filter({
            has: page.getByRole("rowheader", {
                name: `${contact.firstName} ${contact.lastName}`,
                exact: true,
            }),
        });
    }

    async function expectContactCount(count: number) {
        const result = await database.query(
            "select id from users where last_name = $1",
            [contact.lastName],
        );

        expect(result.rows).toHaveLength(count);
    }

    test.beforeEach(async ({ page }) => {
        const identifier = randomUUID();

        contact = {
            firstName: "Playwright",
            lastName: `Create-${identifier}`,
            mail: `create-${identifier}@example.test`,
            nin: String(randomInt(10_000_000_000, 100_000_000_000)),
            mobile: "+4799999999",
        };

        const response = await page.goto("/admin/kontakter/ny");

        expect(response?.status()).toBe(200);

        await expect(
            page.getByRole("heading", {
                name: "Ny kontakt",
                exact: true,
            }),
        ).toBeVisible();
    });

    test.afterEach(async () => {
        if (contact) {
            // The unique last name identifies only this test's records.
            // Memberships are removed through ON DELETE CASCADE.
            await database.query(
                "delete from users where last_name = $1",
                [contact.lastName],
            );
        }
    });

    test.afterAll(async () => {
        await database.end();
    });

    test("creates an ordinary user with two organisation memberships", async ({ page, request }) => {
        await fillDetails(page);

        await toggleOrganisation(page, "Test Organisation 1");
        await toggleOrganisation(page, "Test Organisation 2");

        await submit(page);

        await expect(page).toHaveURL("/admin/kontakter");
        await expect(contactRow(page)).toBeVisible();

        for (const value of [contact.mail, contact.mobile]) {
            await expect(contactRow(page).getByRole("cell", { name: value, exact: true })).toBeVisible();
        }
        await expect(contactRow(page).getByText("Admin", { exact: true })).toHaveCount(0);

        await contactRow(page).press("Enter");
        await expect(page.getByRole("region", { name: "Kontaktinformasjon" }).getByText(contact.nin)).toBeVisible();
        const organisations = page.getByRole("region", { name: "Organisasjoner", exact: true });
        await expect(organisations.getByRole("rowheader")).toHaveText(["Test Organisation 1", "Test Organisation 2"]);
        await expect(organisations.getByRole("cell", { name: "Medlem", exact: true })).toHaveCount(2);

        const saved = await database.query<{
            id: string;
            is_admin: boolean;
        }>(
            `
                select id, is_admin
                from users
                where last_name = $1
            `,
            [contact.lastName],
        );

        expect(saved.rows).toHaveLength(1);
        expect(saved.rows[0].is_admin).toBe(false);

        const memberships = await database.query<{ name: string }>(
            `
                select organisation.name
                from organisation_users membership
                join organisations organisation
                  on organisation.id = membership.organisation_id
                where membership.user_id = $1
                order by organisation.name
            `,
            [saved.rows[0].id],
        );

        expect(memberships.rows.map((row) => row.name)).toEqual([
            "jennifer_test",
            "test_org_2",
        ]);

        // The new account must have ordinary-user access.
        const homeResponse = await request.get("/", {
            headers: { "x-nin": contact.nin },
            maxRedirects: 0,
        });

        expect(homeResponse.status()).toBe(200);

        const adminResponse = await request.get("/admin", {
            headers: { "x-nin": contact.nin },
            maxRedirects: 0,
        });

        expect(adminResponse.status()).toBe(403);
    });

    test("allows an empty mobile number and removing an organisation before submission", async ({ page }) => {
        contact.mobile = "";

        await fillDetails(page);

        await toggleOrganisation(page, "Test Organisation 1");
        await toggleOrganisation(page, "Test Organisation 2");

        // Selecting an already selected option removes it.
        await toggleOrganisation(page, "Test Organisation 2");

        await submit(page);

        await expect(page).toHaveURL("/admin/kontakter");
        await expect(contactRow(page)).toBeVisible();

        await expect(contactRow(page).getByRole("cell", { name: "—", exact: true })).toBeVisible();
        await contactRow(page).press("Enter");
        const organisations = page.getByRole("region", { name: "Organisasjoner", exact: true });
        await expect(organisations.getByRole("rowheader")).toHaveText(["Test Organisation 1"]);

        const saved = await database.query<{ mobile: string | null }>(
            "select mobile from users where last_name = $1",
            [contact.lastName],
        );

        expect(saved.rows).toHaveLength(1);
        expect(saved.rows[0].mobile).toBeNull();
    });

    for (const [label, error] of [
        ["Fornavn", "Skriv inn fornavn."],
        ["Etternavn", "Skriv inn etternavn."],
        ["E-post", "Skriv inn e-postadresse."],
        ["Fødselsnummer", "Skriv inn fødselsnummer."],
    ]) {
        test(`requires ${label}`, async ({ page }) => {
            await fillDetails(page);
            await toggleOrganisation(page, "Test Organisation 1");

            const field = page.getByRole("textbox", { name: label, exact: true });
            await field.fill("");

            await submit(page);

            await expect(page).toHaveURL("/admin/kontakter/ny");

            await expect(field).toHaveAccessibleDescription(error);

            await expectContactCount(0);
        });
    }

    test("requires at least one organisation", async ({ page }) => {
        await fillDetails(page);
        await submit(page);

        await expect(page).toHaveURL("/admin/kontakter/ny");

        await expect(
            page.getByText("Velg minst én organisasjon.", { exact: true }),
        ).toBeVisible();

        await expectContactCount(0);
    });

    for (const duplicateField of ["nin", "mail"] as const) {
        test(`rejects a duplicate ${duplicateField}`, async ({ page }) => {
            const existingNin = duplicateField === "nin"
                ? contact.nin
                : String(randomInt(10_000_000_000, 100_000_000_000));

            const existingMail = duplicateField === "mail"
                ? contact.mail
                : `existing-${randomUUID()}@example.test`;

            // Use a disposable existing contact to trigger the unique constraint.
            await database.query(
                `
                    insert into users (nin, first_name, last_name, mail)
                    values ($1, $2, $3, $4)
                `,
                [
                    existingNin,
                    "Existing",
                    contact.lastName,
                    existingMail,
                ],
            );

            await fillDetails(page);
            await toggleOrganisation(page, "Test Organisation 1");

            await submit(page);

            await expect(page).toHaveURL("/admin/kontakter/ny");

            await expect(
                page.getByText(duplicateMessage, { exact: true }),
            ).toBeVisible();

            // The existing contact remains; no second contact was created.
            await expectContactCount(1);

            await expect(
                page.getByRole("textbox", {
                    name: "Fornavn",
                    exact: true,
                }),
            ).toHaveValue(contact.firstName);
        });
    }

    test("cancelling returns to the list without creating a contact", async ({ page }) => {
        await fillDetails(page);
        await toggleOrganisation(page, "Test Organisation 1");
        await toggleOrganisation(page, "Test Organisation 2");

        await page.getByRole("button", {
            name: "Avbryt",
            exact: true,
        }).click();

        await expect(page).toHaveURL("/admin/kontakter");

        await expect(
            page.getByRole("heading", {
                name: "Alle kontakter",
                exact: true,
            }),
        ).toBeVisible();

        await expectContactCount(0);
    });
});
