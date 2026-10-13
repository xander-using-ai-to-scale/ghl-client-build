# Changelog

## v0.1.0 (Oct 14 2026)

First version.

- The build spec in `spec/`, derived from Justin's Referral Partner Engine spec, the GHL Affiliate Program Build Playbook and two real builds. Where the sources disagree, and the defaults we picked ourselves, are listed in `spec/README.md`.
- The build definition as data in `config/`: fields, tags, pipelines, calendar, custom values, forms, workflows, UI steps. Every object references its spec section.
- The pipeline (Node.js 18+, no dependencies): `preflight`, `build` (dry run by default; `--live`, `--check`, `--repair`), `checklist`, `verify`.
- `client.example.yaml` for a made-up client (Summit Ridge Roofing), `CLIENT-CHECKLIST.md`, `CLAUDE.md` for the self-install.
- 60 offline tests against a fake GHL (`node --test`): idempotency, zero network calls in a dry run, headers and User-Agent on every call, `locationId` in the query for a pipeline PUT, full settings on a calendar update, preflight flags missing inputs, and more.
- Not yet run against a live GHL account.
