# Changelog

## v0.2.0 (Oct 17 2026)

Template `larry`: Larry's speed to lead, reactivation and partner emails, for any client. 85 offline tests (`node --test`), 64 before.

- `template.name: larry` in client.yaml switches it on; `templates/larry/` holds it as data, like `config/`. Its objects go through the same build, verify and checklist code: create-only, never delete or rename, Draft first, verify by name.
- API: 7 contact fields (`stl_*`, `react_*`), the STL, REACT and AFF tags (one segment tag per segment, one queue tag per outreach list), `STL | Inbound Leads` only when the client has no lead pipeline, `AFF | Broker Intake` on request, 7 custom values named `<prefix>_*`.
- Checklist: 3 STL, up to 7 REACT and 5 + one-per-list AFF workflows with every step, trigger, wait, window and person filled in; the REACT smart lists; additions to the standard Partner Sign-Up and Referral Capture; setup, segment tagging and go-live steps. SMS steps appear only once A2P is approved.
- Copy: `checklist` also writes `out/template-copy.md`, every message DRAFT, from `templates/larry/copy/`. Business-specific lines are `[[WRITE: ...]]` prompts.
- verify: smart lists, copy approval and email templates are MANUAL rows; template people are checked as sub-account users. preflight checks the template inputs only when it is on.
- `when` conditions take `&&`. `CODEX.md`: the one page to paste into Codex or Claude Code.
- `spec/10-larry-template.md`: what the template builds, a 51-row parity table against Larry's live account (read with GET only, Oct 17) and the build record, and 8 differences between the docs and the live account. `tests/fixtures/larry-live-2026-10-17.json` keeps the live names (no contact data); a test checks the template still gives them.
- CLIENT-CHECKLIST and client.example.yaml: the template's inputs.

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
