# 7. Commissions, notifications, SMS and email

## §7.1 The commission cycle

The cycle keeps its state on the Referred Leads deal: the stage plus Commission Status. No commission tags.

How staff run it each month (`recurring_monthly`):

1. The client signs: drag the deal to **Sold / Enrolled**. It moves on to Commission Pending by itself.
2. The approval task: confirm the client paid this month, fill in Client Monthly Revenue and Reward Amount (the client's rate of that payment), then drag the deal to **Commission Approved**.
3. The payout task: pay the partner the way their contact says (ACH, check, PayPal), then drag the deal to **Commission Paid**.
4. 30 days later the next month's commission opens by itself. If the client cancels, drag the deal to **Lost / No Sale** and the cycle stops.

With `one_time`, step 4 does not happen: Commission Paid is the end.

Rules from the spec (§31): only an authorized person approves a reward; a payment is marked paid only after it actually happened; a credit is locked at the sale and never overwritten by automation.

Views staff need (built in the UI; there is no smart-list API): "Rewards approved, not paid" (deals at Commission Approved) and "Attribution exceptions" (deals at Attribution Review). The spec's acceptance criteria require approved-but-unpaid rewards in one view.

**Acceptance:** test 5 and the loop test (§8.2); the two views exist (MANUAL).

## §7.2 Notifications and person slots

Every place a person is named (calendar team member, Internal Notification recipients, task assignees, the commission approver) comes from `people.*` in `client.yaml`.

- Until the client has a user in the sub-account, every slot holds our builder (placeholder). At handover each one moves to the client's user (§8.4).
- Every person must be a **user of this sub-account**. An agency owner can open a sub-account but is not a user of it, so nothing can be assigned to them (trap T11). `preflight --live` checks it.
- Notifications go to Particular users, never All users (trap T10). When we join an account, audit the client's own published workflows too: GHL's templates default to All users and email our team every lead. Ask before editing a client's own live workflow.
- Ask early who handles interested leads (the owner, an assistant or an agent): it decides who gets every alert and task.

**Acceptance:** `verify --live` shows every person as a sub-account user. Notification recipients are MANUAL (no API reads workflow steps).

## §7.3 SMS and A2P

A2P 10DLC is per sub-account and is the client's own registration, in their business's name: Settings -> Phone Integration -> Trust Center -> A2P. It needs the EIN and the legal business details and takes about 7 to 14 days, so it starts on the first call. We can help on a call; we do not submit it.

SMS stays off in every workflow until A2P is approved. Texts go only to consented contacts, for operational messages (booking reminders, follow-ups). The program is never built around text blasts (spec §21).

**Acceptance:** `sms.a2p_status` is `approved` before any SMS step is switched on (MANUAL).

## §7.4 Email sending

GHL sends operational and relationship email (reminders, partner notices) from an authenticated domain: SPF, DKIM and DMARC before any sending at scale. A blank From in a workflow sends from the location default: confirm it before anything goes live. Cold email does not run from GHL; it runs from a sending rail (Instantly or similar) with its own domains and warmed inboxes, and only business milestones come into GHL (an interested reply, a booked call).

**Acceptance:** `email_sending.authenticated: true` and a From address set before any partner email goes live.
