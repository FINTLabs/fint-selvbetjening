import { randomInt, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test, type Page } from "@playwright/test";

test.describe("admin contact list", () => {
    const database = new Pool({
        connectionString:
            "postgres://selvbetjening:selvbetjening@127.0.0.1:5432/selvbetjening",
        max: 1,
    });

    const identifier = randomUUID();

    const outsideOrganisation = {
        id: randomUUID(),
        name: `pw_org_${identifier}`,
        displayName: `Playwright Outside ${identifier}`,
        orgNumber: String(randomInt(100_000_000, 1_000_000_000)),
    };

    const memberOrganisation = {
        id: randomUUID(),
        name: `pw_member_org_${identifier}`,
        displayName: `Playwright Member ${identifier}`,
        orgNumber: String(randomInt(100_000_000, 1_000_000_000)),
    };

    const outsideContact = {
        firstName: "Playwright",
        lastName: `Outside-${identifier}`,
        nin: String(randomInt(10_000_000_000, 100_000_000_000)),
        mail: `outside-${identifier}@example.test`,
        mobile: "+4799999999",
        isAdmin: true,
    };

    const multiContact = {
        firstName: "Playwright",
        lastName: `Multi-${identifier}`,
        nin: String(randomInt(10_000_000_000, 100_000_000_000)),
        mail: `multi-${identifier}@example.test`,
        mobile: null,
        isAdmin: false,
    };

    const unaffiliatedContact = {
        firstName: "Playwright",
        lastName: `Unaffiliated-${identifier}`,
        nin: String(randomInt(10_000_000_000, 100_000_000_000)),
        mail: `unaffiliated-${identifier}@example.test`,
        mobile: null,
        isAdmin: false,
    };

    const createdContactIds: string[] = [];

    function contactRow(
        page: Page,
        contact: { firstName: string; lastName: string },
    ) {
        return page.getByRole("table").getByRole("row").filter({
            has: page.getByRole("rowheader", {
                name: `${contact.firstName} ${contact.lastName}`,
                exact: true,
            }),
        });
    }

    test.beforeAll(async () => {
        for (const organisation of [memberOrganisation, outsideOrganisation]) {
            await database.query(
                `
                    insert into organisations (id, name, display_name, org_number)
                    values ($1, $2, $3, $4)
                `,
                [organisation.id, organisation.name, organisation.displayName, organisation.orgNumber],
            );
        }

        for (const contact of [outsideContact, multiContact, unaffiliatedContact]) {
            const insertedContact = await database.query<{ id: string }>(
                `
                    insert into users (
                        nin, first_name, last_name, mail, mobile, is_admin
                    )
                    values ($1, $2, $3, $4, $5, $6)
                    returning id
                `,
                [
                    contact.nin,
                    contact.firstName,
                    contact.lastName,
                    contact.mail,
                    contact.mobile,
                    contact.isAdmin,
                ],
            );

            const contactId = insertedContact.rows[0].id;
            createdContactIds.push(contactId);

            const organisationIds = contact === outsideContact
                ? [outsideOrganisation.id]
                : contact === multiContact ? [memberOrganisation.id, outsideOrganisation.id] : [];

            await database.query(
                `
                    insert into organisation_users (organisation_id, user_id, is_admin)
                    select organisation_id, $2::uuid, coalesce(organisation_id = $3::uuid, false)
                    from unnest($1::uuid[]) as selected(organisation_id)
                `,
                [organisationIds, contactId, contact === multiContact ? outsideOrganisation.id : null],
            );
        }
    });

    test.beforeEach(async ({ page }) => {
        const response = await page.goto("/admin/kontakter");

        expect(response?.status()).toBe(200);

        await expect(
            page.getByRole("heading", {
                name: "Alle kontakter",
                exact: true,
            }),
        ).toBeVisible();
    });

    test.afterAll(async () => {
        try {
            await database.query(
                "delete from users where id = any($1::uuid[])",
                [createdContactIds],
            );

            await database.query(
                "delete from organisations where id = any($1::uuid[])",
                [[memberOrganisation.id, outsideOrganisation.id]],
            );
        } finally {
            await database.end();
        }
    });

    test("shows every registered contact, including contacts outside my organisations", async ({ page }) => {
        const result = await database.query<{ count: string }>(
            "select count(*) as count from users",
        );

        await expect(
            page.getByRole("table").locator("tbody tr"),
        ).toHaveCount(Number(result.rows[0].count));

        await expect(contactRow(page, outsideContact)).toBeVisible();
        await expect(contactRow(page, multiContact)).toBeVisible();

        // Jennifer has no membership in the temporary organisation.
        await expect(
            page.getByRole("combobox", {
                name: "Velg organisasjon",
            }).getByRole("option", {
                name: outsideOrganisation.displayName,
                exact: true,
            }),
        ).toHaveCount(0);
    });

    test("shows contact information and tags admin memberships only", async ({ page, request }) => {
        await expect(page.getByRole("columnheader")).toHaveText(["Navn", "E-post", "Mobil", "Organisasjon", "Admin"]);
        const outsideRow = contactRow(page, outsideContact);
        await expect(outsideRow.getByRole("cell", { name: outsideContact.mail })).toBeVisible();
        await expect(outsideRow.getByRole("cell", { name: outsideContact.mobile })).toBeVisible();
        await expect(outsideRow.getByText("Admin", { exact: true })).toHaveCount(0);

        const multiRow = contactRow(page, multiContact);
        await expect(multiRow.getByRole("cell", { name: "—", exact: true })).toBeVisible();
        await expect(multiRow.getByText("Admin", { exact: true })).toBeVisible();
        await expect(multiRow.getByText(multiContact.nin)).toHaveCount(0);
        await expect(multiRow.getByRole("link")).toHaveCount(0);

        const detailPath = `/admin/kontakter/${createdContactIds[1]}`;
        const denied = await request.get(detailPath, { headers: { "x-nin": multiContact.nin } });
        expect(denied.status()).toBe(403);

        await page.getByRole("searchbox").fill(multiContact.mail.toUpperCase());
        await expect(page.getByRole("rowheader")).toHaveCount(1);
        await multiRow.getByRole("cell", { name: multiContact.mail }).click();
        await expect(page).toHaveURL(detailPath);
        await expect(page.getByRole("heading", { name: `${multiContact.firstName} ${multiContact.lastName}` })).toBeVisible();

        const info = page.getByRole("region", { name: "Kontaktinformasjon" });
        await expect(info.getByText(multiContact.mail, { exact: true })).toBeVisible();
        await expect(info.getByText(multiContact.nin, { exact: true })).toBeVisible();
        await expect(info.getByText("Ikke registrert", { exact: true })).toBeVisible();
        await expect(info.getByRole("button", { name: "Rediger" })).toBeEnabled();

        const memberships = page.getByRole("region", { name: "Organisasjoner", exact: true });
        await expect(memberships.getByRole("button", { name: "Legg til organisasjon" })).toBeEnabled();
        const memberRow = memberships.getByRole("row", { name: new RegExp(memberOrganisation.displayName) });
        const adminRow = memberships.getByRole("row", { name: new RegExp(outsideOrganisation.displayName) });
        await expect(memberRow.getByRole("cell", { name: "Medlem", exact: true })).toBeVisible();
        await expect(adminRow.getByRole("cell", { name: "Admin", exact: true })).toBeVisible();
        for (const row of [memberRow, adminRow]) {
            await expect(row.getByRole("button", { name: "Sett som juridisk kontakt" })).toBeEnabled();
        }

        await page.getByRole("link", { name: "Tilbake til kontakter" }).click();
        await expect(page).toHaveURL("/admin/kontakter");
        await contactRow(page, outsideContact).press("Enter");
        await expect(page).toHaveURL(`/admin/kontakter/${createdContactIds[0]}`);
    });

    test("confirms before replacing an organisation's legal contact", async ({ page, request }) => {
        const [oldContactId, newContactId, nonMemberId] = createdContactIds;
        const detailPath = `/admin/kontakter/${newContactId}`;
        const payload = {
            intent: "set-legal-contact",
            organisationId: outsideOrganisation.id,
            expectedLegalContactId: oldContactId,
        };

        async function expectLegalContact(id: string) {
            const { rows } = await database.query(
                "select legal_contact_id from organisations where id = $1",
                [outsideOrganisation.id],
            );
            expect(rows).toEqual([{ legal_contact_id: id }]);
        }

        await database.query("update organisations set legal_contact_id = $2 where id = $1", [outsideOrganisation.id, oldContactId]);
        try {
            expect((await request.post(detailPath, {
                headers: { "x-nin": unaffiliatedContact.nin },
                form: payload,
            })).status()).toBe(403);
            expect((await request.post(`/admin/kontakter/${nonMemberId}`, { form: payload })).status()).toBe(400);

            await page.goto(detailPath);
            const organisation = page.getByRole("row", { name: new RegExp(outsideOrganisation.displayName) });
            const set = organisation.getByRole("button", { name: "Sett som juridisk kontakt" });
            await set.click();
            const dialog = page.getByRole("dialog", { name: "Bytt juridisk kontakt" });
            await expect(dialog).toContainText(`${outsideContact.firstName} ${outsideContact.lastName}`);
            await expect(dialog).toContainText(`${multiContact.firstName} ${multiContact.lastName}`);
            await expect(dialog).toContainText(outsideOrganisation.displayName);
            await dialog.getByRole("button", { name: "Avbryt" }).click();
            await expect(dialog).toBeHidden();
            await expectLegalContact(oldContactId);

            await set.click();
            await dialog.getByRole("button", { name: "Bytt juridisk kontakt" }).click();
            await expect(dialog).toBeHidden();
            await expect(organisation.getByText("Juridisk kontakt", { exact: true })).toBeVisible();
            await expectLegalContact(newContactId);

            const members = await database.query(
                "select count(*)::int as count from organisation_users where organisation_id = $1",
                [outsideOrganisation.id],
            );
            expect(members.rows).toEqual([{ count: 2 }]);

            const stale = await request.post(`/admin/kontakter/${oldContactId}`, { form: payload });
            expect(stale.status()).toBe(409);
            await expectLegalContact(newContactId);
        } finally {
            await database.query("update organisations set legal_contact_id = null where id = $1", [outsideOrganisation.id]);
        }
    });

    test("adds organisations from contact details without replacing existing memberships", async ({ page, request }) => {
        const organisationId = randomUUID();
        const organisationName = `Playwright Additional ${organisationId}`;
        const contactId = createdContactIds[1];
        const detailPath = `/admin/kontakter/${contactId}`;
        await database.query(
            "insert into organisations (id, name, display_name, org_number) values ($1, $2, $3, $4)",
            [organisationId, `pw-add-${organisationId}`, organisationName, organisationId],
        );

        try {
            const denied = await request.post(detailPath, {
                headers: { "x-nin": unaffiliatedContact.nin },
                form: { intent: "add-organisations", organisationIds: organisationId },
            });
            expect(denied.status()).toBe(403);

            const invalid = new FormData();
            invalid.set("intent", "add-organisations");
            invalid.append("organisationIds", organisationId);
            invalid.append("organisationIds", randomUUID());
            expect((await request.post(detailPath, { form: invalid })).status()).toBe(400);

            await page.goto(detailPath);
            const memberships = page.getByRole("region", { name: "Organisasjoner", exact: true });
            await expect(memberships.getByRole("rowheader")).toHaveCount(2);
            await memberships.getByRole("button", { name: "Legg til organisasjon" }).click();

            const dialog = page.getByRole("dialog", { name: "Legg til organisasjon" });
            await dialog.getByRole("button", { name: "Legg til", exact: true }).click();
            await expect(dialog.getByText("Velg minst én organisasjon.", { exact: true })).toBeVisible();

            const select = dialog.getByRole("combobox", { name: "Organisasjon" });
            await select.fill(outsideOrganisation.displayName);
            await expect(dialog.getByRole("option", { name: outsideOrganisation.displayName })).toHaveCount(0);
            await select.fill(organisationName);
            await dialog.getByRole("option", { name: organisationName }).click();
            await dialog.getByRole("button", { name: "Legg til", exact: true }).click();

            await expect(dialog).toBeHidden();
            await expect(page).toHaveURL(detailPath);
            await expect(memberships.getByRole("rowheader")).toHaveCount(3);
            await expect(memberships.getByRole("row", { name: new RegExp(organisationName) })).toContainText("Medlem");
            await expect(memberships.getByRole("row", { name: new RegExp(outsideOrganisation.displayName) })).toContainText("Admin");

            const repeated = await request.post(detailPath, {
                form: { intent: "add-organisations", organisationIds: organisationId },
            });
            expect(repeated.ok()).toBe(true);
            await page.reload();
            await expect(memberships.getByRole("rowheader")).toHaveCount(3);
        } finally {
            await database.query("delete from organisations where id = $1", [organisationId]);
        }
    });

    test("shows single, multiple, and missing organisation memberships", async ({ page }) => {
        const singleRow = contactRow(page, outsideContact);
        const multiRow = contactRow(page, multiContact);
        const noOrganisationRow = contactRow(page, unaffiliatedContact);

        await expect(singleRow.getByRole("cell", { name: outsideOrganisation.displayName, exact: true })).toBeVisible();
        await expect(noOrganisationRow.getByRole("img", { name: "Mangler organisasjon" })).toBeVisible();

        const filter = page.getByRole("combobox", { name: "Filtrer på organisasjon" });
        await filter.selectOption({ label: outsideOrganisation.displayName });
        const trigger = multiRow.getByRole("button", { name: /Vis organisasjoner for/ });
        await trigger.click();

        const dialog = page.getByRole("dialog", { name: "Organisasjoner" });
        const memberships = dialog.getByRole("listitem");
        await expect(memberships).toHaveCount(2);
        const member = memberships.filter({ hasText: memberOrganisation.displayName });
        const admin = memberships.filter({ hasText: outsideOrganisation.displayName });
        await expect(member).toHaveText(memberOrganisation.displayName);
        await expect(admin.getByText("Admin", { exact: true })).toBeVisible();
        await member.click();
        await expect(page).toHaveURL(`/admin/kontakter?organisation=${outsideOrganisation.id}`);

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test("filters contacts by organisation alongside search and retains the filter when returning", async ({ page }) => {
        const filter = page.getByRole("combobox", { name: "Filtrer på organisasjon" });
        const search = page.getByRole("searchbox", { name: "Søk etter kontakter" });
        const outsideRow = contactRow(page, outsideContact);
        const multiRow = contactRow(page, multiContact);

        await expect(filter).toHaveValue("");
        await filter.selectOption({ label: outsideOrganisation.displayName });
        await expect(page.getByRole("rowheader")).toHaveCount(2);
        await expect(outsideRow).toBeVisible();
        await expect(multiRow).toBeVisible();

        await filter.selectOption({ label: memberOrganisation.displayName });
        await expect(outsideRow).toHaveCount(0);
        await expect(multiRow.getByText("Admin", { exact: true })).toBeVisible();

        await search.fill(outsideContact.mail);
        await expect(page.getByRole("status").filter({ hasText: "Ingen kontakter matcher søket." })).toBeVisible();
        await search.clear();

        const selectedOrganisation = await filter.inputValue();
        await multiRow.press("Enter");
        await expect(page).toHaveURL(`/admin/kontakter/${createdContactIds[1]}?organisation=${selectedOrganisation}`);
        await page.getByRole("link", { name: "Tilbake til kontakter" }).click();
        await expect(filter).toHaveValue(selectedOrganisation);
        await expect(outsideRow).toHaveCount(0);

        await page.reload();
        await expect(filter).toHaveValue(selectedOrganisation);
        await filter.selectOption({ label: "Alle organisasjoner" });
        await expect(page).toHaveURL("/admin/kontakter");
        await expect(outsideRow).toBeVisible();
    });

    test("keeps the global contact list when my selected organisation changes", async ({ page }) => {
        await expect(contactRow(page, outsideContact)).toBeVisible();
        await expect(contactRow(page, multiContact)).toBeVisible();

        await page.goto("/");

        await page.getByRole("combobox", {
            name: "Velg organisasjon",
        }).selectOption("test_org_2");

        // Wait for the server to apply the selection before navigating.
        await expect(
            page.getByText("Organisasjon: Test Organisation 2", {
                exact: true,
            }),
        ).toBeVisible();

        await page.goto("/admin/kontakter");

        await expect(
            page.getByRole("combobox", { name: "Velg organisasjon" }),
        ).toHaveValue("test_org_2");

        await expect(contactRow(page, outsideContact)).toBeVisible();
        await expect(contactRow(page, multiContact)).toBeVisible();

        await page.reload();

        await expect(contactRow(page, outsideContact)).toBeVisible();
        await expect(contactRow(page, multiContact)).toBeVisible();
    });

    test("opens the contact creation form", async ({ page }) => {
        await page.getByRole("button", {
            name: "Legg til",
            exact: true,
        }).click();

        await expect(page).toHaveURL("/admin/kontakter/ny");

        await expect(
            page.getByRole("heading", {
                name: "Ny kontakt",
                exact: true,
            }),
        ).toBeVisible();
    });
});
