# 9. GHL traps

Each one cost us real time on a live build. "Built in" says where this repo guards against it.

| # | Trap | What to do | Built in |
|---|---|---|---|
| T1 | Without a browser User-Agent every API call returns Cloudflare 403 "error code: 1010". It looks like an auth failure and is not one. | Always send a browser User-Agent. | `lib/http.js` sends it on every call; the error hint names it; test |
| T2 | A pipeline PUT with `locationId` in the body returns 422 "property locationId should not exist". | `locationId` in the query string. | `lib/ghl.js` strips it from the body; tests |
| T3 | An agency-level token fails with "user type mismatch". | A sub-account Private Integration token. | Error hint; CLIENT-CHECKLIST.md |
| T4 | Workflow detail, create, edit and delete are all 404. Workflows are UI-only. | Build from the checklist; verify by `GET /workflows/?locationId=` (name, status, version). | `checklist`, `verify` |
| T5 | No smart-list or saved-search endpoint exists. | Views are made in the UI. | Checklist "Views" section |
| T6 | A calendar PUT carrying only `openHours` reset `slotDuration` from 20 to 30. | Read the saved calendar, send all of it with the change, read it back and compare. | `calendarUpdateBody` refuses a partial update; build `--repair`; tests |
| T7 | `GET customFields` returns only custom fields, never GHL's ~35 stock fields. | A clash with a stock field shows as a create error, not in a read. | preflight note; build reports the error |
| T8 | No date-time field type; the API cannot create field folders. | Date fields; folders by hand if wanted. | `config/fields.json` |
| T9 | GHL keeps no empty custom value. | Store a single space for "not supplied yet"; fill it later. | build; `--repair` fills blanks; verify WARN |
| T10 | Internal notifications default to "All users", which emails our whole team every lead, in our workflows and in the client's own. | Particular users, always. Audit the client's published workflows when we join. | Workflow rules; checklist audit section; MANUAL row in verify |
| T11 | An agency owner can open a sub-account but is not a user of it, so nothing can be assigned to them. | Check `GET /users/?locationId=` lists every person. | `preflight --live`, build (calendar owner), verify |
| T12 | A form overwrites contact fields on submit, before any workflow runs. | Forms write only to Claimed staging fields; a workflow copies a first claim. | `config/forms.json`, §2.4, §5.2 |
| T13 | Public forms carry Cloudflare's bot check; an automated fill is stopped. | Never work around it. Test by writing the form's fields and enrolling the contact. | §8.2 |
| T14 | "Create opportunity" never updates; with duplicates off it silently skips. | Find opportunity, then Update opportunity. Earlier stage needs "allow previous stage". | Workflow rules |
| T15 | Duplicating a workflow turns dropdown values in Update-opportunity steps into free text. | Delete those rows and add them again. | §5.3 steps |
| T16 | The builder wedges after about 20 edits; a reload drops unsaved work. If / else inserted mid-chain puts the following steps in the first branch. | Header Save often; check the branch before saving; verify by API. | Workflow rules; §5.2 step text |
| T17 | An Inbound Webhook trigger only offers keys it has seen in a sample, and needs a sample before it saves. A POST while the workflow is in Draft is not kept as a sample. | Send one sample with an `@example.com` lead; type unseen keys as `{{inboundWebhookRequest.<key>}}` (an orange token is valid). | §5.1 steps |
| T18 | GHL merges contacts by phone. A test lead that reused a phone merged into another test contact. | Every test contact gets a unique phone, or none. | §8.2; checklist |
| T19 | Without Stripe the Affiliate Manager runs a Forms campaign only: leads, not money. Funnels need a product before a reward can be set. | Keep it on Forms; commissions stay in Referred Leads. | §6 |
| T20 | A2P is per sub-account and in the client's name. | The client registers; SMS stays off until approved. | §7.3; preflight go-live row |
| T21 | GHL settings pages save the last click late; navigating away lost it twice. | Wait about 6 seconds, reload in a new tab, check every value. | Checklist audit section |
| T22 | The pipeline board hides closed deals, so it under-reports what a pipeline holds. | Query the API before judging a pipeline's contents. | `build --live --check` reads first |
| T23 | GHL marks the combined "Create/Update opportunity" action as deprecated. | Use Create opportunity, or Find + Update. | Workflow rules |

Browser-only traps (for whoever clicks through the UI): the workflow builder is a cross-origin iframe; open a workflow from the list page; task "Assign to" dropdowns can stay open and swallow the next click; rich-text boxes take HTML through their `</>` source view; today's date is Dynamic -> Right now -> Date; waits stop at days, so a month is 30 days. Keep the GHL tab visible: a hidden tab stops its dropdowns.
