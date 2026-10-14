// verify: reads everything back (GET only) and returns a pass/fail table.
//   PASS / FAIL   checked over the API
//   WARN          present, but something needs a person's eye
//   MANUAL        GHL has no API to read it: check it in the UI (the checklist says where)
'use strict';
const { list, present } = require('./config.js');
const { calendarDiff } = require('./ghl.js');

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const optionsOf = (f) => (f.picklistOptions || f.options || []).map((o) => (typeof o === 'string' ? o : o.label || o.name || o.value));

async function runVerify({ resolved, ghl }) {
  const rows = [];
  const row = (area, check, found, result) => rows.push({ area, check, found: String(found ?? ''), result });
  const c = resolved.client;

  const loc = await ghl.getLocation();
  if (!loc.ok) {
    row('account', 'location reachable', `${loc.status} ${loc.hint}`, 'FAIL');
    return finish(rows);
  }
  const location = loc.body.location || loc.body;
  row('account', 'location reachable', `${location.name || ''} (${ghl.locationId})`, 'PASS');

  // People: every person slot must be a user of THIS sub-account (trap T11).
  const users = await ghl.listUsers();
  const userList = users.ok ? users.body.users || [] : [];
  const byEmail = (e) => userList.find((u) => String(u.email || '').toLowerCase() === String(e || '').toLowerCase());
  const people = c.people || {};
  const slots = [['calendar owner', people.calendar_owner_email], ['task assignee', people.task_assignee_email], ['commission approver', people.commission_approver_email], ...list(people.alert_emails).map((e) => ['alert recipient', e])];
  for (const [what, email] of slots) {
    if (!present(email)) continue;
    row('people', `${what} ${email} is a sub-account user`, users.ok ? (byEmail(email) ? 'yes' : 'no') : `${users.status}`, users.ok && byEmail(email) ? 'PASS' : 'FAIL');
  }
  if (people.builder_email && people.builder_email === people.calendar_owner_email) {
    row('people', 'person slots handed to the client', 'still on the builder (placeholder)', 'WARN');
  }

  // Custom fields: exactly once, right type, every option.
  for (const model of ['contact', 'opportunity']) {
    const r = await ghl.listCustomFields(model);
    const live = r.ok ? r.body.customFields || [] : [];
    const want = model === 'contact' ? resolved.contactFields : resolved.opportunityFields;
    for (const f of want) {
      if (!r.ok) { row('fields', `${model}: ${f.name}`, `${r.status} ${r.hint}`, 'FAIL'); continue; }
      const hits = live.filter((x) => x.name === f.name);
      const problems = [];
      if (hits.length !== 1) problems.push(`found ${hits.length} times`);
      const h = hits[0];
      if (h && h.dataType !== f.dataType) problems.push(`type ${h.dataType}, expected ${f.dataType}`);
      if (h && f.options && f.options.length) {
        const missing = f.options.filter((o) => !optionsOf(h).includes(o));
        if (missing.length) problems.push(`missing options: ${missing.join(', ')}`);
      }
      row('fields', `${model}: ${f.name}`, problems.join('; ') || (h && h.dataType), problems.length ? 'FAIL' : 'PASS');
    }
  }

  // Tags.
  const tagsResp = await ghl.listTags();
  const tags = tagsResp.ok ? (tagsResp.body.tags || []).map((t) => String(t.name).toLowerCase()) : [];
  const missingTags = resolved.tags.filter((t) => !tags.includes(t.name.toLowerCase())).map((t) => t.name);
  row('tags', `all ${resolved.tags.length} tags present`, tagsResp.ok ? (missingTags.length ? `missing: ${missingTags.join(', ')}` : `${resolved.tags.length}/${resolved.tags.length}`) : `${tagsResp.status}`, tagsResp.ok && !missingTags.length ? 'PASS' : 'FAIL');

  // Pipelines: exactly once, stages in order.
  const pr = await ghl.listPipelines();
  const pipes = pr.ok ? pr.body.pipelines || [] : [];
  for (const p of resolved.pipelines) {
    const hits = pipes.filter((x) => x.name === p.name);
    const got = hits[0] ? hits[0].stages.slice().sort((a, b) => a.position - b.position).map((s) => s.name) : [];
    const ok = pr.ok && hits.length === 1 && sameJson(got, p.stages);
    row('pipelines', p.name, !pr.ok ? pr.status : hits.length !== 1 ? `found ${hits.length} times` : ok ? `${got.length} stages in order` : `stages: ${got.join(' > ')}`, ok ? 'PASS' : 'FAIL');
  }

  // Calendar: exactly once, managed settings as client.yaml says, owner.
  const cr = await ghl.listCalendars();
  const calHits = cr.ok ? (cr.body.calendars || []).filter((x) => x.name === resolved.calendar.name) : [];
  if (calHits.length !== 1) row('calendar', resolved.calendar.name, cr.ok ? `found ${calHits.length} times` : cr.status, 'FAIL');
  else {
    const full = await ghl.getCalendar(calHits[0].id);
    const saved = full.ok ? full.body.calendar || full.body : calHits[0];
    const { drift, unconfirmed } = calendarDiff(saved, resolved.calendar, resolved.calendarManagedKeys);
    row('calendar', `${resolved.calendar.name} settings (length, buffer, hours, notice)`, drift.length ? `differs: ${drift.join(', ')}` : `${saved.slotDuration} min`, drift.length ? 'FAIL' : 'PASS');
    if (unconfirmed.length) row('calendar', 'confirmation text', `not confirmed over the API: ${unconfirmed.join(', ')}; check it in the UI`, 'WARN');
    const owners = (saved.teamMembers || []).map((t) => (userList.find((u) => u.id === t.userId) || {}).email || t.userId);
    const ownerOk = owners.map((e) => String(e).toLowerCase()).includes(String(people.calendar_owner_email || '').toLowerCase());
    row('calendar', `owner is ${people.calendar_owner_email}`, owners.join(', ') || 'nobody', ownerOk ? 'PASS' : 'FAIL');
    row('calendar', 'active', saved.isActive === false ? 'inactive' : 'active', saved.isActive === false ? 'FAIL' : 'PASS');
  }

  // Custom values: present; blank is a WARN (it means "not supplied yet").
  const vr = await ghl.listCustomValues();
  const values = vr.ok ? vr.body.customValues || [] : [];
  for (const cv of resolved.customValues) {
    const hit = values.find((x) => String(x.name).toLowerCase() === cv.name.toLowerCase());
    if (!vr.ok) { row('custom values', cv.name, `${vr.status} ${vr.hint}`, 'FAIL'); continue; }
    if (!hit) { row('custom values', cv.name, 'missing', 'FAIL'); continue; }
    const isBlank = String(hit.value || '').trim() === '';
    row('custom values', cv.name, isBlank ? 'blank (not supplied yet)' : hit.value, isBlank ? 'WARN' : 'PASS');
  }

  // Workflows: built in the UI, checked here by name. Status is reported.
  const wr = await ghl.listWorkflows();
  const wfs = wr.ok ? wr.body.workflows || [] : [];
  for (const w of resolved.workflows) {
    if (!wr.ok) { row('workflows', w.name, `${wr.status} ${wr.hint}`, 'FAIL'); continue; }
    const hits = wfs.filter((x) => x.name === w.name);
    if (hits.length !== 1) { row('workflows', w.name, hits.length ? `found ${hits.length} times` : 'missing (build it from out/ui-checklist.md)', 'FAIL'); continue; }
    const h = hits[0];
    const found = `${h.status}${h.version ? ` v${h.version}` : ''}`;
    const result = w.customer_facing && h.status === 'published' ? 'WARN' : 'PASS';
    row('workflows', w.name + (w.customer_facing ? ' (customer-facing)' : ''), result === 'WARN' ? `${found}: live and customer-facing; confirm a person switched it on` : found, result);
  }

  // Forms: by name, if the token can read them.
  const fr = await ghl.listForms();
  for (const f of resolved.forms) {
    if (!fr.ok) { row('forms', f.name, `cannot read forms (${fr.status}); check in Sites -> Forms`, 'MANUAL'); continue; }
    const hits = (fr.body.forms || []).filter((x) => x.name === f.name);
    row('forms', f.name, hits.length === 1 ? hits[0].id : `found ${hits.length} times`, hits.length === 1 ? 'PASS' : 'FAIL');
  }

  // What the API cannot read.
  if (c.affiliate_manager && c.affiliate_manager.enabled) row('affiliate manager', `campaign "${resolved.derived.names.campaign}" published`, 'no API', 'MANUAL');
  row('pages', 'Become a Partner and /refer pages', present(c.domain && c.domain.partner_domain) ? `check https://${c.domain.partner_domain}/become-a-partner` : 'no domain yet', 'MANUAL');
  row('notifications', 'every Internal Notification goes to Particular users, not All users', 'no API (workflow detail is 404)', 'MANUAL');
  row('sms', 'A2P status', (c.sms && c.sms.a2p_status) || 'unknown', 'MANUAL');

  return finish(rows);
}

function finish(rows) {
  const count = (r) => rows.filter((x) => x.result === r).length;
  return { rows, summary: { pass: count('PASS'), fail: count('FAIL'), warn: count('WARN'), manual: count('MANUAL') } };
}

function formatTable(rows) {
  const cols = ['result', 'area', 'check', 'found'];
  const width = (k) => Math.min(70, Math.max(k.length, ...rows.map((r) => String(r[k]).length)));
  const w = Object.fromEntries(cols.map((k) => [k, width(k)]));
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '~' : s.padEnd(n));
  const line = (r) => cols.map((k) => cut(String(r[k]), w[k])).join(' | ');
  return [line({ result: 'RESULT', area: 'AREA', check: 'CHECK', found: 'FOUND' }), cols.map((k) => '-'.repeat(w[k])).join('-|-'), ...rows.map(line)].join('\n');
}

module.exports = { runVerify, formatTable };
