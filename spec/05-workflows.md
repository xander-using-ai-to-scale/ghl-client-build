# 5. Workflows

GHL's API lists workflows but cannot create or edit them (404). So each workflow is built in the UI, step by step, from `out/ui-checklist.md`, which prints these steps with the client's names, people and rate filled in. `verify --live` then checks each one by name and reports its status and version. The canvas is not the truth; the API is.

Sources: Build Playbook §6 (Phase 4) and §7 (Phase 5); Justin's spec §12-§17; the first client's live build. Exact step data: `config/workflows.json`.

## §5.0 Rules for every workflow

1. Every Internal Notification goes to **Particular user(s)** from `people.alert_emails`. Never "All users": GHL's default emails every user in the sub-account, our team included (trap T10).
2. Every task goes to one person. The assignee is single-select; two people need two task steps.
3. No partner- or client-facing emails or texts in v1. Their copy needs approval first and is marked DRAFT.
4. Deals are named `{{contact.email}}`. Instantly often sends no names, and Find opportunity matches on the name.
5. To move an existing deal from a form- or contact-triggered workflow: Find opportunity, then Update opportunity. "Create opportunity" never updates (trap T14).
6. Click the header Save every few edits (trap T16). Check what was saved with `verify --live`.
7. Built in Draft. Internal workflows are published after their test passes. A customer-facing workflow is switched on by a person, never by the pipeline.

## §5.1 Instantly - Interested Partner Reply

Only when the client's cold email runs in Instantly (`instantly.enabled`).

**Trigger:** Inbound Webhook "Instantly - lead marked interested". Only leads marked Interested reach GHL, which keeps auto-replies and refusals out. Re-entry on.

1. Create contact: email, first and last name, phone, business name from the payload (`lead_email`, `first_name`, `last_name`, `phone`, `company_name`).
2. Update contact field: Instantly Campaign, Next Action Date = today.
3. Add tags `source/instantly`, `interest/partner-program`.
4. Create opportunity: Partner Recruiting at Engaged, named by email, source "Instantly reply", duplicates off.
5. Note: the reply text, the campaign, the Unibox link.
6. Internal notification to the alert users: "New interested partner reply - act today".
7. Task to the assignee: "Reply to {email} - interested partner", due next day.

**Acceptance:** the same sample payload sent twice gives one contact, one deal at Engaged, two notes, two tasks.

## §5.2 Referral Engine - Referral Capture

**Trigger:** the Refer a Client form.

1. Contact Role = Referred Lead; tag `referred-lead`.
2. If / else: is this the first claim (Referring Partner ID empty)?
3. **First claim:** copy the Claimed fields into Referring Partner ID, Referring Partner Name, Referral Code. Method = Partner Submission, Confidence = Claimed, Source Type = Partner, Referral Date = today, Evidence = Claim Notes.
4. First claim, with the Affiliate Manager on: Add leads under an affiliate (Custom Mapping, AM ID = Referral Code).
5. First claim: a Referred Leads deal at Referral Received, source "Partner referral", and a task to contact the lead within 1 business day.
6. **Later claim:** overwrite nothing. Tag `referral-attribution-conflict`, Confidence = Conflicting, the deal moves to Attribution Review, and a review task goes to the approver.

**How staff resolve a conflict:** compare the current credit with the new claim; decide who sent the client; if the new claimant wins, note the old credit first, then change the credit fields by hand; set Confidence per the client's policy; move the deal back to its stage. Whether to remove the conflict tag afterwards is not settled in the sources.

**Acceptance:** tests 1 and 2 (§8.2).

## §5.3 Referral Engine - Staff Attribution

**Trigger:** the Staff Attribution form. The same steps as §5.2 with Method = Staff Entered. Quickest built by duplicating §5.2; then re-add the dropdown rows in its Update-opportunity steps (trap T15).

**Acceptance:** test 3.

## §5.4 Referral Engine - Partner Sign-Up

**Trigger:** the Partner Sign-Up form. Customer-facing when the Affiliate Manager is on (it triggers GHL's invite email).

1. Contact Role = Referral Partner; Partner ID = the contact's own id.
2. Reward Model = `program.reward_model`; Revenue Share Percent = `program.commission_rate_percent`.
3. Affiliate Link = the personal Refer a Client link: `https://api.leadconnectorhq.com/widget/form/<form id>?claimed_partner_id=<Partner ID>&claimed_partner_name=<First>%20<Last>`.
4. Tags `referral-partner`, `partner-onboarding`; a Partner Lifecycle deal at Onboarding.
5. Task "Onboard new referral partner".
6. With the Affiliate Manager on: Add to affiliate manager, then Add to affiliate campaign.

Target from the spec: a partner onboarded in under 10 minutes once terms are agreed.

**Acceptance:** test 4; test 6 with the Affiliate Manager on.

## §5.5 Referral Engine - Affiliate Link

Only with the Affiliate Manager on. **Trigger:** Affiliate enrolled in campaign (filter: the program's campaign).

1. Affiliate Link = GHL's affiliate link plus `&claimed_partner_id=` and `&claimed_partner_name=`, so one link feeds both systems.
2. Referral Code = the partner's `am_id`.

It overwrites the first link Partner Sign-Up wrote, which has no `am_id`.

**Acceptance:** test 6.

## §5.6 Referral Engine - Commission 1: Sale

**Trigger:** a Referred Leads deal moves to Sold / Enrolled.

1. Sale Date = today; Commission Status = Pending.
2. Move the deal on to Commission Pending.
3. Attribution Lock = Locked.
4. Task to the approver: "Approve partner commission".

A sale creates a pending commission, never an automatic payment.

**Acceptance:** test 5, part 1.

## §5.7 Referral Engine - Commission 2: Approved

**Trigger:** the deal moves to Commission Approved (a person did this). Commission Status = Approved, Approval Date = today, and a payout task.

**Acceptance:** test 5, part 2.

## §5.8 Referral Engine - Commission 3: Paid, monthly repeat

For `commission_mode: recurring_monthly` (the partner earns every month the client pays). **Trigger:** the deal moves to Commission Paid.

1. Commission Status = Paid; Last Commission Payment Date = today.
2. Wait 30 days.
3. If the deal is still at Commission Paid: back to Commission Pending (allow previous stage), status Pending, and next month's approval task.
4. If the client was moved to Lost / No Sale: the cycle stops.

**Acceptance:** test 5, part 3, and the loop test (1-minute wait, then the stop on Lost / No Sale, then the wait set back to 30 days).

## §5.9 Referral Engine - Commission 3: Paid

For `commission_mode: one_time` (one payout, as in Justin's spec §17 and the lender build). **Trigger:** the deal moves to Commission Paid. Commission Status = Paid, payment date = today, end.

**Acceptance:** test 5, part 3.
