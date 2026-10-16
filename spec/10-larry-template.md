# 10. The larry template: speed to lead, reactivation, partner emails

An opt-in layer on top of the standard build. It copies what we built for Larry Gilmore (ClearBlu Capital Group, a lender) in Sep-Oct 2026: speed to lead for ad leads (STL), database reactivation (REACT) and the partner email layer (AFF). Switch it on in `client.yaml` with `template: { name: larry }`. The files are in `templates/larry/`; how to run it is in [CODEX.md](../CODEX.md).

Sources, newest wins: the live account, read with GET requests only on Oct 17 2026 (**Live**; names kept in `tests/fixtures/larry-live-2026-10-17.json`); Larry's GHL Build Record, as built, updated to Oct 16 (**BR §x**); Justin's build spec of Sep 28 (**Spec §x**); the delivery plan (**DP**); the finalized partner copy and the approved reactivation copy (**Copy**); the FinBay build plan, our first mapping of Larry's build onto this repo (**FinBay**).

## §10.1 What it adds, and why it is a layer

The standard build (spec §1-§9) is the partner foundation. Larry's account has that foundation too (BR §4), and his partner emails run on it. So the template does not replace the standard build: it adds three programs to it.

| Program | Built by the API | Built in the UI, from the checklist | Copy (DRAFT) |
|---|---|---|---|
| STL | 2 fields, 13 tags (6 STL + 7 source), `STL \| Inbound Leads` if the client has no lead pipeline, the custom values | 3 workflows | 4 texts, 3 emails, the alerts |
| REACT | 5 fields, 13 tags | 6 smart lists, up to 7 workflows (one per segment that gets messages, Re-entry, Reply Router), segment tagging | 2 sequences of 5 messages, Re-entry |
| AFF emails | 11 status tags + 1 queue tag per outreach list | 5 workflows + 1 per outreach list, additions to 2 standard workflows, email templates | Welcome, 8 nurture, 4 per outreach list, call booked, no-show, check-ins, reply snippets |

Why `client.yaml template.name` and a `templates/<name>/` folder: the code already turns JSON plus `client.yaml` into one build, and a template is more of the same JSON. One switch in `client.yaml` keeps every client's choice in its one file, and a second template later is a new folder, not new code. The template's objects go through the same build, verify and checklist code, so the same safety rules apply: create-only, never delete or rename, Draft first, verify by name.

## §10.2 Inputs

