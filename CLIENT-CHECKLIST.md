# What we need from the client

Everything the build needs, grouped by when we get it. Ask for the "before the kickoff call" items as soon as the client signs: every item collected live on a call costs call time. Never collect a password or token in a shared channel.

Each item says which stage it blocks:
**[live]** any connection to their GHL · **[build]** the API build · **[checklist]** the UI build · **[go-live]** switching anything customer-facing on. `preflight` checks every one of these in `client.yaml`.

## Before the kickoff call

### Access

- [ ] **[live]** Which GHL they own: the whole agency, or one sub-account. Which sub-account the program goes in.
- [ ] **[live]** Our builder added as a **user of that sub-account** (Settings -> My Staff). A seat in our name, never a shared login.
- [ ] **[live]** A **sub-account Private Integration token** (Settings -> Private Integrations, inside the sub-account; an agency token does not work). Made together on a call, or sent by a one-time secure link. It goes in `.env`, never in Slack, email or chat. Scopes:
  - Edit (includes view): Contacts, Opportunities, Custom Fields, Custom Values, Tags, Calendars
  - View: Users, Workflows, Locations, Forms
- [ ] **[build]** The person who will own the program inside GHL (the calendar, the alerts, the tasks) **is a user of the sub-account**. An agency owner is not, until they add themselves as a user.
- [ ] **[build]** Their business time zone.

### Domain and sending

- [ ] **[go-live]** The domain (or subdomain) for the partner pages and forms, and who can change its DNS. A spare domain is easiest. Until then the forms work on GHL's default domain.
- [ ] **[go-live]** Email sending: the domain they send from, a From name and address, and whether SPF, DKIM and DMARC are set.
- [ ] **[go-live]** A2P status for texting. The client registers it in their own GHL (Settings -> Phone Integration -> Trust Center -> A2P) with their EIN and legal business details; it takes about 7-14 days. Start it now. SMS stays off until it is approved.
- [ ] Optional: Stripe connected. Not needed: commissions are tracked without it. Only needed to show earnings in the partner portal.
- [ ] **[checklist]** If their cold email runs in Instantly: access to the workspace. No plan upgrade is needed.

### People

- [ ] **[checklist]** Who handles interested leads and partner calls: the owner, an assistant, or an agent. It decides who gets every alert and task.
- [ ] **[checklist]** Who gets new-lead alerts (users of the sub-account).
- [ ] **[checklist]** Who gets the follow-up tasks (one person).
- [ ] **[checklist]** Who approves commissions (one person).

## On the call

- [ ] **[build]** Partner types (the dropdown options), and the segments for tags.
- [ ] **[build]** The reward model and the rate: per lead, per sale, revenue share, or a custom reward. Whether it is paid **every month** while the customer pays, or **once**.
- [ ] **[checklist]** Payout terms and how partners get paid (ACH, check, PayPal, gift card...). Any compliance limit on paying referral fees.
- [ ] **[build]** Calendar rules for partner calls: days and hours, call length, buffer, notice, how far ahead.
- [ ] **[go-live]** The video link for partner calls, a daily maximum, and dates to block.
- [ ] **[go-live]** The program owner's name as partners should see it.
- [ ] **[checklist]** Partner terms, if any (a terms checkbox on the sign-up form), and the consent wording for the referral form.
- [ ] Their existing GHL: pipelines, fields or workflows we must not touch, and whether leads already land somewhere. In a live account we build alongside, never over.
- [ ] Whether they already have a sales pipeline that referred leads should hand off to.

## After the call

- [ ] **[go-live]** The copy for the partner pages (DRAFT until they approve it).
- [ ] **[go-live]** Their approval before any partner email or text goes on.
- [ ] Their own GHL user takes every person slot at handover (calendar, alerts, tasks).
- [ ] A real form fill by a person, once, to close the tests (1 minute).

## Intake questions Claude can ask

Ask a few at a time, starting with what blocks the build. Fill from the client's folder first.

1. What is the business name as partners should see it, and its time zone?
2. Which GHL sub-account does this go in? Is our builder a user there yet?
3. Who will own the program in GHL day to day, and are they a user of that sub-account?
4. Who handles interested partners and referred leads: you, an assistant, or an agent?
5. Who should get the new-lead alerts, who gets the follow-up tasks, and who approves commissions?
6. What kinds of businesses or people will refer to you? (These become the Partner Type options.)
7. How are partners rewarded: per lead, per sale, a share of revenue, or something else? What rate?
8. Is the reward paid every month while the customer stays, or once?
9. How and when are partners paid (ACH, check, PayPal...)? Any limits on paying referral fees in your industry?
10. When can partners book an intro call with you: days, hours, how long, how much notice?
11. What video link do you use for calls? Any dates coming up that we should block?
12. Which domain can we use for the partner pages, and who can change its DNS?
13. Which address should partner emails come from? Is that domain authenticated (SPF, DKIM, DMARC)?
14. Have you registered for business texting (A2P) in GHL? If not, can you start it this week?
15. Do you run cold email in Instantly? If yes, can you share the workspace with us?
16. Is anything already in your GHL that we must leave alone?
