# 8. Access, tests, acceptance and handover

## §8.1 Access

- Seats and invites in our own names; nobody logs in as the client.
- Our builder is added as a user of the sub-account.
- A **sub-account** Private Integration token (an agency token fails with "user type mismatch"). Scopes: CLIENT-CHECKLIST.md. The token goes in `.env`, never in chat or a tracked file.
- `preflight --live` passes: the location is reachable, every person in `client.yaml` is a sub-account user.

In an account already in use, the build is additive: nothing of the client's is renamed, edited or deleted. Survey first (`build --live --check`), settle any name clash with the account owner, set `naming.prefix` if needed.

## §8.2 Tests

On `@example.com` contacts only, each with a phone number no other contact uses (GHL merges contacts by phone). Public GHL forms carry Cloudflare's bot check; never work around it. To test a form's workflow, write exactly what the form writes onto a test contact, then enroll it in the workflow (`POST /contacts/{id}/workflow/{workflowId}`). Moving a deal's stage over the API fires stage-changed triggers like a drag. Check every result in GHL itself.

| Test | Passes when |
|---|---|
| Instantly (if on) | The same sample twice: one contact, one deal at Engaged, two notes, two tasks |
| 1. First claim | Partner A has the credit; a deal at Referral Received; the follow-up task |
| 2. Second claim on the same client | A keeps the credit; conflict tag and Conflicting; the deal at Attribution Review; the review task |
| 3. Staff-logged intro | Partner C has the credit, method Staff Entered |
| 4. Partner sign-up | Partner fields, the rate, the personal link, both tags, the Onboarding deal, the task |
| 5. Commission cycle | Sold moves on to Commission Pending with the sale date, Pending, the lock and the approval task; Approved adds the date and the payout task; Paid adds the payment date |
| Loop (monthly only) | Wait set to 1 minute: the paid deal returns to Commission Pending with next month's task; a deal moved to Lost / No Sale during the wait stays Lost with no task. Then the wait goes back to 30 days and the header Save is clicked |
| 6. Affiliate sign-up | The partner is under the campaign; Affiliate Link has `am_id` plus our IDs; Referral Code holds the `am_id` |
| 7. Referral through the link | The partner has the credit, a deal at Referral Received, and 1 lead under them in the Affiliate Manager |

One real form fill by a person is still owed: 1 minute. Cleanup only with the account owner's go-ahead: a JSON backup first, delete by explicit id (never by pattern), then read the account back.

## §8.3 Acceptance criteria

From Justin's spec Part X, for the client build:

- Every referred lead has a source, an owner, a deal and a next action.
- Staff record a verbal, text or phone referral in under 60 seconds.
- A partner is onboarded in under 10 minutes once terms are agreed.
- A reward is approved only by an explicit, authorized action.
- Approved-but-unpaid rewards appear in one view.
- No referral depends only on a tracking link.
- Client staff follow the SOP without needing us for routine attribution.
- Partner-facing information never exposes a customer's private details.

Plus, for this pipeline: `verify --live` has no FAIL, and every MANUAL row has been checked by a person.

## §8.4 Handover

1. The client's own user takes every person slot: calendar, notifications, tasks, approver. Update `people.*` and run `verify --live`.
2. Calendar rules agreed with the client: hours, daily maximum, video link, blocked dates.
3. Staff walked through the monthly commission (§7.1) and the conflict review (§5.2).
4. Every customer-facing piece is switched on by a person, one at a time: the partner pages, any partner email, SMS.
5. The Private Integration token is rotated at handover: the client deletes ours or makes a new one.

## §8.5 Not in v1

From Justin's spec, not built in the standard v1 (Playbook §1): the agency's own internal sales CRM (spec Part I), referred-lead engagement and appointment automations (spec C-4, C-5), partner reactivation (C-7), the performance report (C-8) and a reporting dashboard, partner and client emails (their copy needs approval first), a prospect-facing intake page and QR codes (they need the client's domain). Each can be added per client under `customize` and a new workflow entry.
