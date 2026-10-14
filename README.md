# GHL client build

Installs our Referral Partner Engine in a client's GoHighLevel sub-account: partner recruiting, partner sign-up with a personal link, referral capture (link, code, intro or staff-entered), first-claim-wins credit, and a commission cycle with approval and payout tasks. The full spec is in [spec/](spec/README.md). What we need from the client is in [CLIENT-CHECKLIST.md](CLIENT-CHECKLIST.md).

## What it builds

| Automatic (API) | By hand, from a generated checklist (GHL has no API for these) |
|---|---|
| 28 contact fields (29 with Instantly), 7 deal fields, the tags | 3 forms: Refer a Client, Partner Sign-Up, Staff Attribution |
| 3 pipelines: Partner Recruiting, Partner Lifecycle, Referred Leads | Up to 8 workflows, 7 without Instantly (exact steps, with the client's names filled in) |
| The Partner Intro Call calendar | The Affiliate Manager campaign |
| 5 custom values (page URLs, booking link, rate, owner) | The partner pages and the domain |
| A pass/fail check of everything above, plus the workflows and forms by name | A2P (the client registers), the notification audit, tests, handover |

It never deletes anything, never renames anything, and builds every customer-facing piece switched off.

## How to run it (5 steps)

You need Node.js 18 or newer and Claude Code.

1. **Open the client's folder in Claude Code** (one folder per client, e.g. `Clients/Summit Ridge Roofing`).
2. **Tell Claude:** `install <this repo's URL> for this client`. Claude copies the repo into the folder, reads [CLAUDE.md](CLAUDE.md) and follows it.
3. **Fill in client.yaml.** Claude creates it from [client.example.yaml](client.example.yaml), fills what it can from the files already in the folder, and asks you only for what is missing. It never asks for a password or token in chat: it creates a `.env` file and you paste the GHL token into it yourself.
4. **Preflight:** `node ghl-client-build/bin/ghl-build.js preflight --live`. It lists every missing input and the stage it blocks, checks the token reaches the account, and checks every person is a user of the sub-account.
5. **Build, then verify:**
   - `node ghl-client-build/bin/ghl-build.js build` shows the plan, with no network.
   - `node ghl-client-build/bin/ghl-build.js build --live --check` compares with the account, writes nothing.
   - `node ghl-client-build/bin/ghl-build.js build --live` creates what is missing. Safe to run again.
   - `node ghl-client-build/bin/ghl-build.js checklist` writes `out/ui-checklist.md`. Do the UI steps in it (or have Claude walk you through them).
   - `node ghl-client-build/bin/ghl-build.js verify --live` prints a pass/fail table. Done when it has no FAIL and every MANUAL row is checked.

Every run writes a log to `out/` next to client.yaml. The token is never printed or logged.

## Rules it follows

- Nothing touches the internet without `--live`. `preflight` and `verify` only read.
- It reads what exists first and creates only what is missing. It never deletes. Edits happen only with `--repair`: append missing pipeline stages, reset our own calendar's settings to client.yaml (full settings, never partial), fill a blank custom value.
- Notifications go to named people, never "All users". Tasks go to one person. Everyone named must be a user of the sub-account.
- No email or text reaches a partner or a customer until a person switches it on.

## When the client is not on GoHighLevel

Set `ghl.platform: other` in client.yaml. Run `preflight` and `checklist`, then stop: `build` and `verify` refuse to run. The spec in [spec/](spec/README.md) and the checklist still describe exactly what to build in their system.

## Tests

`npm test` (or `node --test` in this folder). Offline, against a fake GHL. See [CHANGELOG.md](CHANGELOG.md) for the count.
