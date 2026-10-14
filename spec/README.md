# The client build spec: Referral Partner Engine in GoHighLevel

What we install in a client's GHL sub-account: a referral-partner program. Partners are recruited, sign up, get a personal link, and are credited when a customer they sent buys. GHL tracks each commission and reminds staff; a person pays the partner.

The flow it supports, from Justin's spec:

Recruit partners -> make referring easy -> capture who referred whom (online or offline) -> follow up -> convert -> verify the reward -> grow the partners who produce.

## The parts

| # | Part | Built by | Spec |
|---|---|---|---|
| 1 | Pipelines: Partner Recruiting, Partner Lifecycle, Referred Leads | API | [01-pipelines.md](01-pipelines.md) |
| 2 | Custom fields (28 contact, 29 with Instantly; 7 opportunity) and tags | API | [02-data-model.md](02-data-model.md) |
| 3 | Custom values and the Partner Intro Call calendar | API | [03-custom-values-calendar.md](03-custom-values-calendar.md) |
| 4 | Forms (Refer a Client, Partner Sign-Up, Staff Attribution) and partner pages | UI, from the checklist | [04-forms-pages.md](04-forms-pages.md) |
| 5 | Workflows: Instantly intake (optional), referral capture, staff attribution, sign-up, affiliate link, 3-step commission cycle | UI, from the checklist; verified by API | [05-workflows.md](05-workflows.md) |
| 6 | GHL's Affiliate Manager | UI | [06-affiliate-manager.md](06-affiliate-manager.md) |
| 7 | Commission cycle, notifications, SMS and A2P, email sending | Both | [07-commissions-notifications.md](07-commissions-notifications.md) |
| 8 | Access, tests, acceptance criteria, handover, what v1 leaves out | People | [08-testing-handover.md](08-testing-handover.md) |
| 9 | The GHL traps and where the code guards against each | Code + docs | [09-ghl-traps.md](09-ghl-traps.md) |

Every object in `config/` carries a `spec` reference to a section here, and a test checks that each reference exists.

## Where this comes from

- Justin's build spec, "GHL Internal Sales CRM + Client Referral Partner Platform" (Sep 22 2026), Part II onward. Part I (our own internal CRM) is not part of a client build.
- Justin's client one-pager for the Referral Partner Engine (Sep 22 2026).
- The GHL Affiliate Program Build Playbook (v1.1, from the first client build, Sep 21-22 2026; updated Oct 7 2026). This is the standard product: Justin, Sep 22: "that's going to be what we build for most people, 80, 90%".
- Two real builds, for lessons only: a referral-partner build for an SEO agency (Sep-Oct 2026) and an additive build in a lender's live account (Sep 28-Oct 13 2026).
- Our GHL API and browser notes (Claude Memory), including the Oct 2026 lessons.
- What we ask clients for: the Client Delivery Playbook and the Agent Install Checklist.

## Where the sources disagree, and what this repo follows

