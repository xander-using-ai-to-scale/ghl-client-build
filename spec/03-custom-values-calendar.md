# 3. Custom values and the calendar

## §3.1 Custom values

Built over the API (`config/custom-values.json`). Every fact that can change lives in one custom value, so emails and pages read it as `{{custom_values.<key>}}` and a change is one edit (Playbook §10.6; the first build's set, Oct 13 2026).

| Name | Value |
|---|---|
| Partner Page URL | `https://<partner_domain>/become-a-partner` |
| Refer a Client URL | `https://<partner_domain>/refer` |
| Partner Call Booking URL | `https://api.leadconnectorhq.com/widget/booking/<calendar id>`, filled by the build once the calendar exists |
| Partner Commission Rate | `program.commission_label`, or `<rate>%` |
| Partner Program Owner | `people.program_owner_name` |

A value the client has not supplied yet is stored as a single space: GHL keeps no empty custom value (the lender build, Sep 28 2026). `build --live --repair` fills a blank value once `client.yaml` has it. The build never overwrites a value someone filled in.

**Acceptance:** `verify --live` shows all five present. A blank one is a WARN, not a FAIL.

## §3.2 Calendar: Partner Intro Call

Built over the API (`config/calendar.json`), round-robin, owned by `people.calendar_owner_email` (our builder until handover). Defaults from the standard build: 20-minute calls, 10-minute buffer, 30-minute interval, 2 hours' notice, bookable 30 days ahead, auto-confirm, reschedule and cancel allowed. Hours come from `calendar.hours` in the client's time zone.

GHL's default confirmation text ("we will contact you shortly to confirm") is wrong when auto-confirm is on, so the build sets `calendar.confirmation_text` or a plain default.

The build does not set, so the checklist does: the video link, a daily maximum, and blocked dates. Block away dates as soon as they are known: the window runs 30 days ahead, so dates a month out are already bookable.

**Every calendar update sends the full saved calendar** (trap T6): a PUT carrying only `openHours` reset `slotDuration` from 20 to 30. `build --live --repair` reads the saved calendar, lays the managed settings on top, refuses to send if any slot setting or `openHours` is missing, then reads it back and compares. The saved copy goes in the run log.

**Acceptance:** `verify --live` shows the calendar once, its managed settings equal `client.yaml`, the owner is `people.calendar_owner_email`, and it is active.
