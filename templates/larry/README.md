# Template: larry

Our first lender build, as a template: speed to lead for ad leads (STL), database reactivation (REACT) and the partner email layer (AFF), on top of the standard partner build. The full description, the parity table against the live build and the differences we found are in [spec/10-larry-template.md](../../spec/10-larry-template.md).

## Switch it on

In the client's `client.yaml`:

```yaml
template:
  name: larry
  value_prefix: sr          # custom values become sr_quick_app_url, ...
  sender_name: Dana Example # signs every message
```

The other inputs are commented in [client.example.yaml](../../client.example.yaml). Anything left out takes the source build's value from `defaults.json`.

Then the usual run: `preflight`, `build`, `checklist`, `verify`. `checklist` also writes `out/template-copy.md`.

## What is in this folder

| File | What | Built by |
|---|---|---|
| `defaults.json` | The source build's segments, outreach lists, windows, drip | (inputs) |
| `fields.json`, `tags.json`, `pipelines.json`, `custom-values.json` | Data objects | `build --live` (API), checked by `verify --live` |
| `workflows.json` | STL, REACT and AFF workflows, step by step | You, in the UI, from `out/ui-checklist.md`; verified by name |
| `smart-lists.json` | REACT segments as smart lists | You, in the UI (no API); verify lists them as MANUAL |
| `ui-steps.json` | Setup, segments, additions to the standard workflows, go-live | You, in the UI |
| `copy.json`, `copy/*.md` | Every email and text | You, as email templates and workflow steps, after the client approves |

## Rules

- Everything that emails or texts someone is built in Draft. A person switches it on, one program at a time, after the client's written go.
- The copy is DRAFT until the client approves it in writing. `[[WRITE: ...]]` lines are written for each client first.
- No names, phones, emails, links or products of the source client in these files. A test checks it.
- Nothing here deletes, renames or edits an existing object, and nothing writes to contacts.