| # | Topic | Source A | Source B | We follow |
|---|---|---|---|---|
| 1 | Partner pipeline | Justin's spec: one "Referral Partners" pipeline, 10 stages (Partner Identified ... Ended / Disqualified) | Playbook and the live build: two pipelines, Partner Recruiting and Partner Lifecycle | The live build. Same stages, split into before and after signing |
| 2 | Attribution Lock | Spec: a checkbox | Live build: a dropdown, Unlocked / Locked | The live build (workflows set it to Locked) |
| 3 | Commission payout | Spec §17: one review and one payout per sale | First build: a monthly loop for the life of the client; lender build: one payout at Funded | Both, as `program.commission_mode` |
| 4 | Payment Preference options | Spec: ACH, Check, Gift Card, Service Credit, Trade, Other | Live build: ACH, Check, PayPal, Gift Card, Service Credit, Other | The live build, overridable in `program.payment_methods` |
| 5 | Partner contact fields | Spec lists Partner Business Name, Partner Status, Referral Link, QR Asset URL, Default Reward Amount, Partner Start Date, "Default Revenue Share Percent" | Live build has Partner Tier, Partnership Type, Affiliate Link, Agreement Signed Date, Referrals Sent, Last Referral Date, "Revenue Share Percent", and the Claimed staging fields | The live build |
| 6 | Partner welcome email | Spec C-1 sends a welcome email and SMS | Playbook v1: no partner- or client-facing emails until the copy is approved | The Playbook. Emails are added per client once approved |
| 7 | How many workflows | Playbook "at a glance" and Phase 4: "7 workflows published" | Playbook §1 and the standard structure list 8 (the Instantly intake plus 7 referral-engine workflows including Affiliate Link) | 8, of which the Instantly one is optional |
| 8 | Notification recipients | Revenue Partners design (Sep 9): "All users", so it keeps working when a seat changes | Oct 13 lesson: All users emails our team every lead | Particular users from `people.alert_emails` |
| 9 | Which tool installs a self-installing repo | Agent Install Checklist (Justin, Sep 2): Codex, not Claude Code | Justin, Oct 13: open the client's folder in Claude Code and give it the repo | Claude Code, per the Oct 13 ask. Nothing in the repo depends on the tool |
| 10 | Token scopes | Playbook Phase 0 lists Contacts, Opportunities, Custom Fields, Tags, Calendars (edit) and Users, Workflows, Locations (view) | Custom values were later written over the API (Oct 13) and the double-check reads forms | The Playbook's list plus Custom Values (edit) and Forms (view) |
| 11 | Call length | Revenue Partners intro call: 30 minutes | Partner intro call in the standard build and the lender build: 20 minutes | 20, set in `client.yaml` |
| 12 | Whether the client owner has access | First build's Oct 6 call: "the agency owner already has access" | Corrected Oct 13 over the API: not a sub-account user | The correction (trap T11) |
| 13 | Referral Attribution Method options | Spec §8: no "Partner Submission" option | Live build: "Partner Submission" added, used for partner-registered referrals and email intros | The live build |
| 14 | The three forms | Spec §11.1-§11.3: sign-up asks for service area, preferred contact method and referral volume; the staff form records method, confidence, staff member and override reason | Playbook §5 and the live build: shorter forms that write only to the Claimed staging fields | The Playbook. Extra fields are added per client |
| 15 | Commission waiting period and tags | Spec §17: an optional qualification or cancellation wait, and `commission-approved` / `commission-paid` tags | Playbook and live build: no wait before approval, no commission tags (they pile up on a monthly loop) | The Playbook, in both commission modes |
| 16 | Lost Reason options | Revenue Partners design: no fit, no budget, no response, competitor, timing, DNC | Live build: No fit, Not interested, No response, Bad timing, an industry-specific option, Do not contact | The live build without its industry-specific option |

## Decisions we made ourselves

Where the sources leave a gap, we picked a default. Each is one edit to change.

