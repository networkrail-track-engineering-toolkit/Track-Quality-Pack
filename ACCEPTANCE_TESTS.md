# Acceptance Tests

Manual checks to run against a deployed instance with a real database, storage account
and signed-in user. Automated coverage is in `tests/` and runs with `npm test`.

Record the result of each check as pass or fail, with the date, tester and build.

## 1. Access and roles

| # | Check | Expected result |
| --- | --- | --- |
| 1.1 | Open the app while signed out | Redirected to sign in; no pack data is visible |
| 1.2 | Sign in as a contributor | Own packs listed; create pack available |
| 1.3 | As a contributor, open another user's pack | Read-only; saving is refused |
| 1.4 | As a contributor, set status to Complete | Refused |
| 1.5 | As a reviewer, set a pack to Complete | Accepted |
| 1.6 | As an administrator, archive and reopen a pack | Accepted |
| 1.7 | Call a save endpoint directly without a session | HTTP 401, nothing written |

## 2. Creating a pack

| # | Check | Expected result |
| --- | --- | --- |
| 2.1 | Create a pack with a reference and title | Pack opens on the TQS Form |
| 2.2 | Leave the reference blank | Creation refused with a clear message |
| 2.3 | Reopen the pack later | All entered values are still present |

## 3. TQS Form and shared data

| # | Check | Expected result |
| --- | --- | --- |
| 3.1 | Every field on the paper form has a control in the app | Confirmed against the workbook |
| 3.2 | Dropdowns offer exactly the workbook's options | Confirmed against `DATA`/`Sheet1` |
| 3.3 | Enter TGS, assisting TGS, location and date | Saved without a manual save action |
| 3.4 | Open TEF3071 for site 1 | Location, ELR and line speed are already filled from the TQS Form |
| 3.5 | Change the location on the TQS Form | The change appears in TEF3071 and TEF3207 |
| 3.6 | Type a different ELR directly in TEF3071 | The typed value is kept and not overwritten |
| 3.7 | Enter a date in the wrong format | Rejected with an explanatory message |

## 4. Multiple sites

| # | Check | Expected result |
| --- | --- | --- |
| 4.1 | Add a second site | New TEF3071 and TEF3207 entries appear in the navigation |
| 4.2 | Enter different values for each site | Values stay with their own site |
| 4.3 | Add a fifth site | Accepted; navigation and forms behave as for sites 1–4 |
| 4.4 | Reduce the site count | A confirmation is required before any data is removed |
| 4.5 | Cancel that confirmation | Nothing is deleted |

## 5. Photographs and location

| # | Check | Expected result |
| --- | --- | --- |
| 5.1 | Take a photo on a phone | Uploads and appears in the section |
| 5.2 | Upload an existing image on a desktop | Uploads and appears in the section |
| 5.3 | Grant location permission and take a photo | Latitude and longitude are shown with the photo |
| 5.4 | Deny location permission | The photo still saves; no location is shown |
| 5.5 | Add a caption, then delete a photo | Caption saves; deletion removes the image and its file |
| 5.6 | Upload a file that is not an image | Rejected with a clear message |

## 6. Diagram, trace and CCQ chart

| # | Check | Expected result |
| --- | --- | --- |
| 6.1 | Open the Diagram section | Pages of `IMDM Doncaster.pdf` can be browsed |
| 6.2 | Select the page covering the worksite | The page is attached to the pack |
| 6.3 | Draw arrows, lines and text on the page | Marks appear where drawn |
| 6.4 | Undo, then clear | Marks are removed as expected |
| 6.5 | Reload the page | Annotations are exactly where they were left |
| 6.6 | Open the same annotated item on a different screen size | Marks stay aligned to the image |
| 6.7 | Repeat 6.3–6.6 on the Trace and CCQ Chart sections | Same behaviour |

## 7. TEF3071 and TEF3207

| # | Check | Expected result |
| --- | --- | --- |
| 7.1 | Compare TEF3071 in the app with the workbook sheet | All fields present, same wording |
| 7.2 | Complete the ramp table | Values save per row and column |
| 7.3 | Answer No to a checklist item | The form indicates that mitigation is required |
| 7.4 | Compare TEF3207 in the app with the workbook sheet | All fields and tick groups present |
| 7.5 | Select CWR and several track conditions | The governing condition shown is the most onerous selected |
| 7.6 | Switch to jointed track | The condition list changes to the jointed list |

## 8. Exports

| # | Check | Expected result |
| --- | --- | --- |
| 8.1 | Export a completed pack to Excel | Downloads and opens in Excel without a repair prompt |
| 8.2 | Compare the export with the original workbook | Layout, styling and print setup are unchanged |
| 8.3 | Check values cell by cell for site 1 | Every value is in the cell the paper form uses |
| 8.4 | Check a pack with four sites | Site 4 values are 12 rows below site 1 in each band |
| 8.5 | Check a pack with five sites | `TEF 3071 SITE 5` and `TEF3207 SITE 5` exist and are correct |
| 8.6 | Confirm photographs appear in the export | Images are placed in the relevant sheets |
| 8.7 | Export the same pack to PDF | All sections, sites, photos and annotations are included and legible |
| 8.8 | Export an empty pack | Succeeds, with blanks rather than an error |

## 9. Devices and resilience

| # | Check | Expected result |
| --- | --- | --- |
| 9.1 | Use the app on a phone in portrait | No horizontal scrolling; controls are usable with one hand |
| 9.2 | Use the app on a tablet and a desktop | Layout adapts; no clipped content |
| 9.3 | Navigate the form with a keyboard only | Every control is reachable and clearly focused |
| 9.4 | Interrupt the network while typing | A save failure is reported; retrying succeeds |
| 9.5 | Open the same pack in two browsers and save both | The second save is refused with a conflict message |
| 9.6 | Restart the application | No data is lost |

## 10. Deployment

| # | Check | Expected result |
| --- | --- | --- |
| 10.1 | Run `npx prisma migrate deploy` on a clean database | All tables are created |
| 10.2 | Start the app with no `Supabase_DB_URL` | Fails immediately with a clear message |
| 10.3 | Inspect the repository for credentials | None present; only `.env.example` placeholders |
| 10.4 | Restore the database from a backup | The app runs against the restored data unchanged |