All in `client.yaml` under `template:` (commented in `client.example.yaml`). An input left out takes the source build's value from `templates/larry/defaults.json`, so `template: { name: larry, value_prefix: cb, sender_name: <Larry's name> }` rebuilds Larry's structure (tested against Live).

- `value_prefix` (custom values become `<prefix>_quick_app_url` etc.; Larry: `cb`), `sender_name`, `sender_phone`, `sender_email`, `assistant_email` (reply and call tasks; Larry: his assistant), `owner_email` (owner tasks, the new-lead SMS alert).
- `sending_window` (REACT; as built Mon-Fri 9-5 account time zone, BR §7).
- `stl`: `enabled`, `lead_trigger`, `source_tag`, `own_lead_pipeline` with `own_lead_stage`, `own_app_done_stage`, `own_replied_stage`, `quick_app_url`.
- `react`: `enabled`, `past_client_data`, `drip_batch_size`, `drip_days`, `segments` (num, name, sequence `its-me` / `check-in` / `aff-handoff`, `email_only`, `rule`).
- `aff_email`: `enabled`, `broker_intake_shell`, `referral_form_url`, `partner_signup_url`, `outreach` (key, name, copy `introducer` / `peer`, audience).
- `copy`: the few words the copy needs (`lead_topic`, `customer_type`, `customer_word`, `offer_verb`, `offer_line`, `app_line`, `deal_word`) and `approved`.

`preflight` checks them only when the template is on. `value_prefix` and `sender_name` block the build, because they name custom values and the build never renames.

## §10.3 Data: custom values, fields, tags, pipelines

**Custom values** (`templates/larry/custom-values.json`): `<p>_quick_app_url`, `<p>_partner_signup_url`, `<p>_partner_calendar_url` (the standard calendar's booking link), `<p>_referral_form_url`, `<p>_<sender first name>_phone`, `<p>_<sender first name>_email`, `<p>_assistant_email`. Blank = a single space until supplied (trap T9).

**Fields** (`fields.json`), names, types and options as Live: `stl_first_touch_at` (DATE), `stl_status` (new, contacted, replied, no-response, quick-app-complete, handoff), `react_segment` (`<num>-<key>` per segment), `react_style` (check-in, its-`<sender first name>`, whats-changed), `react_batch` (TEXT), `react_last_touch_at` (DATE), `react_context` (TEXT).

Larry's `aff_*` fields are mapped onto the standard build's fields, as in the FinBay plan: `aff_category` -> Partner Type, `aff_partner_tier` -> Partner Tier, `aff_referred_by` -> Referring Partner Name / ID, `aff_referrals_count` -> Referrals Sent, `aff_signed_date` -> Agreement Signed Date, `aff_status` -> the deal's stage. `aff_broker_type`, `aff_comp_model`, `aff_last_checkin_at` and `aff_has_list` are not templated: no as-built workflow uses them (BR §1, §3b, §8; Live forms do not ask for them, BR §3b).

**Tags** (`tags.json`), names as Live: `src:` fb-ad, ig-ad, website-form, quick-app, partner-referral, instantly, linkedin; `stl:` new, contacted, replied, no-response, quick-app-complete, handoff-`<sender first name>`; `react:segment-NN` per segment, queued, sent, replied, interested, not-now, do-not-contact, excluded; `aff:` prospect, outreach-sent, replied, call-booked, signed, onboarded, active, dormant, declined, referred-lead, no-show, and `aff:queue-<key>` per outreach list.

**Pipelines** (`pipelines.json`): `STL | Inbound Leads` (New Lead, Contacted, Engaged, Quick App Complete, Handed to `<sender first name>`, No Response / Not a Fit), only when `stl.own_lead_pipeline` is empty. `AFF | Broker Intake` (shell, five stages) only with `aff_email.broker_intake_shell: true`. Partner deals use the standard Partner Recruiting and Partner Lifecycle pipelines instead of Larry's `AFF | Partner Pipeline` (FinBay).

## §10.4 Speed to lead

Three workflows (`workflows.json`, program `stl`), steps as BR §3, §6 and §7:

- `STL | Ad Lead - Instant Response`: "already contacted?" check, source and `stl:new` tags, status and first-touch date, the deal in the lead pipeline at its first stage ("{{contact.name}} - Ad Lead", duplicates off), assign to the assistant if unassigned, SMS 01, 1 minute, Email 01, email alert to the alert users and an SMS alert to the owner, `stl:contacted`, 2 minutes, add to the ladder, and drop the ad source tag on partner referrals. Stop on response OFF. Window: every day 8 AM-8 PM contact time zone (Spec §2.7).
- `STL | Ad Lead - Follow-Up Ladder`: 15 minutes, "replied yet?", SMS 02, 1 d, Email 02, 1 d, SMS 03, 2 d, Email 03, call task, 3 d, SMS 04, `stl:no-response` + the unfinished-application segment tag. Goal `stl:quick-app-complete` -> handoff tag, status, alert, deal to the "application done" stage. Stop on response ON.
- `STL | Inbound Reply Router`: customer replied with `stl:contacted`, not `stl:replied`: tag, status, out of the ladder, optional stage move, alert with the reply, task "within 1 hour" to the assistant.

## §10.5 Reactivation

Six segments as smart lists (`smart-lists.json`), each filtered on `react:segment-NN` (BR §7), with the rule for who gets the tag (from Larry's inventory, generalized). One workflow per segment that gets messages (all but the `aff-handoff` one): safety check on `react:excluded`, `react:sent`, then SMS 0, 30 min, Email 0, 3 d, Email 3, 4 d, SMS 7, 7 d, Email 14, `react:not-now`, 60 d, Re-entry (BR §2, §6). Email-only segments skip the texts. No trigger: enrollment is a bulk-action drip from the smart list (Spec §4.4 A). Window as `sending_window` (BR §7: Mon-Fri 9-5, account time zone). `REACT | Re-entry - Check-in` sends one email. `REACT | Reply Router`: keyword branches Stop / Not now / Wrong person / Interested, the Interested card in the lead pipeline at its first stage (BR §6, §7). No exclude list (BR §2, DECISIONS #87); the `react:excluded` check stays.

## §10.6 Partner emails

On the standard partner build (FinBay). Workflows (`workflows.json`, program `aff`), steps as BR §3b, §6 and §8:

- `AFF | Call Booked` (confirmation email, tag, deal to Booked, out of nurture and outreach, alert; the 1-hour SMS reminder only once A2P is approved), `AFF | Call No-Show` (tag, one re-offer email), `AFF | Reply Router` (two reply triggers, keyword branches Stop / Not interested / Comp question / Other, no stage moves), `AFF | Partner Nurture - Every Other Day` (8 emails, 2 days apart, from `aff:signed`), `AFF | Partner Check-In - 30/60` (30 d, then Day 30 + Day 60 if no referral yet, else Day 60), and one `AFF | Outreach - <list>` per outreach list (`aff:queue-<key>`, Email 1, 3 d, Email 2 as a reply, 4 d, Email 3, 5 d, Email 4).
- Additions to the standard workflows, in the checklist: Partner Sign-Up gets the Welcome email, `aff:signed`, an alert and the 7-day activation task (Larry's `AFF | Partner - Signed Up`); Referral Capture's first-claim branch gets `aff:referred-lead`, `src:partner-referral` and the hand-off to STL (Larry's `AFF | Referral Received`).
- SMS steps appear only when `sms.a2p_status` is `approved` (BR §8: left out until A2P). No sending window on AFF (BR §8).

## §10.7 Copy

`templates/larry/copy/*.md`, rendered by `checklist` into `out/template-copy.md` with the client's values. Every file is DRAFT: the client approves it in writing before anything that sends is switched on (`template.copy.approved`). Structure, cadence and subject-line shape follow Larry's approved copy. Business-specific lines (a story, a product list) are `[[WRITE: ...]]` prompts, filled for each client. Loan products, prices, rates and fee amounts never appear.

## §10.8 Parity: Larry's live build -> the template

Coverage: **API** = `build --live` creates it and `verify --live` checks it. **Checklist** = built in the UI from `out/ui-checklist.md`; workflows and forms are verified by name. **Copy** = in `out/template-copy.md`. **Not covered** = left out, with the reason.

| # | Larry's component (Live name) | Template | Coverage | Source |
|---|---|---|---|---|
| 1 | `cb_quick_app_url` | `<p>_quick_app_url` | API | Live; BR §1, §7 |
| 2 | `cb_partner_signup_url` | `<p>_partner_signup_url` | API | Live; BR §6 |
| 3 | `cb_partner_calendar_url` | `<p>_partner_calendar_url` (booking link) | API | Live; BR §1 |
| 4 | `cb_referral_form_url` | `<p>_referral_form_url` | API | Live; BR §6 |
| 5 | `cb_larry_phone` | `<p>_<first name>_phone` | API | Live; BR §6 |
| 6 | `cb_larry_email` | `<p>_<first name>_email` | API | Live; BR §6 |
| 7 | `cb_assistant_email` | `<p>_assistant_email` | API | Live; BR §6 |
| 8 | `cb_what_changed` | none | Not covered: style 3 is obsolete, the approved copy has 2 sequences | Live (blank); BR §2, §5; FinBay |
| 9 | `cb_partner_comp_line` | the standard `Partner Commission Rate` | Not covered: no email uses it (Larry, Oct 13: terms on the call only) | Live; BR §7; Copy |
| 10 | `stl_first_touch_at`, `stl_status` | same | API | Live; Spec §2.2 |
| 11 | `react_segment`, `react_style`, `react_batch`, `react_last_touch_at`, `react_context` | same (options from the segments and the sender) | API | Live; Spec §2.2 |
| 12 | `aff_category`, `aff_partner_tier`, `aff_referred_by`, `aff_referrals_count`, `aff_signed_date` | standard Partner Type, Partner Tier, Referring Partner Name/ID, Referrals Sent, Agreement Signed Date | API (standard build) | Live; FinBay §3 |
| 13 | `aff_status` | the deal's stage in the standard pipelines | API (standard build) | Live; FinBay §3 |
| 14 | `aff_broker_type`, `aff_comp_model`, `aff_last_checkin_at`, `aff_has_list` | none | Not covered: no as-built workflow or form uses them | Live; BR §3b, §8 |
| 15 | Tags `src:` (7 of 8) | same | API | Live; Spec §2.3 |
| 16 | Tag `src:import-2026-09` | none | Not covered: one client's dated import batch | Live |
| 17 | Tags `stl:` (6) | same; `stl:handoff-larry` becomes `stl:handoff-<first name>` | API | Live; Spec §2.3 |
| 18 | Tags `react:` (13) | same, one segment tag per segment | API | Live; Spec §2.3 |
| 19 | Tags `aff:` status (11) and `aff:queue-*` (4) | same; one queue tag per outreach list | API | Live; Spec §2.3; BR §8 |
| 20 | Tags `aff:tier-1-referral`, `aff:tier-2-broker`, `aff:broker-*` (3), `aff:has-list` | standard Partner Tier and Partner Type fields | Not covered: replaced by the standard fields | Live; FinBay §3 |
| 21 | Pipeline `STL \| Inbound Leads` | same, stages as Live | API (only without an own lead pipeline) | Live; Spec §2.4; BR §1 |
| 22 | Larry's own lead pipeline (new leads at Lead, app done at Application Received) | `stl.own_lead_pipeline` + stages, used by name | Checklist (referenced, never built or edited) | Live; BR §7 |
| 23 | Pipeline `AFF \| Partner Pipeline` | standard Partner Recruiting + Partner Lifecycle | API (standard build) | Live; FinBay §3 |
| 24 | Pipeline `AFF \| Broker Intake` (shell) | same, off by default | API (opt-in) | Live; Spec §2.4; BR §1 |
| 25 | Calendar `AFF \| Partner Intro Call – 20 min` | standard Partner Intro Call calendar (`naming.prefix: "AFF \| "` gives `AFF \| Partner Intro Call`) | API (standard build); daily max 4 in the checklist | Live; BR §1, §7 |
| 26 | Forms `AFF \| Partner Sign-Up`, `AFF \| Referral Submission` | standard Partner Sign-Up and Refer a Client forms | Checklist (standard build) | Live; BR §3b |
| 27 | `STL \| FB Lead – Instant Response` | `STL \| Ad Lead - Instant Response` | Checklist | Live (published v6); BR §3, §6, §7 |
| 28 | `STL \| FB Lead – Follow-Up Ladder` | `STL \| Ad Lead - Follow-Up Ladder` | Checklist | Live (published v6); BR §3, §6, §7 |
| 29 | `STL \| Inbound Reply Router` | same | Checklist | Live (published v4); BR §3, §6 |
| 30 | `REACT \| Segment 01/02/03/04/06` (5) | one per messaged segment | Checklist | Live (all Draft); BR §2, §6, §7, §9 |
| 31 | `REACT \| Re-entry – Check-in` | same | Checklist | Live (Draft); BR §2 |
| 32 | `REACT \| Reply Router` | same | Checklist | Live (published v6); BR §2, §6, §7 |
| 33 | 6 smart lists `REACT \| 01 - Past Borrowers` ... `06 - Long Tail` | one per segment, tag filter | Checklist (no smart-list API) | BR §7 (not readable over the API) |
| 34 | REACT sending window Mon-Fri 9-5 account time zone | `template.sending_window` | Checklist | BR §7 |
| 35 | `AFF \| Call Booked` | same | Checklist | Live (published v4); BR §3b, §8 |
| 36 | `AFF \| Call No-Show` | same | Checklist | Live (published v3); BR §8 |
| 37 | `AFF \| Reply Router` | same | Checklist | Live (published v4); BR §3b, §6 |
| 38 | `AFF \| Partner Nurture – Every Other Day` | same | Checklist | Live (published v3); BR §8 |
| 39 | `AFF \| Partner Check-In – 30/60` | same | Checklist | Live (published v3); BR §8 |
| 40 | `AFF \| Outreach – Tier 1 / 2a / 2b / 2c` (4) | one per `aff_email.outreach` list (defaults: the same four) | Checklist | Live (published v3); BR §8 |
| 41 | `AFF \| Partner – Signed Up` | additions to the standard Partner Sign-Up | Checklist | Live (published v5); BR §3b, §6, §8 |
| 42 | `AFF \| Referral Received` | additions to the standard Referral Capture | Checklist | Live (published v4); BR §3b, §6 |
| 43 | 30 email templates `AFF - <workflow> - <email>` | same names, from the copy | Checklist + Copy (verify: MANUAL) | Live; BR §8 |
| 44 | STL messages (4 texts, 3 emails) | `copy/stl.md` | Copy (our wording; Larry's text is not readable, see §10.9) | Spec §3; BR §3 |
| 45 | REACT approved copy (2 sequences) and Re-entry email | `copy/react.md` | Copy | Copy (Oct 13); BR §7 |
| 46 | Partner copy (Welcome, nurture 1-8, outreach x4, call booked, no-show, thank-you, check-ins, reply snippets) | `copy/aff.md`, `copy/aff-outreach-*.md` (two outreach shapes) | Copy | Copy (Oct 14); BR §8 |
| 47 | "All users" alert fix in Larry's own workflows | the standard notification audit | Checklist (standard build) | BR §7 |
| 48 | Segment tagging of 7,063 contacts, `react_segment` and `react_context` on each | the rule per segment, done by a person | Not covered: contact writes on client data need the owner's go; this repo writes no contacts | BR §7 |
| 49 | Reactivation group 01 send and pause (Oct 14) | none | Not covered: an operational run, not a build | BR §9 |
| 50 | Mortgage-broker list and its ListMonk / Instantly campaign | the "cold lists never go into GHL" step | Not covered: outside GHL (BR §9: CSV import attestation) | BR §9 |
| 51 | Pre-spec Referral Engine objects (Partner Recruiting, Partner Lifecycle, Referred Loans, two forms, three Draft workflows) | the standard build | API + Checklist (standard build) | Live; BR §4 |

**Counts** (51 rows): API 20 (15 by the template, 5 by the standard build it sits on), Checklist 19, Checklist + Copy 1 (row 43), Copy 3, Not covered 8. Not covered: `cb_what_changed`, `cb_partner_comp_line`, four unused `aff_*` fields, `src:import-2026-09`, the tier/broker/has-list tags, segment tagging of contacts, the group 01 send, the broker cold campaign.

**Client-specific to Larry, deliberately not templated:** his name, company, phone, emails and app link (inputs instead); `cb_` (the `value_prefix` input); "FB Lead" in workflow names (now "Ad Lead": leads may come from other ad sources); the en dash in names (FinBay: a plain hyphen types cleanly); his lead pipeline and its stages (inputs); his loan products and the approved "what we fund" line (`copy.offer_line` and `[[WRITE]]` prompts); owner-occupied loans kept out of campaigns (his rule, not a template rule); `src:import-2026-09`; the 20,604-row broker list.

## §10.9 Differences between the docs and the live account (Oct 17)

The live account wins for names and structure; the template follows it.

1. **Partner calendar slot length is 30 minutes live**, not 20 (BR §1, Spec §2.5: 20-min slots). Buffer 10 and 4 a day match. Likely trap T6: the Oct 12-13 hours change. The calendar's description still says "DRAFT availability (Mon-Fri 10-5 PT)" although the hours are set (Tue 9:30, Wed 10:30, Thu 9:30, one 30-minute window each), and its confirmation text is GHL's default ("We will contact you shortly to confirm"), which the standard build replaces. The template uses the standard calendar (20 min), so a copy does not inherit this.
2. **All 11 AFF workflows are published**, and `REACT | Reply Router` is published; BR's header and §3b, §7 still say AFF is Draft. BR §9 records the Oct 14 go-live, so Live and BR §9 agree; the header is stale.
3. **`STL | Inbound Reply Router` is v4, last saved Oct 2.** The Oct 13 move of ad leads into Larry's pipeline updated the Instant Response and the Ladder (v6) and the REACT Reply Router, not this one. Its "deal to Engaged" step (BR §6) probably still points at `STL | Inbound Leads`, which no longer gets new deals. Workflow steps cannot be read over the API (404), so this is unconfirmed. The template makes the stage move an input (`stl.own_replied_stage`).
4. **Lost stages are real stages live:** `AFF | Partner Pipeline` ends with a "Declined" stage and `STL | Inbound Leads` with "No Response / Not a Fit"; Spec §2.4 calls them lost statuses. The template's STL pipeline keeps the live stages.
5. **The check-in is 30/60 live**, not 30/60/90 (Spec §5.8); BR §8 and Live agree.
6. **Names use an en dash live** (`STL | FB Lead – Instant Response`); smart lists use a hyphen (BR §7). The template uses a plain hyphen everywhere (FinBay decision).
7. **No STL or REACT email templates live:** only the 30 AFF ones (BR §8). STL and REACT copy lives inside the workflow steps, which the API cannot read, so Larry's STL wording is not recoverable from the account or the vault. The template's STL copy follows Spec §3's subjects and cadence with our wording.
8. **`cb_what_changed` is empty live** (BR §1 says blank values hold a single space).
9. Everything else matches: 9 `cb_*` values, 17 contact fields with the spec's types and options (`aff_has_list` is a CHECKBOX with the option "Yes"), all 48 spec tags and no extra `src:/stl:/react:/aff:` tags, the three spec pipelines (`STL | Inbound Leads`, `AFF | Partner Pipeline`, `AFF | Broker Intake`), 21 STL/REACT/AFF workflows, the two AFF forms, time zone America/Los_Angeles.

Not readable over the API, so not checked live: smart lists, workflow steps and settings (sending windows, stop-on-response, goals), notification recipients.