| Decision | Why | Change it in |
|---|---|---|
| Node.js 18+, no dependencies; `client.yaml` read by a small built-in YAML reader | Matches our existing GHL scripts (Node, built-in fetch); nothing to install on a client machine | `lib/yaml.js` (or switch `client.yaml` to JSON in `lib/config.js`) |
| The repo sits in the client's folder as a subfolder; `client.yaml`, `.env` and `out/` sit next to it, outside the repo | Client data never lands in the repo, and the repo can be updated with `git pull` | `lib/cli.js` (`--client`, `--out`) |
| Nothing touches the network without `--live`, including preflight and verify | One rule is easier to trust than per-command defaults | `lib/cli.js` |
| `build` without `--live` does not read the account; `build --live --check` reads and plans without writing | The brief asked for a dry run with zero network calls; a real plan still needs a read | `lib/cli.js`, `lib/build.js` |
| The only edits are opt-in (`--repair`): append missing pipeline stages, reset our own calendar's settings to client.yaml (full settings, never partial), fill a blank custom value | "Never delete, create only what is missing", while still being able to fix our own objects | `lib/build.js` |
| Field options on an existing field are never changed by the build; a missing option is a warning | Editing a live field's options can break the client's own filters | `lib/build.js` |
| Commission mode is a choice, `recurring_monthly` or `one_time` | The two real builds needed different cycles (disagreement #3) | `client.yaml` `program.commission_mode`; `config/workflows.json` |
| "First claim?" is tested as "Referring Partner ID is empty" | The Playbook says to copy the first build's exact condition, which is not written down | `config/workflows.json` (referral_capture step 2) |
| Five custom values: partner page URL, refer URL, booking URL, commission rate, program owner | The set built for the first client on Oct 13 | `config/custom-values.json` |
| A blank custom value is stored as a single space | GHL keeps no empty custom value (the lender build did the same) | `lib/build.js` |
| The calendar confirmation text is set with `formSubmitType` / `formSubmitThanksMessage`, default "Your call is booked. A calendar invite with the details is on its way to your email." | The sources say to replace GHL's default over the API but do not name the fields; these are GHL's calendar API names. Confirm on the first live run | `config/calendar.json`, `client.yaml` `calendar.confirmation_text` |
| Video link, daily maximum and blocked dates are set in the UI, not the API | No tested API field for them in our sources | `config/ui-steps.json` |
| A calendar update drops `id`, `locationId`, `dateAdded`, `dateUpdated`, `createdAt`, `updatedAt`, `deleted` from the saved copy before the PUT | Consistent with the pipeline PUT lesson; not yet confirmed live. The saved copy is kept in the run log | `lib/ghl.js` `CALENDAR_READ_ONLY` |
| An optional naming prefix, applied to pipelines, calendar, forms and workflows only | The lender build prefixed everything in a live account; fields and tags keep their names so the workflows read the same | `client.yaml` `naming.prefix`; `lib/config.js` |
| Partner tiers default to Tier 1 / 2 / 3; payment methods default to the live build's list | The standard build's defaults | `client.yaml` `program.partner_tiers`, `program.payment_methods` |
| Conflict reviews, commission approvals and the monthly commission task go to `people.commission_approver_email`; other tasks go to `people.task_assignee_email` | The Playbook sends every task to one placeholder; approving a reward is the approver's job (spec §31) | `config/workflows.json`, `client.yaml` `people` |
| Refer a Client also asks for the client's phone | The Playbook lists name, email and company; a phone makes follow-up possible | `config/forms.json` |
| Two saved views in the Referred Leads pipeline: "Rewards approved, not paid" and "Attribution exceptions" | The spec's acceptance criteria require one view of unpaid rewards; there is no smart-list API | `config/ui-steps.json` (views) |
| Consent text on Refer a Client and a terms checkbox on Partner Sign-Up, worded by the client | Required by the spec (§11.1, §11.2); the wording is the client's legal call | `config/forms.json` |
| Partner Sign-Up counts as customer-facing when the Affiliate Manager is on; verify shows a WARN if it is published | Adding a partner to the campaign sends GHL's invite email | `config/workflows.json` (`customer_facing`) |
| Instantly off by default; Affiliate Manager on by default | Instantly only when the client uses it; the Affiliate Manager is part of the standard product | `client.yaml` |
| A 429 is retried up to 4 times, honouring Retry-After, else 1, 2, 4, 8 seconds (cap 60) | "Retry politely"; GHL's limits are per location | `lib/http.js` |
| A blank custom value is a WARN in verify, not a FAIL | Blank means "not supplied yet", which does not block the build | `lib/verify.js` |
| The example client is "Summit Ridge Roofing", with a dummy 10% rate | A neutral made-up client; the real rate always comes from the client | `client.example.yaml` |
