# Implementation Plan

This document records what was found in the repository, how each source artefact was
turned into part of the application, the assumptions that were made, and the features
that could not be reproduced exactly.

## 1. Repository inspection

| File | Purpose | How it is used |
| --- | --- | --- |
| `GitHub Copilot Agent Prompt` | The specification for this work | Requirements source |
| `TRACK QUALITY PACK.xlsx` | The pack that engineers complete today | Authoritative source of sections, fields, option lists and cell addresses; also used unmodified as the export template |
| `NR_L3_TRK_003_TEF3071 FINAL.docx` | Standard behind the TEF3071 form | Cross-checked against the workbook's TEF 3071 sheets for field wording |
| `TEF3207_issue4_final.xlsx` | Issue 4 of the TEF3207 form | Cross-checked against the workbook's TEF3207 sheets |
| `IMDM Doncaster.pdf` | Line diagram for the delivery unit | Served page-by-page in the Diagram section for selection and annotation |

### Workbook structure

The workbook contains: `TQS FORM`, `DIAGRAM`, `TRACE`, `CCQ CHART`,
`TEF 3071 SITE 1`–`SITE 4`, `TEF3207 SITE 1`–`SITE 4`, plus hidden `DATA` and
`Sheet1` sheets holding the dropdown option lists.

Key findings that shaped the data model:

* **Site banding.** `TQS FORM` repeats a block of rows for each site rather than using
  one row per site. The *Track Details* band starts at row 25 and the *OTM Details*
  band at row 48; both advance four rows per site. This is expressed once, in
  `src/lib/config/cellMap.ts`, as a base row plus a stride.
* **Shared data.** The TEF sheets refer back to the TQS Form with cross-sheet formulas
  such as `='TQS FORM'!N2`. Each of those formulas became a `sharedFrom` declaration on
  the field, so a value typed once on the TQS Form appears everywhere it is needed.
* **Option lists.** The workbook's data validation is stored in an OOXML extension that
  most readers ignore, so the lists were read from the hidden `DATA` and `Sheet1`
  sheets and captured in `src/lib/config/fields.ts`.

### Worksheet to application section mapping

| Worksheet | Section | Notes |
| --- | --- | --- |
| `TQS FORM` | Track Quality Survey | Pack-level header plus per-site Track Details and OTM Details |
| `DIAGRAM` | Diagram | Select a page of `IMDM Doncaster.pdf`, then annotate it |
| `TRACE` | Trace | Upload or capture a trace image, then annotate it |
| `CCQ CHART` | CCQ Chart | Upload or capture a chart image, then annotate it |
| `TEF 3071 SITE n` | TEF3071 | One instance per site; work types, checklist and the ramp table |
| `TEF3207 SITE n` | TEF3207 | One instance per site; tick groups and the track condition lists |

## 2. Application design

* **Next.js 15 (App Router) + TypeScript + Tailwind.** Server components load data,
  client components handle capture, annotation and autosave. One responsive layout
  serves phones, tablets and desktops.
* **Configuration-driven forms.** `fields.ts`, `sections.ts` and `cellMap.ts` describe
  every field once: label, type, options, validation, shared-data source and workbook
  cell. Forms, validation, Excel export and PDF export all read the same definitions,
  so a labelling or cell change is a one-line edit in version control.
* **Prisma + Supabase PostgreSQL.** `User`, `Pack`, `Site`, `SectionData`,
  `MediaAsset`, `Annotation` and `Export`. Section values are stored as JSON keyed by
  field id, which keeps the schema stable as the workbook evolves.
* **Storage abstraction.** `src/lib/server/storage.ts` writes to the local filesystem
  in development and Azure Blob Storage in production. Only storage keys are held in
  the database.
* **Annotations** are stored as normalised 0–1 coordinates, so a mark made on a phone
  lands in the same place on a desktop and in the exported PDF.
