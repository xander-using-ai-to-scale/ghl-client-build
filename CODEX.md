# CODEX.md: build Larry's system for a new client

One page to paste into Codex or Claude Code, opened in the new client's folder. It installs this repo, switches on the `larry` template (speed to lead, reactivation, partner emails, on top of the standard partner build) and runs it. The agent also reads [CLAUDE.md](CLAUDE.md): its rules apply here too.

## Paste this, with the brackets filled

```
Install https://github.com/xander-using-ai-to-scale/ghl-client-build for this client and use template larry.
Read ghl-client-build/CLAUDE.md and ghl-client-build/CODEX.md first and follow them.

Client: [business name], [website], time zone [e.g. America/Chicago]
GHL sub-account location id: [id]  (I will paste the token into .env myself)
Our builder user in their GHL: [email]
Sender (signs every message): [full name], phone [phone], email [email]
Custom value prefix: [2-4 lowercase letters, e.g. sr]
Who gets alerts: [emails]. Reply and call tasks: [email]. Owner tasks: [email]
Ad leads land in GHL by: [Facebook lead form / website form / webhook]
Their own lead pipeline: [name and stages, or "none"]
Short application or request link: [url or "none yet"]
Past clients live in: [GHL / a CRM export / a spreadsheet]
Partner lists for outreach: [e.g. realtors (their clients become ours), contractors (they turn work away)]
Sending domain: [domain], authenticated: [yes/no]. A2P: [not started / submitted / approved]
Anything in their GHL we must not touch: [...]
```

## What the agent does, in order

| Step | Command (from the client's folder) | Network |
|---|---|---|
| 1 | `git clone <repo> ghl-client-build`, then `node --test` inside it (report the count; stop if any fail) | |
| 2 | Copy `ghl-client-build/client.example.yaml` to `./client.yaml`; fill it from the brief and the folder; set `template.name: larry`; replace every Summit Ridge value. Create `.env` with `GHL_TOKEN=` and ask the person to paste the token | none |
| 3 | `node ghl-client-build/bin/ghl-build.js preflight` | none |
| 4 | `node ghl-client-build/bin/ghl-build.js preflight --live` | reads |
| 5 | `node ghl-client-build/bin/ghl-build.js build --live --check`: show the plan, get a clear yes | reads |
| 6 | `node ghl-client-build/bin/ghl-build.js build --live` | **writes** (creates what is missing) |
| 7 | `node ghl-client-build/bin/ghl-build.js checklist` -> `out/ui-checklist.md` and `out/template-copy.md` | none |
| 8 | Write the `[[WRITE: ...]]` lines in `out/template-copy.md`; send the copy to the client for approval | |
| 9 | The person builds the UI steps in `out/ui-checklist.md` (forms, workflows, smart lists, email templates), all in Draft; the agent can guide | |
| 10 | `node ghl-client-build/bin/ghl-build.js verify --live` until no FAIL | reads |
| 11 | Tests on `@example.com` contacts, then go-live one program at a time on the client's written go | |

## Manual (GHL has no API for these)

Workflows, forms, smart lists, email templates, the partner pages and domain, the Affiliate Manager, the calendar's video link and daily maximum, tagging contacts into reactivation segments, A2P (the client registers it).

## Needs the client's go

- The copy in `out/template-copy.md`: approved in writing, then `template.copy.approved: true`.
- Switching on each program: STL, then the partner emails, then reactivation segment by segment.
- Any write to their contacts (segment tags, bulk enrollment) and any change to their own workflows.

## Safety rules

- Never put a token or password in chat, `client.yaml` or any tracked file. The token goes in `.env`.
- `build` creates only what is missing. It never deletes, renames or edits the client's objects. `--repair` only with a yes.
- Everything that emails or texts someone is built in Draft. Nothing reaches a real contact until a person switches it on.
- Tests use `@example.com` contacts with unique phones, never real people.
- Cold lists never go into GHL by CSV import.
- Two failures in a row on the same step: stop and report what ran, the error, and what it likely means.
