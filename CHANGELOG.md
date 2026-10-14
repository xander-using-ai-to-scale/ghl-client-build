# Changelog

## v0.1.1 (Oct 14 2026)

Fixes from an accuracy audit against the sources. 64 offline tests (`node --test`).

- Workflow rule: every task goes to the one person each step names (the task assignee or the commission approver), matching the steps.
- README and spec/README: `--repair` resets our own calendar's settings; it is not described as additive any more. Field and workflow counts say 28 contact fields (29 with Instantly) and up to 8 workflows (7 without Instantly).
- A 401 "not authorized for this scope" is now reported as a missing scope, not a bad token (test added).
- Calendar checks compare `openHours` by day and time window, so extra keys or another order from GHL are not drift. The confirmation-text keys (`formSubmitType`, `formSubmitThanksMessage`) are a WARN until a live run confirms them, not a FAIL (tests added).
- `--out` is in the usage text. `build --check` or `--repair` without `--live` says it is a dry run (test added).
- CLIENT-CHECKLIST: partner tiers, the cold-email rail and inbox owner, a client-specific build spec, the client's plan against the signed scope, a pointer for AI agents, the token sent privately (a DM or a one-time link), and token rotation at handover. Token rotation is also in the handover steps (spec §8.4 and the checklist).
- spec/README: four more places the sources disagree (attribution method options, the forms, the commission wait and tags, Lost Reason options) and two more of our own decisions (who gets which task, a phone field on Refer a Client).

## v0.1.0 (Oct 14 2026)

First version.

- The build spec in `spec/`, derived from Justin's Referral Partner Engine spec, the GHL Affiliate Program Build Playbook and two real builds. Where the sources disagree, and the defaults we picked ourselves, are listed in `spec/README.md`.
- The build definition as data in `config/`: fields, tags, pipelines, calendar, custom values, forms, workflows, UI steps. Every object references its spec section.
- The pipeline (Node.js 18+, no dependencies): `preflight`, `build` (dry run by default; `--live`, `--check`, `--repair`), `checklist`, `verify`.
- `client.example.yaml` for a made-up client (Summit Ridge Roofing), `CLIENT-CHECKLIST.md`, `CLAUDE.md` for the self-install.
- 60 offline tests against a fake GHL (`node --test`): idempotency, zero network calls in a dry run, headers and User-Agent on every call, `locationId` in the query for a pipeline PUT, full settings on a calendar update, preflight flags missing inputs, and more.
- Not yet run against a live GHL account.
