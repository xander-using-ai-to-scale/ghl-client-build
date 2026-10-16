# What we need from the client

Everything the build needs, grouped by when we get it. Ask for the "before the kickoff call" items as soon as the client signs: every item collected live on a call costs call time. Never collect a password or token in a shared channel.

Each item says which stage it blocks:
**[live]** any connection to their GHL · **[build]** the API build · **[checklist]** the UI build · **[go-live]** switching anything customer-facing on. `preflight` checks every one of these in `client.yaml`.

## Before the kickoff call

### Access

- [ ] **[live]** Which GHL they own: the whole agency, or one sub-account. Which sub-account the program goes in.
- [ ] **[live]** Our builder added as a **user of that sub-account** (Settings -> My Staff). A seat in our name, never a shared login.
- [ ] **[live]** A **sub-account Private Integration token** (Settings -> Private Integrations, inside the sub-account; an agency token does not work). Made together on a call, or sent by a one-time secure link. Sent privately (a DM or a one-time link), never in a shared channel. It goes in `.env`, never in Slack, email or chat. Scopes:
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
- [ ] Cold email in general: which sending tool (rail) they use, and who owns the sending inboxes and their warm-up. Cold email never runs from GHL.
- [ ] Whether there is a build spec written for this client, and access to every template it points at.
- [ ] Their own plan, if they sent one, mapped against the scope they signed. What is in and out is agreed in writing before the build.
- [ ] If the client also gets AI agents (for example on Orgo): send our agent install checklist too. The agents are outside this build.

### People

- [ ] **[checklist]** Who handles interested leads and partner calls: the owner, an assistant, or an agent. It decides who gets every alert and task.
- [ ] **[checklist]** Who gets new-lead alerts (users of the sub-account).
- [ ] **[checklist]** Who gets the follow-up tasks (one person).
- [ ] **[checklist]** Who approves commissions (one person).

## On the call

- [ ] **[build]** Partner types (the dropdown options), partner tiers (default Tier 1, 2, 3), and the segments for tags.
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
- [ ] Rotate the Private Integration token at handover: the client deletes ours or makes a new one.

## Only with the larry template (STL, REACT, partner emails)

Skip this section unless `template.name: larry`. Copy approval always comes before anything sends.

- [ ] **[build]** Who signs the emails and texts (full name), and a short prefix for our custom values (2-4 letters).
- [ ] **[checklist]** Who gets reply and call tasks (the assistant) and who gets owner tasks and the new-lead text alert. Both users of the sub-account.
- [ ] **[checklist]** Lead sources: how ad leads land in GHL today (Facebook lead-form integration, a website form, a webhook, another tool) and the form names.
- [ ] **[checklist]** Their own lead pipeline, if any: its name, the stage new leads land at, and the stage for a finished application. Ask before building: we rebuilt speed to lead once when the leads moved.
- [ ] **[go-live]** The short application or request link every message points to.
- [ ] **[checklist]** Where past-client data lives (GHL, a CRM export, a spreadsheet), and which segments make sense for them (past customers, lost quotes, unfinished applications, old ad leads, referral sources, long-inactive).
- [ ] **[go-live]** The owner's go before we tag or enroll any of their contacts.
- [ ] **[checklist]** Partner lists for outreach, and for each: do their clients become yours (introducer), or do they turn away work you take (peer)?
- [ ] **[go-live]** The sending domain for these emails, authenticated (SPF, DKIM, DMARC). Until then GHL's shared domain: fine for warm contacts, not for volume.
- [ ] **[go-live]** A2P status. Texts stay off until it is approved; email goes first.
- [ ] **[go-live]** A sending window for reactivation (default Mon-Fri, 9-5, their time zone).
- [ ] **[go-live]** Written approval of every message in `out/template-copy.md`, and which program goes live first.
- [ ] Cold partner lists: these never go into GHL by CSV import. Which tool and whose inboxes send them.

## Intake questions Claude can ask

Ask a few at a time, starting with what blocks the build. Fill from the client's folder first.

1. What is the business name as partners should see it, and its time zone?
2. Which GHL sub-account does this go in? Is our builder a user there yet?
3. Who will own the program in GHL day to day, and are they a user of that sub-account?
4. Who handles interested partners and referred leads: you, an assistant, or an agent?
5. Who should get the new-lead alerts, who gets the follow-up tasks, and who approves commissions?
6. What kinds of businesses or people will refer to you? (These become the Partner Type options.) Do you rank partners in tiers?
7. How are partners rewarded: per lead, per sale, a share of revenue, or something else? What rate?
8. Is the reward paid every month while the customer stays, or once?
9. How and when are partners paid (ACH, check, PayPal...)? Any limits on paying referral fees in your industry?
10. When can partners book an intro call with you: days, hours, how long, how much notice?
11. What video link do you use for calls? Any dates coming up that we should block?
12. Which domain can we use for the partner pages, and who can change its DNS?
13. Which address should partner emails come from? Is that domain authenticated (SPF, DKIM, DMARC)?
14. Have you registered for business texting (A2P) in GHL? If not, can you start it this week?
15. Which tool sends your cold email, and who owns the sending inboxes? If it is Instantly, can you share the workspace with us?
16. Is anything already in your GHL that we must leave alone?

With the larry template, also:

17. Who signs your emails and texts? Who handles replies and calls, and who should get a text when a new lead comes in?
18. How do your ad leads reach GHL today, and which pipeline do they land in?
19. What is the link for your short application or request form?
20. Where do your past clients live, and are there groups you would never contact?
21. Which kinds of partners should we reach out to first?
