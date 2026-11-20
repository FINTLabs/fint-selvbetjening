import { randomInt, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test, type Page } from "@playwright/test";

type OrganisationDraft = {
    name: string;
    displayName: string;
    orgNumber: string;
    primaryAssetId: string;
};

test.describe("admin organisations", () => {
    const database = new Pool({
        connectionString:
            "postgres://selvbetjening:selvbetjening@127.0.0.1:5432/selvbetjening",
        max: 1,
    });

    const duplicateMessage =
        "Det finnes allerede en organisasjon med dette navnet eller organisasjonsnummeret.";

    const domainLabel = "Domenenavn (f.eks. rfk.no)";
    const legalContactLabel = "Juridisk kontakt";
    const calvinOption = "Calvin Ball (calvin.ball@fint.no)";
    const jenniferOption = "Jennifer Maarberg (jennifer.maarberg@fint.no)";

    let organisation: OrganisationDraft;

    function organisationRow(page: Page) {
        return page.getByRole("table").getByRole("row").filter({
            has: page.getByRole("rowheader", {
                name: organisation.name,
                exact: true,
            }),
        });
    }

    function legalContactSelect(page: Page) {
        return page.getByRole("combobox", { name: legalContactLabel, exact: true });
    }

    async function openCreation(page: Page) {
        await page.getByRole("button", {
            name: "Legg til",
            exact: true,
        }).click();

        await expect(page).toHaveURL("/admin/organisasjoner/ny");

        await expect(
            page.getByRole("heading", {
                name: "Ny organisasjon",
                exact: true,
            }),
        ).toBeVisible();
    }

    async function fillDetails(page: Page) {
        const fields = [
            ["Vist navn", organisation.displayName],
            [domainLabel, organisation.primaryAssetId],
            ["Organisasjonsnummer", organisation.orgNumber],
        ];

        for (const [label, value] of fields) {
            await page.getByRole("textbox", {
                name: label,
                exact: true,
            }).fill(value);
        }
    }

    async function submit(page: Page) {
        await page.getByRole("button", {
            name: "Legg til organisasjon",
            exact: true,
        }).click();
    }

    async function insertOrganisation(
        name = organisation.name,
        orgNumber = organisation.orgNumber,
    ) {
        const { rows: [row] } = await database.query<{ id: string }>(
            `
                insert into organisations (name, display_name, org_number, primary_asset_id)
                values ($1, $2, $3, $4)
                returning id
            `,
            [name, organisation.displayName, orgNumber, organisation.primaryAssetId],
        );
        return row.id;
    }

    async function expectOrganisationCount(count: number) {
        const result = await database.query(
            "select id from organisations where display_name = $1",
            [organisation.displayName],
        );

        expect(result.rows).toHaveLength(count);
    }

    test.beforeEach(async ({ page }) => {
        const identifier = randomUUID();

        organisation = {
            name: `pw-org-${identifier}_example`,
            displayName: `Playwright Organisation ${identifier}`,
            orgNumber: String(randomInt(100_000_000, 1_000_000_000)),
            primaryAssetId: `pw-org-${identifier}.example`,
        };

        const response = await page.goto("/admin/organisasjoner");

        expect(response?.status()).toBe(200);

        await expect(
            page.getByRole("main").getByRole("heading", {
                name: "Organisasjoner",
                exact: true,
            }),
        ).toBeVisible();
    });

    test.afterEach(async () => {
        if (organisation) {
            // The unique display name identifies only this test's records.
            await database.query(
                "delete from organisations where display_name = $1",
                [organisation.displayName],
            );
        }
    });

    test.afterAll(async () => {
        await database.end();
    });

    test("lists all organisations regardless of my selected organisation", async ({ page }) => {
        // No membership is created for the administrator.
        const id = await insertOrganisation();
        await page.reload();

        const table = page.getByRole("table");

        await expect(table.getByRole("columnheader")).toHaveText([
            "Navn",
            "Visningsnavn",
            "Primær Asset ID",
            "Juridisk kontakt",
            "Rediger",
        ]);

        const row = organisationRow(page);
        await expect(row).toBeVisible();
        await expect(row.getByRole("link")).toHaveCount(0);
        for (const value of [organisation.displayName, organisation.primaryAssetId]) {
            await expect(row.getByRole("cell", { name: value, exact: true })).toBeVisible();
        }

        await row.getByRole("button", { name: `Handlinger for ${organisation.displayName}` }).click();
        const menu = page.getByRole("menu");
        await expect(menu.getByRole("menuitem")).toHaveText([
            "Legg til kontakt",
            "Fjern kontakt",
            "Legg til juridisk kontakt",
            "Fjern juridisk kontakt",
            "Arkiver organisasjon",
        ]);
        for (const item of await menu.getByRole("menuitem").all()) {
            await expect(item).toBeDisabled();
        }
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();

        const search = page.getByRole("searchbox", { name: "Søk etter organisasjoner" });
        await search.fill(organisation.primaryAssetId.toUpperCase());
        await expect(table.getByRole("rowheader")).toHaveCount(1);
        await expect(row).toBeVisible();
        await search.fill("no matching organisation");
        await expect(page.getByRole("status").filter({ hasText: "Ingen organisasjoner matcher søket." })).toBeVisible();
        await search.clear();

        const count = await database.query<{ count: string }>(
            "select count(*) as count from organisations",
        );

        await expect(table.getByRole("rowheader")).toHaveCount(
            Number(count.rows[0].count),
        );

        await expect(
            page.getByRole("combobox", {
                name: "Velg organisasjon",
            }).getByRole("option", {
                name: organisation.displayName,
                exact: true,
            }),
        ).toHaveCount(0);

        await page.goto("/");

        await page.getByRole("combobox", {
            name: "Velg organisasjon",
        }).selectOption("test_org_2");

        await expect(
            page.getByText("Organisasjon: Test Organisation 2", {
                exact: true,
            }),
        ).toBeVisible();

        await page.goto("/admin/organisasjoner");

        await expect(
            page.getByRole("combobox", { name: "Velg organisasjon" }),
        ).toHaveValue("test_org_2");

        await expect(organisationRow(page)).toBeVisible();

        await expect(
            page.getByRole("table").getByRole("rowheader"),
        ).toHaveCount(Number(count.rows[0].count));

        await row.getByRole("cell", { name: organisation.displayName, exact: true }).click();
        await expect(page).toHaveURL(`/admin/organisasjoner/${id}`);
        await expect(page.getByRole("heading", { name: organisation.displayName, level: 1 })).toBeVisible();
        const info = page.getByRole("region", { name: "Organisasjonsinformasjon" });
        await expect(info.getByText(organisation.orgNumber, { exact: true })).toBeVisible();
        await expect(info.getByText(organisation.primaryAssetId, { exact: true })).toBeVisible();
        await expect(info.getByRole("button", { name: "Rediger" })).toBeEnabled();
        await expect(page.getByText("Ingen juridisk kontakt", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Sett juridisk kontakt" })).toBeDisabled();
        await expect(page.getByText("Ingen Tekniske kontakter", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Legg til kontakt" })).toBeEnabled();

        await page.getByRole("link", { name: "Tilbake til organisasjoner" }).click();
        await expect(page).toHaveURL("/admin/organisasjoner");
    });

    test("edits an organisation from its detail page and keeps its domain read-only", async ({ page, request }) => {
        const id = await insertOrganisation();
        const detailPath = `/admin/organisasjoner/${id}`;
        const editPath = `/admin/organisasjoner/rediger/${id}`;
        const updatedNumber = String(randomInt(100_000_000, 1_000_000_000));
        await page.goto(detailPath);
        await page.getByRole("button", { name: "Rediger", exact: true }).click();
        await expect(page).toHaveURL(editPath);

        const domain = page.getByRole("textbox", { name: "Domenenavn", exact: true });
        await expect(domain).toHaveValue(organisation.primaryAssetId);
        await expect(domain).toHaveAttribute("readonly", "");
        const number = page.getByRole("textbox", { name: "Organisasjonsnummer" });
        const save = page.getByRole("button", { name: "Lagre" });
        await number.clear();
        await save.click();
        await expect(number).toHaveAccessibleDescription("Skriv inn organisasjonsnummer.");
        await expect(domain).toHaveValue(organisation.primaryAssetId);

        await number.fill(updatedNumber);
        await save.click();
        await expect(page).toHaveURL(detailPath);
        const info = page.getByRole("region", { name: "Organisasjonsinformasjon" });
        await expect(info.getByText(updatedNumber, { exact: true })).toBeVisible();
        await expect(info.getByText(organisation.primaryAssetId, { exact: true })).toBeVisible();

        const response = await request.post(editPath, {
            form: { ...organisation, orgNumber: updatedNumber, primaryAssetId: "changed.example" },
            maxRedirects: 0,
        });
        expect(response.status()).toBe(302);
        const saved = await database.query("select primary_asset_id from organisations where id = $1", [id]);
        expect(saved.rows).toEqual([{ primary_asset_id: organisation.primaryAssetId }]);
    });

    test("shows the legal contact name or a warning icon in the organisation list", async ({ page }) => {
        const id = await insertOrganisation();
        const email = `legal-${randomUUID()}@example.test`;
        const row = organisationRow(page);
        const warning = row.getByRole("img", { name: "Mangler juridisk kontakt" });

        try {
            await page.reload();
            await expect(warning).toBeVisible();

            const { rows: [contact] } = await database.query<{ id: string }>(
                "insert into users (nin, first_name, last_name, mail) values ($1, 'Playwright', 'Legal', $2) returning id",
                [String(randomInt(10_000_000_000, 100_000_000_000)), email],
            );
            await database.query(
                "insert into organisation_users (organisation_id, user_id) values ($1, $2)",
                [id, contact.id],
            );
            await database.query("update organisations set legal_contact_id = $2 where id = $1", [id, contact.id]);

            await page.reload();
            await expect(row.getByRole("cell", { name: "Playwright Legal", exact: true })).toBeVisible();
            await expect(warning).toHaveCount(0);
        } finally {
            await database.query("delete from organisations where id = $1", [id]);
            await database.query("delete from users where mail = $1", [email]);
        }
    });

    test("adds and removes technical contacts while protecting the legal contact", async ({ page, request }) => {
        const id = await insertOrganisation();
        const path = `/admin/organisasjoner/${id}`;
        const memberId = randomUUID();
        const candidateId = randomUUID();
        const memberMail = `member-${memberId}@example.test`;
        const candidateMail = `technical-${candidateId}@example.test`;
        const candidateNin = String(randomInt(10_000_000_000, 100_000_000_000));

        try {
            await database.query(
                `
                    insert into users (id, nin, first_name, last_name, mail)
                    values ($1, $2, 'Playwright', 'Member', $3), ($4, $5, 'Playwright', 'Technical', $6)
                `,
                [memberId, String(randomInt(10_000_000_000, 100_000_000_000)), memberMail,
                    candidateId, candidateNin, candidateMail],
            );
            await database.query(
                "insert into organisation_users (organisation_id, user_id, is_admin) values ($1, $2, true)",
                [id, memberId],
            );
            const payload = { intent: "add-technical-contact", contactId: candidateId };
            expect((await request.post(path, { form: payload, headers: { "x-nin": candidateNin } })).status()).toBe(403);
            expect((await request.post(path, { form: { ...payload, contactId: randomUUID() } })).status()).toBe(404);

            await page.goto(path);
            const section = page.getByRole("region", { name: "Tekniske kontakter" });
            await expect(section.getByRole("rowheader")).toHaveText(["Playwright Member"]);
            await section.getByRole("button", { name: "Legg til kontakt" }).click();

            const dialog = page.getByRole("dialog", { name: "Legg til teknisk kontakt" });
            const picker = dialog.getByRole("combobox", { name: "Kontakt" });
            const submitContact = dialog.getByRole("button", { name: "Legg til", exact: true });
            await expect(submitContact).toBeDisabled();
            await picker.fill(memberMail);
            await expect(dialog.getByRole("option", { name: new RegExp(memberMail) })).toHaveCount(0);
            await picker.fill(candidateMail);
            await dialog.getByRole("option", { name: `Playwright Technical (${candidateMail})` }).click();
            await submitContact.click();

            await expect(dialog).toBeHidden();
            await expect(page).toHaveURL(path);
            await expect(section.getByRole("rowheader")).toHaveText(["Playwright Member", "Playwright Technical"]);
            expect((await request.post(path, { form: payload })).ok()).toBe(true);
            await page.reload();
            await expect(section.getByRole("rowheader")).toHaveCount(2);

            const { rows } = await database.query(
                "select user_id, is_admin from organisation_users where organisation_id = $1",
                [id],
            );
            expect(rows).toHaveLength(2);
            expect(rows).toEqual(expect.arrayContaining([
                { user_id: memberId, is_admin: true },
                { user_id: candidateId, is_admin: false },
            ]));
            await expect(page.getByText("Ingen juridisk kontakt", { exact: true })).toBeVisible();

            await database.query("update organisations set legal_contact_id = $2 where id = $1", [id, memberId]);
            await page.reload();
            await expect(section.getByRole("button", { name: "Fjern Playwright Member" })).toBeDisabled();
            const removal = { intent: "remove-technical-contact", contactId: candidateId };
            expect((await request.post(path, { form: removal, headers: { "x-nin": candidateNin } })).status()).toBe(403);
            expect((await request.post(path, { form: { ...removal, contactId: memberId } })).status()).toBe(409);

            const remove = section.getByRole("button", { name: "Fjern Playwright Technical" });
            await remove.click();
            const confirmation = page.getByRole("dialog", { name: "Fjern teknisk kontakt" });
            await expect(confirmation).toContainText("Playwright Technical");
            await expect(confirmation).toContainText(organisation.displayName);
            await confirmation.getByRole("button", { name: "Avbryt" }).click();
            await expect(confirmation).toBeHidden();
            await expect(section.getByRole("rowheader")).toHaveCount(2);

            await remove.click();
            await confirmation.getByRole("button", { name: "Fjern kontakt", exact: true }).click();
            await expect(confirmation).toBeHidden();
            await expect(section.getByRole("rowheader")).toHaveText(["Playwright Member"]);
            const remaining = await database.query(
                "select user_id, is_admin from organisation_users where organisation_id = $1", [id],
            );
            expect(remaining.rows).toEqual([{ user_id: memberId, is_admin: true }]);
            const contact = await database.query("select id from users where id = $1", [candidateId]);
            expect(contact.rows).toEqual([{ id: candidateId }]);
        } finally {
            await database.query("delete from organisations where id = $1", [id]);
            await database.query("delete from users where id = any($1::uuid[])", [[memberId, candidateId]]);
        }
    });

    test("sets and replaces a legal contact from the organisation detail page", async ({ page, request }) => {
        const id = await insertOrganisation();
        const path = `/admin/organisasjoner/${id}`;
        const firstId = randomUUID();
        const secondId = randomUUID();
        const firstNin = String(randomInt(10_000_000_000, 100_000_000_000));

        try {
            await database.query(
                `
                    insert into users (id, nin, first_name, last_name, mail)
                    values ($1, $2, 'Playwright', 'First', $3), ($4, $5, 'Playwright', 'Second', $6)
                `,
                [firstId, firstNin, `first-${firstId}@example.test`, secondId,
                    String(randomInt(10_000_000_000, 100_000_000_000)), `second-${secondId}@example.test`],
            );
            await database.query(
                "insert into organisation_users (organisation_id, user_id) values ($1, $2), ($1, $3)",
                [id, firstId, secondId],
            );

            const payload = { intent: "set-legal-contact", contactId: firstId, expectedLegalContactId: "" };
            expect((await request.post(path, { form: payload, headers: { "x-nin": firstNin } })).status()).toBe(403);
            expect((await request.post(path, { form: { ...payload, contactId: randomUUID() } })).status()).toBe(400);

            await page.goto(path);
            const section = page.getByRole("region", { name: legalContactLabel, exact: true });
            await section.getByRole("button", { name: "Sett juridisk kontakt" }).click();
            const picker = page.getByRole("dialog", { name: "Velg juridisk kontakt" });
            const select = picker.getByRole("combobox", { name: legalContactLabel });
            await expect(select.getByRole("option")).toHaveCount(3);
            await select.selectOption(firstId);
            await picker.getByRole("button", { name: "Fortsett" }).click();
            const firstConfirmation = page.getByRole("dialog", { name: "Bekreft juridisk kontakt" });
            await expect(firstConfirmation).toContainText("Playwright First");
            await firstConfirmation.getByRole("button", { name: "Bekreft" }).click();
            await expect(firstConfirmation).toBeHidden();
            await expect(section.getByText("Playwright First", { exact: true })).toBeVisible();

            async function chooseReplacement() {
                await section.getByRole("button", { name: "Endre juridisk kontakt" }).click();
                await expect(select.getByRole("option")).toHaveCount(2);
                await select.selectOption(secondId);
                await picker.getByRole("button", { name: "Fortsett" }).click();
            }

            await chooseReplacement();
            const replacement = page.getByRole("dialog", { name: "Bytt juridisk kontakt" });
            await expect(replacement).toContainText("Playwright First");
            await expect(replacement).toContainText("Playwright Second");
            await expect(replacement).toContainText(organisation.displayName);
            await replacement.getByRole("button", { name: "Avbryt" }).click();
            await expect(replacement).toBeHidden();
            await expect(section.getByText("Playwright First", { exact: true })).toBeVisible();

            await chooseReplacement();
            await replacement.getByRole("button", { name: "Bytt juridisk kontakt" }).click();
            await expect(replacement).toBeHidden();
            await expect(section.getByText("Playwright Second", { exact: true })).toBeVisible();

            const stale = await request.post(path, { form: payload });
            expect(stale.status()).toBe(409);
            const saved = await database.query("select legal_contact_id from organisations where id = $1", [id]);
            expect(saved.rows).toEqual([{ legal_contact_id: secondId }]);
            const members = await database.query(
                "select count(*)::int as count from organisation_users where organisation_id = $1", [id],
            );
            expect(members.rows).toEqual([{ count: 2 }]);
        } finally {
            await database.query("delete from organisations where id = $1", [id]);
            await database.query("delete from users where id = any($1::uuid[])", [[firstId, secondId]]);
        }
    });

    test("returns 404 for an unknown organisation", async ({ request }) => {
        const response = await request.get(`/admin/organisasjoner/${randomUUID()}`);
        expect(response.status()).toBe(404);
    });

    test("creates an organisation with a domain and no legal contact", async ({ page }) => {
        await openCreation(page);
        await fillDetails(page);
        await page.getByRole("textbox", { name: domainLabel }).fill(organisation.primaryAssetId.toUpperCase());
        await expect(page.getByRole("heading", { name: legalContactLabel })).toBeVisible();
        await expect(page.getByText("Ingen valgt", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Velg juridisk kontakt" })).toBeDisabled();
        await expect(page.getByRole("switch")).toHaveCount(0);
        await expect(page.getByRole("textbox", { name: "Fornavn" })).toHaveCount(0);

        await submit(page);
        await expect(page).toHaveURL("/admin/organisasjoner");
        await expect(organisationRow(page).getByRole("cell", { name: organisation.primaryAssetId })).toBeVisible();

        const saved = await database.query(
            "select primary_asset_id, legal_contact_id from organisations where name = $1",
            [organisation.name],
        );
        expect(saved.rows).toEqual([{
            primary_asset_id: organisation.primaryAssetId,
            legal_contact_id: null,
        }]);
    });

    test("ignores contact fields submitted during creation", async ({ request }) => {
        const { rows: [user] } = await database.query<{ id: string }>(
            "select id from users where nin = '123456789'",
        );
        const response = await request.post("/admin/organisasjoner/ny", {
            form: {
                ...organisation,
                legalContactId: user.id,
                memberIds: user.id,
                firstName: "Ny",
                lastName: "Kontakt",
                mail: "calvin.ball@fint.no",
            },
            maxRedirects: 0,
        });
        expect(response.status()).toBe(302);
        const saved = await database.query(
            `
                select o.legal_contact_id, count(membership.user_id)::int as members
                from organisations o
                left join organisation_users membership on membership.organisation_id = o.id
                where o.name = $1
                group by o.id
            `,
            [organisation.name],
        );
        expect(saved.rows).toEqual([{ legal_contact_id: null, members: 0 }]);
    });

    test("assigns legal contacts only to members and protects their membership", async ({ page, request }) => {
        const id = await insertOrganisation();
        const editPath = `/admin/organisasjoner/rediger/${id}`;
        await page.goto(editPath);
        await expect(page.getByRole("heading", { name: "Rediger organisasjon" })).toBeVisible();
        await expect(legalContactSelect(page)).toBeDisabled();
        await expect(page.getByRole("textbox", { name: "Visningsnavn" })).toHaveValue(organisation.displayName);

        async function addMember(nin: string) {
            await database.query(
                `
                    insert into organisation_users (organisation_id, user_id)
                    select o.id, u.id from organisations o cross join users u
                    where o.name = $1 and u.nin = $2
                `,
                [organisation.name, nin],
            );
        }

        await addMember("123456789");
        await page.reload();
        await expect(legalContactSelect(page).locator("option")).toHaveText(["Ingen endring", calvinOption]);

        const users = await database.query<{ id: string; nin: string }>(
            "select id, nin from users where nin in ('123456789', '987654321')",
        );
        const calvinId = users.rows.find((user) => user.nin === "123456789")!.id;
        const jenniferId = users.rows.find((user) => user.nin === "987654321")!.id;
        const rejected = await request.post(page.url(), {
            form: { ...organisation, legalContactId: jenniferId },
            maxRedirects: 0,
        });
        expect(rejected.status()).toBe(400);
        expect(await rejected.text()).toContain("Den juridiske kontakten må være medlem av organisasjonen.");

        await legalContactSelect(page).selectOption({ label: calvinOption });
        await page.getByRole("button", { name: "Lagre" }).click();
        await expect(page).toHaveURL(`/admin/organisasjoner/${id}`);

        const retainedMemberships = await database.query<{ organisation_id: string }>(
            `
                select membership.organisation_id
                from organisation_users membership
                join organisations o on o.id = membership.organisation_id
                where membership.user_id = $1 and o.name <> $2
            `,
            [calvinId, organisation.name],
        );
        const removal = new FormData();
        removal.set("intent", "organisations");
        removal.set("userId", calvinId);
        for (const membership of retainedMemberships.rows) {
            removal.append("organisationIds", membership.organisation_id);
        }
        const blocked = await request.post("/admin/kontakter", { form: removal });
        expect(blocked.status()).toBe(409);
        expect(await blocked.text()).toContain("før du fjerner medlemskapet");

        await addMember("987654321");
        await page.goto(editPath);
        await expect(legalContactSelect(page).locator("option:checked")).toHaveText("Ingen endring");
        await legalContactSelect(page).selectOption({ label: jenniferOption });
        const updatedShortName = `${organisation.name}_updated`;
        await page.getByRole("textbox", { name: "Kortnavn", exact: true }).fill(updatedShortName);
        await page.getByRole("button", { name: "Lagre" }).click();

        await expect(page).toHaveURL(`/admin/organisasjoner/${id}`);
        await expect(page.getByRole("region", { name: "Organisasjonsinformasjon" })).toContainText(updatedShortName);
        const legalContact = page.getByRole("region", { name: legalContactLabel, exact: true });
        await expect(legalContact.getByText("Jennifer Maarberg", { exact: true })).toBeVisible();
        await expect(legalContact.getByText("jennifer.maarberg@fint.no", { exact: true })).toBeVisible();
        await expect(legalContact.getByRole("button", { name: "Endre juridisk kontakt" })).toBeEnabled();

        const contacts = page.getByRole("region", { name: "Kontakter", exact: true });
        for (const name of ["Calvin Ball", "Jennifer Maarberg"]) {
            await expect(contacts.getByRole("rowheader", { name, exact: true })).toBeVisible();
            const remove = contacts.getByRole("button", { name: `Fjern ${name}` });
            if (name === "Jennifer Maarberg") await expect(remove).toBeDisabled();
            else await expect(remove).toBeEnabled();
        }
        expect((await request.post("/admin/kontakter", { form: removal })).ok()).toBe(true);
    });

    for (const [label, value, message] of [
        ["Vist navn", "", "Skriv inn visningsnavn."],
        ["Organisasjonsnummer", "", "Skriv inn organisasjonsnummer."],
        [domainLabel, "", "Skriv inn domenenavn."],
        [domainLabel, "https://rfk.no", "Skriv inn et gyldig domenenavn, for eksempel rfk.no."],
    ]) {
        test(`shows inline validation for ${label} with ${value || "an empty value"}`, async ({ page }) => {
            await openCreation(page);
            await fillDetails(page);

            const field = page.getByRole("textbox", { name: label, exact: true });
            await field.fill(value);
            await submit(page);

            await expect(page).toHaveURL("/admin/organisasjoner/ny");
            await expect(field).toHaveAttribute("aria-invalid", "true");
            await expect(field).toHaveAccessibleDescription(message);

            await expectOrganisationCount(0);
        });
    }

    for (const duplicateField of ["name", "orgNumber"] as const) {
        test(`rejects a duplicate ${duplicateField}`, async ({ page }) => {
            const existingName = duplicateField === "name"
                ? organisation.name
                : `pw_existing_${randomUUID()}`;

            const existingOrgNumber = duplicateField === "orgNumber"
                ? organisation.orgNumber
                : String(randomInt(100_000_000, 1_000_000_000));

            await insertOrganisation(existingName, existingOrgNumber);

            await openCreation(page);
            await fillDetails(page);
            await submit(page);

            await expect(page).toHaveURL("/admin/organisasjoner/ny");

            await expect(
                page.getByRole("alert").filter({ hasText: duplicateMessage }),
            ).toBeVisible();

            // Only the existing organisation should remain.
            await expectOrganisationCount(1);

            await expect(
                page.getByRole("textbox", {
                    name: "Vist navn",
                    exact: true,
                }),
            ).toHaveValue(organisation.displayName);

            await expect(
                page.getByRole("textbox", {
                    name: domainLabel,
                    exact: true,
                }),
            ).toHaveValue(organisation.primaryAssetId);
        });
    }

    test("cancelling returns to the list without creating an organisation", async ({ page }) => {
        await openCreation(page);
        await fillDetails(page);

        await page.getByRole("button", {
            name: "Avbryt",
            exact: true,
        }).click();

        await expect(page).toHaveURL("/admin/organisasjoner");

        await expect(
            page.getByRole("main").getByRole("heading", {
                name: "Organisasjoner",
                exact: true,
            }),
        ).toBeVisible();

        await expectOrganisationCount(0);
    });
});
