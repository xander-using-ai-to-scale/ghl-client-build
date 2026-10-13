# 4. Forms and partner pages

GHL has no tested API for building forms or funnels, so these are built in the UI from `out/ui-checklist.md`. `verify --live` checks the forms by name; the pages are a MANUAL check.

The non-negotiable from Justin's spec (§10): a referral link is useful but it is not the only way in. Every build supports a partner link, a referral code, a direct introduction, and a staff-entered source. The three forms cover all four.

## §4.1 Refer a Client

Filled by a partner, from their personal link. Runs Referral Capture (§5.2).

| Field | Writes to | Notes |
|---|---|---|
| First name, Last name, Email, Phone, Company | standard contact fields | |
| Tell us about this client | Claim Notes | |
| Claimed Partner ID | Claimed Partner ID | Hidden, filled from the link (`claimed_partner_id`) |
| Claimed Partner Name | Claimed Partner Name | Hidden, from the link (`claimed_partner_name`) |
| Claimed Referral Code | Claimed Referral Code | Hidden, from the link. Query key `am_id` with the Affiliate Manager on |
| Consent text | none | The client's communication consent wording (spec §11.2) |

**Acceptance:** the form exists once by name; a link with the three query keys fills the hidden fields.

## §4.2 Partner Sign-Up

Filled by a new partner on the Become a Partner page. Runs Partner Sign-Up (§5.4).

Fields: first and last name, email, mobile phone, business name, website, Partner Type, Partnership Type, "who you serve and why you are a fit" (Partner Notes), how they want to be paid (Payment Preference). A terms checkbox only if the client has partner terms (spec §11.1).

**Acceptance:** exists once by name.

## §4.3 Staff Attribution

Internal only, never shared with partners. Staff use it after an email intro, a call, a text or a walk-in. Runs Staff Attribution (§5.3). Fields: the client's details, and the same four Claimed fields (partner ID, name, referral code, evidence).

Target from the spec's acceptance criteria: staff record a verbal, text or phone referral in under 60 seconds.

**Acceptance:** exists once by name.

## §4.4 Partner pages

A funnel named after the program, with:

- **Become a Partner** at `/become-a-partner`: headline, one line, the Partner Sign-Up form.
- **Refer a Client** at `/refer`, once the domain is verified: a clone of the first step with the Refer a Client form. It carries the `am_id` hidden field.

The copy is DRAFT until the client approves it. The pages are published only when the domain is verified and the copy approved. GHL's portal has no self sign-up, so this page plus the sign-up workflow are the way in.

**Acceptance:** `curl https://<partner_domain>/become-a-partner` and `/refer` return the pages (MANUAL in verify).

## §4.5 Domain

Ask the client first which domain we can use and who can touch its DNS. A spare domain the developer can point at GHL beats editing the main site (first build, Oct 13 2026). Until a domain is verified the forms use GHL's default domain and the pages can only be previewed. QR codes and a prospect-facing intake page need the domain too.
