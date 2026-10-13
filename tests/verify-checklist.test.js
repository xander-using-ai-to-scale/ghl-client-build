'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/setup.js');
const { runBuild } = require('../lib/build.js');
const { runVerify, formatTable } = require('../lib/verify.js');
const { renderChecklist } = require('../lib/checklist.js');

async function builtAccount({ workflows = true, forms = true } = {}) {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  if (workflows) t.fake.state.workflows = t.resolved.workflows.map((w, i) => ({ id: `wf_${i}`, name: w.name, status: 'draft', version: 1 }));
  if (forms) t.fake.state.forms = t.resolved.forms.map((f, i) => ({ id: `form_${i}`, name: f.name }));
  return t;
}

test('verify: a complete build passes, and verify only reads', async () => {
  const t = await builtAccount();
  const before = t.fake.calls.length;
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  assert.equal(r.summary.fail, 0, formatTable(r.rows.filter((x) => x.result === 'FAIL')));
  assert.ok(r.summary.pass > 40);
  assert.equal(t.fake.calls.slice(before).filter((c) => c.method !== 'GET').length, 0);
});

test('verify: workflows are checked by name; a missing one fails', async () => {
  const t = await builtAccount();
  t.fake.state.workflows.pop();
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  const fails = r.rows.filter((x) => x.result === 'FAIL');
  assert.equal(fails.length, 1);
  assert.equal(fails[0].area, 'workflows');
  assert.match(fails[0].found, /missing/);
});

test('verify: a customer-facing workflow that is published is a WARN, with its status', async () => {
  const t = await builtAccount();
  const signup = t.resolved.workflows.find((w) => w.key === 'partner_signup');
  t.fake.state.workflows.find((w) => w.name === signup.name).status = 'published';
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  const row = r.rows.find((x) => x.check.startsWith(signup.name));
  assert.equal(row.result, 'WARN');
  assert.match(row.found, /published/);
});

test('verify: a calendar whose slotDuration was reset fails', async () => {
  const t = await builtAccount();
  t.fake.state.calendars[0].slotDuration = 30;
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  const row = r.rows.find((x) => x.area === 'calendar' && /settings/.test(x.check));
  assert.equal(row.result, 'FAIL');
  assert.match(row.found, /slotDuration/);
});

test('verify: a person who is not a sub-account user fails', async () => {
  const t = await builtAccount();
  t.fake.state.users = [];
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  assert.ok(r.rows.some((x) => x.area === 'people' && x.result === 'FAIL'));
});

test('verify: what the API cannot read is listed as MANUAL', async () => {
  const t = await builtAccount();
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  assert.ok(r.rows.some((x) => x.result === 'MANUAL' && /Particular users/.test(x.check)));
});

test('checklist: every workflow and form, values filled, no unresolved templates', () => {
  const t = setup({ live: false });
  const md = renderChecklist(t.resolved, { generatedAt: 'TEST' });
  for (const w of t.resolved.workflows) assert.ok(md.includes(`### ${w.name}`), w.name);
  for (const f of t.resolved.forms) assert.ok(md.includes(`### ${f.name}`), f.name);
  assert.ok(!md.includes('${'), 'no ${...} left');
  assert.ok(md.includes('Particular user(s): builder@agency.example'));
  assert.ok(md.includes('Revenue Share Percent -> 10'));
  assert.ok(md.includes('{{contact.email}}'), 'GHL merge fields survive');
  assert.match(md, /<missing: domain\.partner_domain>|ASK THE CLIENT which domain/);
  assert.equal(t.fetchCount, 0);
});

test('checklist: a non-GHL client gets the stop note', () => {
  const { exampleClient } = require('./helpers/setup.js');
  const t = setup({ client: exampleClient({ ghl: { platform: 'other' } }), live: false });
  assert.match(renderChecklist(t.resolved), /not on GoHighLevel/);
});
