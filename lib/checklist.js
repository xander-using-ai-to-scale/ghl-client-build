// checklist: writes out/ui-checklist.md, the exact UI steps for everything GHL's API cannot build
// (forms, workflows, pages, the Affiliate Manager, Instantly, A2P, handover), with this client's
// values filled in. Offline: no network.
'use strict';

const ORDER_BEFORE = ['access', 'calendar_extras', 'custom_values_check'];
const ORDER_BETWEEN = ['affiliate_manager']; // after forms, before workflows (the campaign must exist first)
const ORDER_AFTER = ['funnel', 'instantly', 'notifications_audit', 'sms', 'email_sending', 'views', 'tests', 'handover'];

const box = (s) => `- [ ] ${s}`;
const stepText = (s) => (typeof s === 'string' ? s : s.text);
const isBase = (w) => !w.program;

function workflow(lines, w) {
  lines.push(`### ${w.name}`, '');
  lines.push(`- **Trigger:** ${w.trigger}`);
  for (const s of w.settings || []) lines.push(`- **Setting:** ${s}`);
  if (w.customer_facing) lines.push(`- **Customer-facing:** ${w.customerFacingWhy || 'yes'} Leave it in Draft until a person switches it on.`);
  lines.push('');
  w.steps.forEach((s, i) => lines.push(box(`${i + 1}. ${stepText(s)}`)));
  lines.push(box('Header Save clicked; `verify --live` shows this workflow by name'));
  lines.push('', `Test: ${w.test}`, '');
}

// The template's part of the checklist: its sections, smart lists and workflows, program by program.
function templatePart(lines, resolved, n) {
  const secs = resolved.templateSections || [];
  const at = (program, place) => secs.filter((s) => s.program === program && s.place === place);
  for (const s of at('all', 'before')) section(lines, n++, s);
  for (const prog of resolved.templatePrograms || []) {
    for (const s of at(prog.key, 'before')) section(lines, n++, s);
    if (prog.key === 'react' && (resolved.smartLists || []).length) {
      lines.push(`## ${n++}. Reactivation smart lists (Contacts -> Smart Lists)`, '', `Spec: spec/${prog.spec.split(' ')[0]}.md ${prog.spec.split(' ').slice(1).join(' ')}. No smart-list API (trap T5): build them here.`, '');
      lines.push('| Smart list | Filter | Who gets the tag | Copy |', '|---|---|---|---|');
      const esc = (x) => String(x).replace(/\|/g, '\\|');
      for (const l of resolved.smartLists) lines.push(`| ${esc(l.name)} | ${l.filter} | ${l.rule} | ${l.sequence === 'aff-handoff' ? 'none: partner outreach' : `sequence "${l.sequence}"`} |`);
      lines.push('', box('Every smart list built and its count written down'), '');
    }
    const wfs = resolved.workflows.filter((w) => w.program === prog.key);
    if (wfs.length) {
      lines.push(`## ${n++}. ${prog.title} workflows (Automation -> Workflows)`, '', `Spec: spec/${prog.spec.split(' ')[0]}.md ${prog.spec.split(' ').slice(1).join(' ')}. Rules for these workflows:`, '');
      for (const r of prog.rules || []) lines.push(`- ${r}`);
      lines.push('');
      for (const w of wfs) workflow(lines, w);
    }
    for (const s of at(prog.key, 'after')) section(lines, n++, s);
  }
  for (const s of at('all', 'after')) section(lines, n++, s);
  return n;
}

// out/template-copy.md: every message of the template, with this client's values filled in.
function renderCopy(resolved, { generatedAt = new Date().toISOString() } = {}) {
  if (!resolved.template) return null;
  const c = resolved.client;
  const lines = [`# Message copy (DRAFT): ${(c.client && c.client.name) || ''}`, ''];
  lines.push(`**DRAFT. The client approves every message below in writing before any workflow that sends is switched on.** Generated ${generatedAt} by \`ghl-build checklist\`.`, '');
  lines.push('`{{...}}` are GHL merge fields: paste them as they are. `[[WRITE: ...]]` is a line to write for this client before the client reviews it. `<missing: ...>` is an input still empty in client.yaml.', '');
  for (const f of resolved.templateCopy || []) lines.push(`# ${f.title}`, '', f.text.trim(), '');
  return lines.join('\n');
}

function section(lines, n, s) {
  lines.push(`## ${n}. ${s.title}`, '', `Spec: spec/${s.spec.split(' ')[0]}.md ${s.spec.split(' ').slice(1).join(' ')}`.trim(), '');
  for (const st of s.steps) lines.push(box(stepText(st)));
  lines.push('');
}

function renderChecklist(resolved, { generatedAt = new Date().toISOString() } = {}) {
  const c = resolved.client;
  const name = (c.client && c.client.name) || '(no client name)';
  const lines = [];
  lines.push(`# UI build checklist: ${name}`, '');
  lines.push(`Generated ${generatedAt} from client.yaml by \`ghl-build checklist\`. Values are filled in. Tick each box as you go, then run \`verify --live\`.`, '');
  if (c.ghl && c.ghl.platform === 'other') {
    lines.push('> **This client is not on GoHighLevel.** Nothing here can be built by the pipeline. Use this checklist and spec/ as the description of what to build in their system, and stop here.', '');
  }
  const missing = [...resolved.missing].sort();
  if (missing.length) {
    lines.push('> **Missing in client.yaml** (shown below as `<missing: ...>`): ' + missing.map((m) => `\`${m}\``).join(', '), '');
  }
  lines.push('Built by the API (`build --live`), not here: custom fields, tags, pipelines, the calendar, custom values.', '');
  if (resolved.template) lines.push(`Template: ${resolved.template.about} Its parts come after the standard workflows. Copy: out/template-copy.md (DRAFT).`, '');

  const byKey = Object.fromEntries(resolved.uiSections.map((s) => [s.key, s]));
  let n = 1;
  for (const k of ORDER_BEFORE) if (byKey[k]) section(lines, n++, byKey[k]);

  // Forms
  lines.push(`## ${n++}. Forms (Sites -> Forms)`, '', 'Spec: spec/04-forms-pages.md. Forms write only to the "Claimed ..." fields; a workflow decides who gets the credit.', '');
  for (const f of resolved.forms) {
    lines.push(`### ${f.name}`, '', `Filled by: ${f.filledBy}. Runs: ${(resolved.workflows.find((w) => w.key === f.runs) || {}).name || f.runs}.`, '');
    lines.push('| Field | Writes to | Hidden | URL query key | Note |', '|---|---|---|---|---|');
    for (const fl of f.fields) lines.push(`| ${fl.label} | ${fl.writes} | ${fl.hidden ? 'yes' : ''} | ${fl.queryKey || ''} | ${fl.note || ''} |`);
    lines.push('', box(`Form "${f.name}" built and saved`), '');
  }

  for (const k of ORDER_BETWEEN) if (byKey[k]) section(lines, n++, byKey[k]);

  // Workflows
  lines.push(`## ${n++}. Workflows (Automation -> Workflows)`, '', 'Spec: spec/05-workflows.md. Rules for every workflow:', '');
  for (const r of resolved.rulesForAll) lines.push(`- ${r}`);
  lines.push('');
  for (const w of resolved.workflows.filter(isBase)) workflow(lines, w);
  if (resolved.template) n = templatePart(lines, resolved, n);

  for (const k of ORDER_AFTER) if (byKey[k]) section(lines, n++, byKey[k]);
  return lines.join('\n');
}

module.exports = { renderChecklist, renderCopy };
