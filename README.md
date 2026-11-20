# FINT Selvbetjening

A proof of concept for a FINT self-service app. The UI is in Norwegian. Nothing here talks to Digdir yet — Maskinporten calls are mocked so we can see the flow before wiring a real certificate and admin client.

## What problem this is solving

A kommune that wants to use FINT needs a **Maskinporten client**. Maskinporten is Digdir’s API for machine-to-machine login. The client proves who it is with a **private key**, not a password.

In production that registration happens against Digdir:

1. `POST /clients/` — create the client (name, scopes, how it authenticates)
2. `POST /clients/{client_id}/jwks` — upload the **public** key so Maskinporten can verify the client later
3. The kommune keeps the **private** key and uses it to get tokens

This app is practising that consumer flow. Maskinporten is mocked with MSW; request and response are printed in the server logs.

Docs: [Selvbetjening av Maskinporten via API](https://docs.digdir.no/docs/Maskinporten/maskinporten_sjolvbetjening_api)

## What you can do in the app

| Page | URL | What it is |
| --- | --- | --- |
| Home | `/` | Placeholder |
| Integrasjoner | `/integrasjoner` | List of integrations from the `integrations` table |
| Ny integrasjon | `/integrasjoner/ny` | Create form (Maskinporten calls are mocked and logged on the server) |
| Komponenter | `/komponenter` | Turn components on for the current organisation |
| Kontakter | `/kontakter` | Contacts from the `users` table |
| Testrunner | `/testrunner` | Metadata catalog that will drive the test-runner report |

Login is the `x-nin` header from the header app (same as kundeportalen). The root loader looks that nin up in `users`. Missing header is **401**; header present but no row is **406**. Seed user for local testing: **Calvin Ball**, nin `123456789`.

Other pods can list the components that are on for an organisation without `x-nin`:

```http
GET /api/organisation/{organisationId}/components
```

`organisationId` can be the organisation UUID, technical name, or organisation number. Unknown ids return **404**. A known organisation returns a JSON array of enabled components (`id`, `name`, `description`, `category`, `basePath`).

## What happens when you create an integration

`/integrasjoner/ny` is a three-step Aksel stepper: **Detaljer** → **Nøkkel** → **Ferdig**.

**Detaljer** asks for a name, type (Klient / Adapter), and FINT components that are on for the current organisation. **Neste** POSTs to Maskinporten `/clients` (mocked). Request and response are printed in the server logs.

**Nøkkel** asks how to add a key:

- **Generer nøkkel for meg** — the app creates an RSA key pair and POSTs the public JWK to `/clients/{client_id}/jwks` (mocked). The private key stays on the server.
- **Bruk egen offentlig nøkkel** — paste a public JWK or JWKS. Only the public key is uploaded. The private key never leaves the client.

**Ferdig** confirms the integration and links back to the list.

Scopes are built as `fint:{category}:{name}:{type}`. The mock adds `client_id` (UUID) and `client_orgno`.

## What is not built yet

| Next | Meaning |
| --- | --- |
| Download the private key once | Let the user save the PEM file; do not keep showing it |
| Live Digdir | Needs an admin client, virksomhetssertifikat, and scope `idporten:dcr.write` |
| Getting tokens | `POST /token` — later |
| Creating scopes | `POST /scopes` — that is the API-provider flow, not this form |

## Important: this is all fake data

- Integrations are stored in Postgres (`name`, `type`, `client_id`, component links). Keys, JWKs, tokens, and secrets are not saved.
- Maskinporten calls go to MSW (`https://api.test.samarbeid.digdir.no`), not Digdir.
- Private keys live in a `Map` on the Node process. Restart and they are gone.

## Database

Postgres is set up the same way as `fint-frontend-analytics`: Docker Compose, init SQL, and a `pg` pool.

The first table is `users`, matching a FINT contact:

```json
{
  "nin": "123456789",
  "firstName": "Calvin",
  "lastName": "Ball",
  "mail": "calvin.ball@fint.no",
  "mobile": "+4712345678"
}
```

The header shows the name from this table when `x-nin` matches a row.

Users belong to organisations through `organisation_users`. Seed organisation:

```json
{
  "name": "jennifer_test",
  "displayName": "Test Organisation 1",
  "orgNumber": "123456789",
  "primaryAssetId": null
}
```

Calvin Ball is a member of that organisation. Jennifer Maarberg is also a member of **Test Organisation 2**. The header shows a company dropdown when the user belongs to more than one organisation. The last choice is stored in the `organisation` cookie for two weeks.

`users.is_admin` grants access to the platform-wide **Admin** menu. **Jennifer Maarberg** (`x-nin: 987654321`) has this access. The admin contact list shows the **Admin** tag when a contact has `organisation_users.is_admin` set for at least one membership. The contact detail page shows the status on each membership. Migration 011 copies existing admin flags to current memberships. New memberships default to non-admin. The ordinary **Kontakter** list only shows people in the current organisation.

The `components` table holds FINT components (`name`, `description`, `category`, `base_path`). Category is the first segment of the path, e.g. `/administrasjon/fullmakt` → `administrasjon`. `/komponenter` lists the catalog so the current organisation can turn components on. Which ones are on is stored in `organisation_components`. The new-integration form only shows components that are on for the current organisation.

The `integrations` table holds name, type (klient/adapter), optional Maskinporten `client_id`, linked components, and the organisation they belong to. The list only shows integrations for the current organisation. It does not store private keys, public JWKs, tokens, or other secrets.

Init SQL only runs on an **empty** volume. To recreate from the cleaned files:

```bash
docker compose down -v && docker compose up -d db
```

Apply any pending organisation migrations in order to an existing local volume:

```bash
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U selvbetjening -d selvbetjening < db/init/008_add_organisation_legal_contact.sql
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U selvbetjening -d selvbetjening < db/init/009_require_legal_contact_membership.sql
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U selvbetjening -d selvbetjening < db/init/010_add_organisation_primary_asset_id.sql
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U selvbetjening -d selvbetjening < db/init/011_add_organisation_membership_admin.sql
```

`primary_asset_id` stores the organisation's domain, for example `rfk.no`. Existing organisations have a null value until a domain is supplied.

When creating an organisation, enter its display name, organisation number, and domain. The domain becomes its primary asset ID, and the technical name replaces the dots with underscores, for example `rfk_no`. New organisations start without a legal contact. Open an organisation from the list to view its details, legal contact, and contact list. The management controls on that page, the **Velg juridisk kontakt** button, and the organisation row menu are placeholders. Migration 009 clears legal contact assignments to nonmembers.

### Start Postgres

```bash
docker compose up -d db
```

Default local credentials:

- database: `selvbetjening`
- user: `selvbetjening`
- password: `selvbetjening`
- host: `localhost`
- port: `5432`

### Configure environment

Create `.env` in the project root:

```bash
DATABASE_URL=postgres://selvbetjening:selvbetjening@localhost:5432/selvbetjening
METADATA_ENDPOINT=http://localhost:8080/
```

`METADATA_ENDPOINT` is the FINT metadata catalog. The server GETs that URL and expects a JSON list of `Metadata` (`domainName`, `packageName`, `resourceName`, plus fields, id fields, writeable, and relations). If the variable is unset, it falls back to `http://localhost:8080/`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or the next free port, often 5174). Node 24 is what the Dockerfile uses.

