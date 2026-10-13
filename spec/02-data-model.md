# 2. Fields and tags

Built over the API (`config/fields.json`, `config/tags.json`): 29 contact fields (28 when Instantly is off), 7 opportunity fields, 24 standard tags plus one `segment/` tag per client segment. GHL has no date-time field type, so dates are Date fields. The API cannot create field folders.

Rule from the spec: tags route work and filter lists; fields record facts. A fact that matters later is a field.

## §2.1 Partner recruiting fields (contact)

| Field | Type | Notes |
|---|---|---|
| Instantly Campaign | Text | Only when the client uses Instantly. The exact campaign name from the reply |
| Partner Type | Dropdown | Options from `program.partner_types` |
| Partner Tier | Dropdown | Options from `program.partner_tiers`, default Tier 1 / 2 / 3 |
| Partnership Type | Dropdown | Referral, White Label |
| Next Action Date | Date | The field a daily "what do I do today" list runs on |
| Lost Reason | Dropdown | No fit, Not interested, No response, Bad timing, Do not contact |
| Affiliate Link | Text | The partner's personal referral link (§5.4, §5.5) |
| Agreement Signed Date | Date | |
| Referrals Sent | Number | |
| Last Referral Date | Date | |

**Acceptance:** each field exists once, with this type and every option.

## §2.2 Partner fields (contact)

| Field | Type | Notes |
|---|---|---|
| Contact Role | Dropdown | Referral Partner, Referred Lead, Client Staff, Other |
| Partner ID | Text | Stable id: the partner's own contact id |
| Referral Code | Text | With the Affiliate Manager on, GHL's `am_id` |
| Reward Model | Dropdown | Per Lead, Per Show, Per Qualified Consult, Per Sale, Revenue Share, Custom / Non-Cash |
| Revenue Share Percent | Number | The client's rate, set by the sign-up workflow |
| Payment Preference | Dropdown | Default ACH, Check, PayPal, Gift Card, Service Credit, Other |

**Acceptance:** as §2.1.

## §2.3 Attribution fields (contact)

| Field | Type | Notes |
|---|---|---|
| Referral Source Type | Dropdown | Partner, Friend / Family, Existing Client, Employee, Event, Other |
| Referring Partner Name | Text | Who gets the credit |
| Referring Partner ID | Text | Stable id for reporting |
| Referral Attribution Method | Dropdown | Referral Link, QR Code, Partner Submission, Email Introduction, Dedicated Phone, Dedicated SMS, Booking Form, Intake Form, Self-Reported, Staff Entered, AI Suggested, Other |
| Attribution Confidence | Dropdown | Verified, Claimed, Pending Verification, Conflicting, Rejected |
| Referral Date | Date | |
| Referral Evidence | Long text | The note, message or call that proves it |
| Attribution Lock | Dropdown | Unlocked, Locked. Set to Locked at the sale, so nothing overwrites a credit that will be paid |

**Acceptance:** as §2.1.

## §2.4 Claim staging fields (contact)

A GHL form overwrites contact fields the moment it is submitted, before any workflow runs. If a form wrote the real credit fields, a second partner registering the same client would silently take the credit. So forms write only here, and a workflow copies a FIRST claim across (§5.2). This is how "verified attribution cannot be silently overwritten" holds in GHL.

| Field | Type |
|---|---|
| Claimed Partner ID | Text |
| Claimed Partner Name | Text |
| Claimed Referral Code | Text |
| Claim Notes | Long text |
| Partner Notes | Long text (written by the Partner Sign-Up form) |

**Acceptance:** as §2.1.

## §2.5 Commission fields (opportunity)

| Field | Type | Notes |
|---|---|---|
| Client Monthly Revenue | Monetary | Typed by staff each cycle |
| Reward Amount | Monetary | The partner's share, typed by staff (without Stripe GHL has no payment to compute it from) |
| Commission Status | Dropdown | Not Eligible, Pending, Approved, Paid, Rejected, Disputed |
| Sale Date | Date | |
| Commission Approval Date | Date | |
| Last Commission Payment Date | Date | |
| Commission Payments Made | Number | |

**Acceptance:** as §2.1.

## §2.6 Tags

| Group | Tags |
|---|---|
| Source | `source/instantly`, `source/linkedin-outflo`, `source/referral`, `source/manual` |
| Status | `status/nurture`, `status/not-now`, `status/dnc`, `status/no-show`, `status/auto-responder` |
| Interest | `interest/partner-program` |
| Referral engine (Justin's spec §9) | `referral-partner`, `referred-lead`, `referral-attribution-pending`, `referral-attribution-conflict`, `referral-verified`, `commission-pending`, `commission-approved`, `commission-paid`, `needs-reply`, `appointment-booked`, `appointment-showed`, `sales-qualified`, `partner-onboarding`, `partner-needs-activation` |
| Segment | `segment/<name>`, one per entry in `program.segments` |

GHL stores tags lowercase. The monthly commission loop uses no tags: they would pile up each month (§7.1).

**Acceptance:** `verify --live` shows every tag present.