* **Concurrency.** Every pack carries a `version`. Saves run in a transaction and are
  rejected with HTTP 409 if the version moved, so two engineers cannot silently
  overwrite each other.
* **Security.** Authentication is pluggable: Azure App Service Easy Auth in production,
  a development provider that refuses to run in production. Roles (contributor,
  reviewer, administrator) are enforced on the server for every write. All input is
  validated with Zod against the allowed field list before it reaches the database.

## 3. Assumptions

1. Sites are numbered from 1. Site *names* do not exist in the workbook, so they are
   stored in the application for navigation only and are not written to the export.
2. Where the workbook derived a value with a formula, the application recalculates the
   value and writes the result; the template's own formulas are left intact wherever
   they do not depend on application data.
3. TEF3207 tick cell addresses were inferred from the cells adjacent to each printed
   label. They are all in `cellMap.ts` and should be confirmed against a completed pack
   before first operational use.
4. The pack workflow (draft, in progress, ready for review, complete, archived) is not
   in the workbook; it was added to satisfy the review requirement in the specification.
5. Photographs are stored at their captured resolution; location is recorded only when
   the browser grants permission, and its absence never blocks a save.

## 4. Network Rail GIS data

`github.com/openraildata/network-rail-gis` republishes Network Rail Infrastructure
Network Model extracts under the Open Government Licence: `VectorLinks` (track-level
geometry categorised by ELR and track ID), `VectorNodes`, `VectorReferenceLines` (one
line per ELR), `VectorWaymarks` (mileposts), and organisational boundaries for MDU,
Region, Route, TME and TSM. The repository README notes the data is now out of date and
that the current source is the Rail Data Marketplace.

That data maps neatly onto fields this application already captures — ELR, track ID,
mileage and track section manager. The intended approach, which is **not implemented**
in this version:

1. Load `VectorReferenceLines` and `VectorWaymarks` into PostGIS in the Supabase
   database as reference tables, refreshed from the Rail Data Marketplace rather than
   the archived GitHub copy.
2. Turn a captured latitude/longitude into the nearest ELR and mileage, and offer that
   as a suggested value for the site's ELR and worksite mileage fields.
3. Validate that a typed ELR and mileage fall inside the selected TSM boundary, warning
   rather than blocking so that the engineer stays in control.
4. Attribute the data as required by the Open Government Licence.

This was deferred because it needs a PostGIS-enabled database and a licensing decision
about redistributing the extracts, neither of which is settled here.

## 5. Features that cannot be reproduced exactly

* **Sites beyond four.** The template ships with four TEF3071 and four TEF3207 sheets.
  For a fifth or later site the export clones sheet 1, copying values, styles and merged
  regions; cross-sheet formulas are not carried over because the source cells differ.
  Row banding on `TQS FORM` continues past site 4, so the workbook grows as expected.
* **Workbook data validation dropdowns.** The lists are enforced in the application, but
  the extension-based validation in the template cannot be rewritten by the export
  library, so the exported workbook keeps whatever validation the template had.
* **Print-perfect PDF.** The PDF is generated from stored data rather than by rendering
  the spreadsheet, so it is legible and complete but is not a pixel copy of the
  workbook's print layout.
* **Diagram rendering.** Pages of `IMDM Doncaster.pdf` are extracted server-side and
  embedded as single-page PDFs rather than rasterised in the browser, which avoids
  bundling a PDF rendering engine.
* **TEF3207 critical rail temperature.** The source workbook records tick boxes only and
  does not calculate a temperature, so the application derives the governing disturbance
  category and leaves the temperature to the engineer.

## 6. Verification

`npm test` covers cell mapping and site banding, navigation, validation, the shared data
model, annotation round-tripping, the TEF calculations, authorisation rules, and both
exports (the Excel test asserts values in the real template and the PDF test loads the
generated document). `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.
`ACCEPTANCE_TESTS.md` lists the manual checks that need a running database and a device
with a camera.
