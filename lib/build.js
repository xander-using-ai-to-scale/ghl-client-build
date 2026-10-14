// build: creates over the API what config/ says and the account does not have yet.
//
// Three modes:
//   dry    (default)          no network at all; prints every object the build manages
//   check  (--check --live)   reads the account and prints the real plan; writes nothing
//   live   (--live)           reads, then creates only what is missing
//
// Rules: read existing objects by name first; create only what is missing; never delete; never
// rename. The only edits are opt-in with --repair and are additive: append missing stages to one
// of our pipelines, bring our calendar's settings back to client.yaml (always sending the full
// saved calendar, trap T6), and fill one of our custom values that is still blank.
// Workflows, forms, pages and the Affiliate Manager are UI-only: see the checklist command.
'use strict';
const { calendarUpdateBody, calendarDiff, bookingUrl } = require('./ghl.js');

class BuildError extends Error {}

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const optionsOf = (f) => (f.picklistOptions || f.options || []).map((o) => (typeof o === 'string' ? o : o.label || o.name || o.value));
const blank = (v) => v === undefined || v === null || String(v).trim() === '';

async function runBuild({ resolved, ghl, mode = 'dry', repair = false, print = () => {} }) {
  const actions = [];
  const add = (a) => { actions.push(a); print(a); };
  const must = (r, what) => {
    if (!r.ok) throw new BuildError(`${what} failed with ${r.status}${r.hint ? ` (${r.hint})` : ''}. Stopped before writing anything else: a misread account would create duplicates.\n${typeof r.body === 'string' ? r.body : JSON.stringify(r.body)}`);
    return r.body || {};
  };
  const write = mode === 'live';
  const plannedCreate = (kind, name, detail) => add({ kind, name, action: write ? 'create' : 'would create', ...(detail ? { detail } : {}) });

  // ---------- dry run: no network ----------
  if (mode === 'dry') {
    for (const f of resolved.contactFields) add({ kind: 'field', name: `contact: ${f.name}`, action: 'would create if missing', detail: f.dataType });
    for (const f of resolved.opportunityFields) add({ kind: 'field', name: `opportunity: ${f.name}`, action: 'would create if missing', detail: f.dataType });
    for (const t of resolved.tags) add({ kind: 'tag', name: t.name, action: 'would create if missing' });
    for (const p of resolved.pipelines) add({ kind: 'pipeline', name: p.name, action: 'would create if missing', detail: p.stages.join(' > ') });
    add({ kind: 'calendar', name: resolved.calendar.name, action: 'would create if missing', detail: `${resolved.calendar.slotDuration} min, owner ${resolved.client.people && resolved.client.people.calendar_owner_email}` });
    for (const cv of resolved.customValues) add({ kind: 'custom value', name: cv.name, action: 'would create if missing', detail: cv.value === '@booking_url' ? '<booking link once the calendar exists>' : (cv.value || '(blank)') });
    return finish(actions, mode);
  }

  // ---------- users: the calendar needs its owner's user id ----------
  const users = must(await ghl.listUsers(), 'GET users').users || [];
  const userId = (email) => (users.find((u) => String(u.email || '').toLowerCase() === String(email || '').toLowerCase()) || {}).id;

  // ---------- custom fields ----------
  for (const model of ['contact', 'opportunity']) {
    const have = must(await ghl.listCustomFields(model), `GET ${model} custom fields`).customFields || [];
    const want = model === 'contact' ? resolved.contactFields : resolved.opportunityFields;
    for (const f of want) {
      const name = `${model}: ${f.name}`;
      const hit = have.find((x) => x.name === f.name);
      if (hit) {
        const warn = [];
        if (hit.dataType !== f.dataType) warn.push(`it is ${hit.dataType}, config says ${f.dataType}`);
        const missingOpts = (f.options || []).filter((o) => !optionsOf(hit).includes(o));
        if (missingOpts.length) warn.push(`missing options: ${missingOpts.join(', ')} (add them in the UI)`);
        add({ kind: 'field', name, action: 'exists', id: hit.id, ...(warn.length ? { warning: warn.join('; ') } : {}) });
        continue;
      }
      if (!write) { plannedCreate('field', name, f.dataType); continue; }
      const r = await ghl.createCustomField({ name: f.name, dataType: f.dataType, model, options: f.options });
      if (!r.ok) { add({ kind: 'field', name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}` }); continue; }
      const cf = (r.body && (r.body.customField || r.body)) || {};
      add({ kind: 'field', name, action: 'created', id: cf.id, detail: cf.fieldKey });
    }
  }

  // ---------- tags (GHL stores them lowercase) ----------
  const tagsHave = new Set((must(await ghl.listTags(), 'GET tags').tags || []).map((t) => String(t.name).toLowerCase()));
  for (const t of resolved.tags) {
    if (tagsHave.has(t.name.toLowerCase())) { add({ kind: 'tag', name: t.name, action: 'exists' }); continue; }
    if (!write) { plannedCreate('tag', t.name); continue; }
    const r = await ghl.createTag(t.name);
    if (!r.ok) { add({ kind: 'tag', name: t.name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}` }); continue; }
    tagsHave.add(t.name.toLowerCase());
    add({ kind: 'tag', name: t.name, action: 'created', id: r.body && r.body.tag && r.body.tag.id });
  }

  // ---------- pipelines ----------
  const pipes = must(await ghl.listPipelines(), 'GET pipelines').pipelines || [];
  for (const p of resolved.pipelines) {
    const hits = pipes.filter((x) => x.name === p.name);
    if (hits.length > 1) { add({ kind: 'pipeline', name: p.name, action: 'exists', warning: `found ${hits.length} times; fix by hand` }); continue; }
    const hit = hits[0];
    if (!hit) {
      if (!write) { plannedCreate('pipeline', p.name, p.stages.join(' > ')); continue; }
      const r = await ghl.createPipeline({ name: p.name, stages: p.stages });
      if (!r.ok) { add({ kind: 'pipeline', name: p.name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}` }); continue; }
      add({ kind: 'pipeline', name: p.name, action: 'created', id: (r.body && (r.body.pipeline || r.body) || {}).id });
      continue;
    }
    const current = (hit.stages || []).slice().sort((a, b) => a.position - b.position);
    const names = current.map((s) => s.name);
    const missingStages = p.stages.filter((s) => !names.includes(s));
    if (!missingStages.length) {
      add({ kind: 'pipeline', name: p.name, action: 'exists', id: hit.id, ...(sameJson(names, p.stages) ? {} : { warning: `stage order differs: ${names.join(' > ')}` }) });
      continue;
    }
    if (!repair) { add({ kind: 'pipeline', name: p.name, action: 'exists', id: hit.id, warning: `missing stages: ${missingStages.join(', ')}. Run build --live --repair to append them.` }); continue; }
    if (!write) { add({ kind: 'pipeline', name: p.name, action: 'would repair', id: hit.id, detail: `append ${missingStages.join(', ')}` }); continue; }
    const stages = [
      ...current.map((s, i) => ({ id: s.id, name: s.name, position: i })),
      ...missingStages.map((name, j) => ({ name, position: current.length + j })),
    ];
    const r = await ghl.updatePipeline(hit.id, { name: hit.name, stages, showInFunnel: hit.showInFunnel !== false, showInPieChart: hit.showInPieChart !== false });
    add(r.ok
      ? { kind: 'pipeline', name: p.name, action: 'repaired', id: hit.id, detail: `appended ${missingStages.join(', ')}` }
      : { kind: 'pipeline', name: p.name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}` });
  }

  // ---------- calendar ----------
  const cal = resolved.calendar;
  let calendarId = null;
  const calendars = must(await ghl.listCalendars(), 'GET calendars').calendars || [];
  const calHits = calendars.filter((c) => c.name === cal.name);
  const ownerEmail = resolved.client.people && resolved.client.people.calendar_owner_email;
  if (calHits.length > 1) add({ kind: 'calendar', name: cal.name, action: 'exists', warning: `found ${calHits.length} times; fix by hand` });
  if (calHits.length >= 1) {
    calendarId = calHits[0].id;
    const savedResp = must(await ghl.getCalendar(calendarId), 'GET calendar');
    const saved = savedResp.calendar || savedResp;
    const { drift, unconfirmed } = calendarDiff(saved, cal, resolved.calendarManagedKeys);
    const unconfirmedNote = unconfirmed.length ? `not confirmed in GHL yet: ${unconfirmed.join(', ')} (check the confirmation text in the UI)` : '';
    if (!drift.length) add({ kind: 'calendar', name: cal.name, action: 'exists', id: calendarId, ...(unconfirmedNote ? { warning: unconfirmedNote } : {}) });
    else if (!repair) add({ kind: 'calendar', name: cal.name, action: 'exists', id: calendarId, warning: `settings differ from client.yaml: ${drift.join(', ')}. Run build --live --repair to fix.` });
    else if (!write) add({ kind: 'calendar', name: cal.name, action: 'would repair', id: calendarId, detail: drift.join(', ') });
    else {
      const body = calendarUpdateBody(saved, cal, resolved.calendarManagedKeys, resolved.calendarAlwaysSend);
      const r = await ghl.updateCalendar(calendarId, body);
      if (!r.ok) add({ kind: 'calendar', name: cal.name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}`, savedBefore: saved });
      else {
        const after = must(await ghl.getCalendar(calendarId), 'GET calendar after update');
        const now = after.calendar || after;
        const still = calendarDiff(now, cal, resolved.calendarManagedKeys).drift;
        add({ kind: 'calendar', name: cal.name, action: 'repaired', id: calendarId, detail: `fixed ${drift.join(', ')}`, savedBefore: saved, ...(still.length ? { warning: `still different after the update: ${still.join(', ')}` } : {}) });
      }
    }
  } else {
    const owner = userId(ownerEmail);
    if (!owner) add({ kind: 'calendar', name: cal.name, action: 'failed', error: `${ownerEmail} is not a user of this sub-account, so the calendar has no owner. Add them (Settings -> My Staff) and run again.` });
    else if (!write) plannedCreate('calendar', cal.name, `${cal.slotDuration} min, owner ${ownerEmail}`);
    else {
      const r = await ghl.createCalendar(cal, owner);
      if (!r.ok) add({ kind: 'calendar', name: cal.name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}` });
      else { calendarId = (r.body && (r.body.calendar || r.body) || {}).id; add({ kind: 'calendar', name: cal.name, action: 'created', id: calendarId }); }
    }
  }

  // ---------- custom values ----------
  const cvHave = must(await ghl.listCustomValues(), 'GET custom values').customValues || [];
  for (const cv of resolved.customValues) {
    let value = cv.value === '@booking_url' ? bookingUrl(calendarId) : cv.value;
    if (blank(value)) value = ' '; // GHL keeps no empty custom value; a single space means "not supplied yet"
    const hit = cvHave.find((x) => String(x.name).toLowerCase() === cv.name.toLowerCase());
    if (!hit) {
      if (!write) { plannedCreate('custom value', cv.name, value === ' ' ? '(blank)' : value); continue; }
      const r = await ghl.createCustomValue(cv.name, value);
      add(r.ok
        ? { kind: 'custom value', name: cv.name, action: 'created', id: r.body && r.body.customValue && r.body.customValue.id, detail: value === ' ' ? '(blank)' : value }
        : { kind: 'custom value', name: cv.name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}` });
      continue;
    }
    if (blank(hit.value) && value !== ' ' && repair) {
      if (!write) { add({ kind: 'custom value', name: cv.name, action: 'would repair', id: hit.id, detail: `fill blank with ${value}` }); continue; }
      const r = await ghl.updateCustomValue(hit.id, hit.name, value);
      add(r.ok
        ? { kind: 'custom value', name: cv.name, action: 'repaired', id: hit.id, detail: `filled with ${value}` }
        : { kind: 'custom value', name: cv.name, action: 'failed', error: `${r.status} ${r.hint} ${JSON.stringify(r.body)}` });
      continue;
    }
    const differs = !blank(hit.value) && value !== ' ' && hit.value !== value;
    add({ kind: 'custom value', name: cv.name, action: 'exists', id: hit.id, ...(differs ? { warning: `holds "${hit.value}", client.yaml says "${value}". Not changed: edit it in the UI if client.yaml is right.` } : blank(hit.value) && value !== ' ' ? { warning: 'blank in GHL; run build --live --repair to fill it' } : {}) });
  }

  return finish(actions, mode);
}

function finish(actions, mode) {
  const count = (a) => actions.filter((x) => x.action === a).length;
  return {
    mode,
    actions,
    summary: {
      created: count('created'),
      repaired: count('repaired'),
      exists: count('exists'),
      planned: actions.filter((x) => /^would/.test(x.action)).length,
      failed: count('failed'),
      warnings: actions.filter((x) => x.warning).length,
    },
  };
}

module.exports = { runBuild, BuildError };
