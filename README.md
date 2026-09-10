# Track Quality Pack

A web application that replaces the `TRACK QUALITY PACK.xlsx` workbook used by
Network Rail track engineering teams. Engineers complete the pack on a phone, tablet or
desktop — including on site — and export a workbook that matches the original format,
or a PDF report.

It covers the Track Quality Survey form, the line diagram, trace and CCQ chart with
annotation, and the TEF3071 and TEF3207 forms for each site in the pack.

## Technology

| Area | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase PostgreSQL via Prisma |
| Files | Local filesystem in development, Azure Blob Storage in production |
| Exports | ExcelJS (from the original workbook as a template) and pdf-lib |
| Tests | Vitest |
| Hosting | Azure App Service (Linux, Node 22) |

## Prerequisites

* Node.js 20 or later (22 recommended) and npm
* A Supabase PostgreSQL database
* An Azure Storage account for production file storage

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npx prisma generate
npx prisma migrate deploy    # creates the schema
npm run dev
```

The app runs at <http://localhost:3000>.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `Supabase_DB_URL` | yes | PostgreSQL connection string. Server-side only; never exposed to the browser |
| `AUTH_PROVIDER` | yes | `azure-easy-auth` in production, `dev` for local work |
| `DEV_USER_EMAIL`, `DEV_USER_NAME`, `DEV_USER_ROLE` | no | Local development identity. Ignored, and refused, in production |
| `STORAGE_PROVIDER` | yes | `azure-blob` in production, `local` for local work |
| `STORAGE_LOCAL_DIR` | no | Directory for local file storage (default `./storage`) |
| `AZURE_STORAGE_CONNECTION_STRING` | in production | Storage account connection string |
| `AZURE_STORAGE_CONTAINER` | in production | Blob container name |

Copy `.env.example` to `.env.local` and replace the placeholders. `.env*` files other
than the example are ignored by git; real credentials must never be committed.

## Database and migrations

The schema is defined in `prisma/schema.prisma` and the SQL is in
`prisma/migrations/`. Apply it with:

```bash
npx prisma migrate deploy
```

After changing the schema, create a migration with
`npx prisma migrate dev --name <change>` and commit the generated SQL.

## File storage

Photographs, traces, charts and selected diagram pages are written through
`src/lib/server/storage.ts`. Only the storage key is held in the database, so the
provider can change without a data migration. Local files are written to
`STORAGE_LOCAL_DIR`, which is git-ignored.

## Template mapping

`TRACK QUALITY PACK.xlsx` is used unmodified as the export template. The mapping between
application fields and workbook cells lives in `src/lib/config/cellMap.ts`, with field
definitions in `src/lib/config/fields.ts` and section definitions in
`src/lib/config/sections.ts`. These files are the single source of truth for the forms,
validation and both exports — if the workbook changes, edit them and nothing else.

Per-site values repeat down `TQS FORM` in bands: Track Details from row 25 and OTM
Details from row 48, four rows per site. TEF3071 and TEF3207 have one worksheet per
site. See `IMPLEMENTATION_PLAN.md` for the full mapping and its limitations.

## Tests

```bash
npm test          # unit and export tests
npm run test:watch
```

The suite covers cell mapping and site banding, navigation, validation, the shared data
model, annotation round-tripping, TEF calculations, authorisation, and the Excel and PDF
exports. `ACCEPTANCE_TESTS.md` lists the manual checks that need a running instance.

## Build and quality checks

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
npm start
```

The same checks run in `.github/workflows/ci.yml` for every push and pull request.

## Deploying to Azure

`.github/workflows/azure-deploy.yml` builds, checks and deploys the application to an
Azure Web App. `.github/workflows/main_app-track-quality-pack-web-dev.yml` performs the
same build for the `app-track-quality-pack-web-dev` app using a publish profile.

Both workflows ship a zipped package. The zip is required: GitHub artifacts skip
hidden files by default, which would drop `.next`, `node_modules/.bin` and the
generated `node_modules/.prisma` client, leaving the Web App with no build output and
no `next` binary. In that state App Service cannot start the site and every request
returns HTTP 503.

1. Create a Linux App Service on the Node 22 runtime.
2. Set the repository variables `AZURE_WEBAPP_NAME` and `AZURE_RESOURCE_GROUP`, and
   configure OIDC sign-in with the secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and
   `AZURE_SUBSCRIPTION_ID`.
3. In the Web App configuration, add the environment variables above as app settings.
   Use Key Vault references for `Supabase_DB_URL` and the storage connection string.
   Set the startup command to `npm start`, and leave
   `SCM_DO_BUILD_DURING_DEPLOYMENT` unset or `false` because the package is already
   built.
4. Enable App Service Authentication (Easy Auth) with Microsoft Entra ID and set
   `AUTH_PROVIDER=azure-easy-auth`.
5. Run `npx prisma migrate deploy` against the database when the schema changes.

## Security

* Credentials are supplied only through environment variables and Azure app settings;
  the repository contains placeholders only.
* Authentication is handled by Azure Easy Auth. The development provider refuses to
  start in production.
* Roles — contributor, reviewer and administrator — are enforced on the server for every
  write, not in the browser.
* All request bodies are validated against the declared field list before being stored,
  so unexpected input is rejected rather than persisted.
* Uploads are restricted by content type and size, and are stored outside the web root.
* Each pack carries a version; concurrent edits are rejected with a conflict response
  instead of silently overwriting another engineer's work.
* Connections to Supabase require TLS (`sslmode=require`).

## Known limitations

* Sites beyond the fourth get cloned TEF worksheets without the template's cross-sheet
  formulas.
* The PDF is generated from stored data, so it is not a pixel copy of the workbook's
  print layout.
* Network Rail GIS data is not yet integrated; the intended approach is described in
  `IMPLEMENTATION_PLAN.md`.
* The application requires connectivity; there is no offline mode.

## Backup and recovery

* Supabase takes automated daily backups with point-in-time recovery; confirm the
  retention period meets local requirements.
* Enable soft delete and versioning on the Azure Storage container so deleted media can
  be recovered.
* Both the schema and the workbook template are in version control, so a rebuild needs
  only the database and storage restores.
* Exercise a restore into a non-production environment periodically and run
  `ACCEPTANCE_TESTS.md` section 10 against it.

## Further documentation

* `IMPLEMENTATION_PLAN.md` — findings, mapping, assumptions and what could not be
  reproduced exactly
* `ACCEPTANCE_TESTS.md` — manual acceptance checklist
