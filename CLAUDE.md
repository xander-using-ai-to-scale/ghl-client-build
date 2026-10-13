# CLAUDE.md: installing and running the GHL client build

You are a Claude Code session opened in a **client's folder** and pointed at this repo. Your job: install the repo here, gather the client's details into `client.yaml`, then run the pipeline with the person you are working with (usually our CEO, who does the GHL installs). Read this whole file before doing anything.

## 1. Install (self-install)

1. Work in the client's folder (the current directory). Clone the repo into a subfolder: `git clone <repo URL> ghl-client-build`. If you cannot clone, copy the files in. Do not put the client's files inside `ghl-client-build/`.
2. If `ghl-client-build/` already exists, update it with `git -C ghl-client-build pull` instead.
3. Check Node: `node --version` must be 18 or newer. Run the tests once: `node --test` inside `ghl-client-build/`. Report the count. If tests fail, stop and report.
4. If the client's folder is a git repository, make sure its `.gitignore` has `.env`, `client.yaml` and `out/`.

## 2. Build client.yaml (interview, do not guess)

1. Copy `ghl-client-build/client.example.yaml` to `./client.yaml` (the client's folder, not the repo).
2. **Read what is already in the folder first**: notes, transcripts, the handoff packet, emails, proposals. Fill every field you can from them, and note where each value came from.
3. Run `node ghl-client-build/bin/ghl-build.js preflight`. It lists every missing input and the stage it blocks.
4. Ask the person for the rest, a few questions at a time, starting with what blocks `build`. Use the intake questions in `ghl-client-build/CLIENT-CHECKLIST.md`. Never invent a client's rate, terms, hours, domain or people.
5. Replace every Summit Ridge Roofing placeholder. The example's 10% rate is a dummy.
6. **Secrets:** never ask for a password, token or API key in chat, and never write one into client.yaml or any tracked file. Create `./.env` with one line, `GHL_TOKEN=`, and ask the person to paste the token after the `=` themselves and save. If a secret appears in chat anyway, do not repeat it, do not save it, and tell the person to rotate it.

## 3. Run order

All commands run from the client's folder.

| Step | Command | Network |
|---|---|---|
| 1 | `node ghl-client-build/bin/ghl-build.js preflight` | none |
| 2 | `node ghl-client-build/bin/ghl-build.js preflight --live` | reads only |
| 3 | `node ghl-client-build/bin/ghl-build.js build` (dry run: the plan) | none |
| 4 | `node ghl-client-build/bin/ghl-build.js build --live --check` (compare with the account) | reads only |
| 5 | `node ghl-client-build/bin/ghl-build.js build --live` | **writes** (creates what is missing) |
| 6 | `node ghl-client-build/bin/ghl-build.js checklist` -> `out/ui-checklist.md` | none |
| 7 | The UI steps in `out/ui-checklist.md`, done by the person in GHL (you can guide them) | |
| 8 | `node ghl-client-build/bin/ghl-build.js verify --live` | reads only |

Before step 5, show the person the step-4 plan and get a clear yes. Use `--repair` only when step 4 or verify reports drift in our own objects, and only after a yes.

If `ghl.platform` is `other`, run steps 1 and 6 only and stop: the spec and the checklist describe what to build in their system.

## 4. GHL traps (all in spec/09-ghl-traps.md)

- Every API call needs a browser User-Agent; without it Cloudflare answers 1010, which looks like an auth error. The code handles it. Do not write your own curl calls to GHL.
- Pipeline PUT: `locationId` in the query string, never the body.
- A calendar PUT must carry the full saved settings, or `slotDuration` resets. Only `build --repair` updates the calendar, and it does this for you.
- Workflows and forms cannot be created by API. Never try; use the checklist, then verify by name.
- No smart-list API. `GET customFields` shows only custom fields, not GHL's stock ones.
- A sub-account token only. An agency token fails with "user type mismatch".
- An agency owner is not a sub-account user. Every person in client.yaml must show up in `preflight --live`.
- Notifications default to "All users". Ours go to named people; also audit the client's own workflows (ask before changing them).
- A2P is per sub-account and the client registers it. SMS stays off until approved.

## 5. Hard rules

- **Never send a message to a real contact.** No test email, text or form fill to a real person. Tests use `@example.com` contacts with unique phone numbers, created only with the person's go-ahead.
- **Everything customer-facing is built OFF or Draft** (workflows that message people, the partner pages, the Affiliate Manager invite). A person switches each one on.
- **Never delete** anything in the client's account, and never rename or edit the client's own objects. Cleanup of test records needs the account owner's explicit go-ahead, a backup first, and deletion by id.
- **No live API calls other than through this pipeline**, and none to Slack, ClickUp, Attio or any other system.
- **Two failures in a row, stop.** If the same step fails twice, stop and report: what you ran, the exact error, and what you think it means. Do not try a third approach on your own.
- Report in plain short sentences: what was built, what is blocked, what you need from the person.

## 6. Done

The build is done when `verify --live` shows no FAIL, every MANUAL row has been checked by a person, and the handover steps in the checklist are ticked. Leave `client.yaml`, `out/ui-checklist.md` and the latest verify log in the client's folder.