```bash
npm run typecheck
npm run test:run
npm run build
```

## Tests

Unit tests use **Vitest** and **MSW**. MSW only mocks **external** services this app would call. Contacts, clients, organisations, and the rest of kunde-portal data belong in the React server / database — those are not mocked.

External mocks (see `mocks/`):

- metadata — FINT metadata catalog (`METADATA_ENDPOINT`, tests only)
- test-runner — basistest health / basic / run
- link-walker — relation tests
- felleskomponent events API
- admin portal component configurations
- Maskinporten — `POST /clients` and `POST /clients/{client_id}/jwks`

```bash
npm test
npm run test:run
```

## Where the code lives

| File | Role |
| --- | --- |
| `app/utils/headerProperties.ts` | Reads `x-nin` from the incoming request |
| `app/server/auth.server.ts` | `fetchMe`: look up user by `x-nin` |
| `app/server/db.server.ts` | Postgres pool |
| `app/server/users.server.ts` | Users table queries |
| `app/server/organisations.server.ts` | Organisations and membership queries |
| `app/server/components.server.ts` | Components table queries |
| `db/init/001_create_users.sql` | Users table + Calvin Ball and Jennifer Maarberg |
| `db/init/002_create_organisations.sql` | Organisations, membership, Test Organisation 1 |
| `db/init/003_create_components.sql` | Components table + seed |
| `db/init/004_create_integrations.sql` | Integrations linked to an organisation |
| `db/init/005_create_organisation_components.sql` | Components turned on per organisation |
| `app/routes/admin/` | Admin contacts, organisations, components, and create forms |
| `app/types/integrations.ts` | Klient/adapter, components |
| `app/server/integrations.server.ts` | Integrations table queries |
| `app/server/maskinporten.server.ts` | Payload, Maskinporten HTTP calls, key generation |
| `app/routes/contacts/list.tsx` | Contacts in the current organisation |
| `app/routes/components/list.tsx` | Turn components on for the current organisation |
| `app/routes/api/organisations/components.ts` | JSON list of enabled components for an organisation |
| `app/types/metadata.ts` | Metadata catalog entries |
| `app/server/metadata.server.ts` | GET `METADATA_ENDPOINT` |
| `app/routes/testrunner/list.tsx` | Metadata list for the coming test-runner report |
| `app/routes/integrations/list.tsx` | Integrations list |
| `app/routes/integrations/new.tsx` | Create form |
| `app/root.tsx` | Header, footer, menu |
| `mocks/` | MSW for external services (test-runner, events, …) |
| `test/setup.ts` | Starts the MSW server for unit tests |

## Browser tests with Playwright

Playwright runs Chromium tests from `e2e/` against a dedicated development server at
`http://127.0.0.1:5175`. It starts and stops that server automatically; keep that port free.
Vitest continues to run the existing unit tests separately.

Start the local Postgres container and configure `.env` as described above. The tests
require the seeded Calvin Ball and Jennifer Maarberg accounts, including their original
admin flags and organisation memberships. Use a local development database: the tests
read its users and contacts. No external FINT services are needed for these initial tests.

```bash
# Once after installing dependencies (and after Playwright browser upgrades):
npx playwright install chromium

# Run browser tests:
npm run test:e2e

# Open the interactive test runner or run with a visible browser:
npm run test:e2e:ui
npm run test:e2e:headed

# View the latest HTML report:
npm run test:e2e:report
```

To select a user in a test, set the request header for that test group:

```ts
test.use({ extraHTTPHeaders: { "x-nin": "987654321" } });
```

Use `123456789` for Calvin (ordinary user) or `987654321` for Jennifer (admin).
Playwright supplies the header automatically, so browser extensions are unnecessary.
Tests currently use one worker to avoid concurrent user sessions against the app's
shared static request-header state.
