# 1. Pipelines

Three pipelines, built over the API (`config/pipelines.json`). A stage marks something the other person did, not how busy we were. Won, Lost and Abandoned are GHL's opportunity status, not stages. Attempts, outcomes and reasons live in fields.

Sources: Justin's build spec Part II §7; the Build Playbook §1; the Revenue Partners design (stage principle).

## §1.1 Partner Recruiting

For people we are recruiting as partners, before they sign.

| # | Stage | It enters when |
|---|---|---|
| 1 | New | Created, not yet worked |
| 2 | Working | First outbound touch sent |
| 3 | Engaged | A human reply (an auto-reply does not count) |
| 4 | Booked | An intro call is on the calendar |
| 5 | Showed | They attended |
| 6 | Offer Made | Terms presented |

Lead entry depends on the source: a list import lands at New; an Instantly interested reply lands at Engaged (workflow §5.1).

**Acceptance:** `verify --live` shows the pipeline once, with these six stages in this order.

## §1.2 Partner Lifecycle

For partners after they sign. The split between Activated and Producing is the point: onboarded and actually referring are not the same thing.

| # | Stage | It enters when |
|---|---|---|
| 1 | Signed | The partner agreed |
| 2 | Onboarding | Assets and links being handed over (the Partner Sign-Up workflow puts new partners here) |
| 3 | Activated | First referral received |
| 4 | Producing | Two or more referrals in the last 30 days |
| 5 | Dormant | Nothing for 60 days |

**Acceptance:** shown once, five stages in order.

## §1.3 Referred Leads

The customers a partner sent. It carries the commission cycle (§7.1).

| # | Stage | What staff do |
|---|---|---|
| 1 | Referral Received | Confirm the credit, owner and next action |
| 2 | Attempting Contact | Follow up within the client's response time |
| 3 | Contacted / Nurture | Keep the approved nurture going |
| 4 | Appointment Booked | Reminders, prepare |
| 5 | Appointment Showed | Record the outcome |
| 6 | Qualified / Consult Completed | Into the sale |
| 7 | Sold / Enrolled | The qualifying sale happened. Commission 1 runs |
| 8 | Commission Pending | Waiting on approval |
| 9 | Commission Approved | In the payout queue. Commission 2 runs |
| 10 | Commission Paid | Paid. Commission 3 runs |
| 11 | No Show / Unqualified | Follow the client's no-show policy |
| 12 | Lost / No Sale | Keep the record. Stops a monthly commission cycle |
| 13 | Attribution Review | Missing, conflicting or disputed credit: a person decides |

If the client already runs a sales pipeline, do not duplicate it. Keep Referred Leads for the referral front end and hand off at Qualified (Justin's spec §7, Pipeline C).

**Acceptance:** shown once, thirteen stages in order.

## §1.4 Customizing for a client

Changes go in `client.yaml` under `customize`, never in `config/`. Example from a lender build (Sep 28 2026): a loan pipeline replaced Referred Leads (Referral Received, Contacted, Quick App Sent, Quick App Completed, Term Sheet Issued, In Processing, Clear to Close, Funded, Referral Fee Pending, Referral Fee Approved, Referral Fee Paid, Declined / Withdrawn, Attribution Review), with one payout instead of the monthly loop (`commission_mode: one_time`).

In an account already in use, set `naming.prefix` (for example `RPE | `) so our pipelines, calendar, forms and workflows never collide with the client's. Nothing of the client's is renamed, edited or deleted.
