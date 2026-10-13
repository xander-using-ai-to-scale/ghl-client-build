# 6. GHL's Affiliate Manager

On by default (`affiliate_manager.enabled`). It gives every partner a profile, a portal login and one link, and files each referred client under its partner. The referral engine (§5) still does the credit and the commission. Built in the UI, with GHL on screen: a covered browser window stops GHL's dropdowns from responding.

Sources: Build Playbook §7 (Phase 5); the first client's build, Sep 22 and Oct 13 2026; Claude Memory "GHL's Affiliate Manager".

## §6.1 Setup

1. **Campaign** (Marketing -> Affiliate Manager -> Campaign -> Add), named after the program. Links lead to **Forms -> Refer a Client**; the link becomes the form URL plus `?am_id=<the partner's Referral ID>`. Keep it on Forms: switching to Funnels greys out "Set Up Reward" until a product is attached, so a lead-only campaign cannot save.
2. **Commission:** Pay Per Lead with the per-lead amount off, unless the client pays per lead. Pay Per Sale is greyed out for a form campaign.
3. **Settings:** no assigned affiliate; GHL's invite email on (it is the partner's portal login); cookie life 365 days; payout terms as the client pays. Publish.
4. **Partner Sign-Up workflow** ends with Add to affiliate manager, then Add to affiliate campaign (§5.4).
5. **Affiliate Link workflow** (§5.5).
6. **Refer a Client form:** the hidden Claimed Referral Code field's Query Key = `am_id`.
7. **Referral Capture and Staff Attribution:** in the first-claim branch only, "Add leads under an affiliate" with Custom Mapping, AM ID = the contact's Referral Code. There is no campaign picker in this mode: the `am_id` names the campaign. A disputed claim is filed under nobody until a person decides.

The `am_id` is GHL's: the partner's name plus digits, editable per partner. If staff change it, they update the partner's Referral Code and Affiliate Link to match.

**Acceptance:** a test partner signs up and appears under the campaign; their Affiliate Link carries `am_id` plus our Partner ID and name; a referral through that link shows under them (tests 6 and 7, §8.2). MANUAL in verify: no API reads the Affiliate Manager.

## §6.2 What it cannot do without Stripe

A Forms campaign holds no sales, and "Add Manual Commission" offers no campaign. So partners see their leads in the portal, not their earnings. Commissions stay in the Referred Leads cycle (§7.1). Showing earnings in the portal needs the client's Stripe plus a sales campaign with a percentage commission. Stripe is optional.
