'use strict';
// The larry template (templates/larry): resolve, build, verify, checklist, copy, and parity with the
// source build's live account (tests/fixtures/larry-live-2026-10-17.json, names only).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { setup, exampleClient, REPO, EXAMPLE } = require('./helpers/setup.js');
const { resolve, loadDefinition } = require('../lib/config.js');
const { runBuild } = require('../lib/build.js');
const { runVerify, formatTable } = require('../lib/verify.js');
const { renderChecklist, renderCopy } = require('../lib/checklist.js');
const { checkInputs, blocking } = require('../lib/preflight.js');
const { main } = require('../lib/cli.js');

const LIVE = require('./fixtures/larry-live-2026-10-17.json');
const def = loadDefinition();
const larry = (over = {}) => exampleClient({ template: { name: 'larry', ...over } });
const writes = (calls) => calls.filter((c) => c.method !== 'GET');
const stepText = (s) => (typeof s === 'string' ? s : s.text);
const steps = (w) => w.steps.map(stepText);
const LEAK = /Larry|Gilmore|ClearBlu|clearblu|Sylvia|\bcb_|applywithustoday|206/;

// The source build's own inputs (no contact data): what a client.yaml for it would say.
function sourceClient() {
  const c = exampleClient({ client: { timezone: 'America/Los_Angeles' }, naming: { prefix: 'AFF | ' } });
  c.template = {
    name: 'larry', value_prefix: 'cb', sender_name: 'Larry Gilmore',
    stl: { own_lead_pipeline: 'ClearBlu Home & Commercial Lending Leads', own_lead_stage: 'Lead', own_app_done_stage: 'Application Received' },
  };
  return c;
}

test('template off: the standard build is unchanged and there is no copy', () => {
  const r = resolve(def, exampleClient());
  assert.equal(r.template, undefined);
  assert.equal(renderCopy(r), null);
  assert.ok(!r.workflows.some((w) => w.program));
  assert.equal(r.pipelines.length, 3);
  assert.equal(r.customValues.length, 5);
});

test('an unknown template name is refused with the known names', () => {
  assert.throws(() => resolve(def, exampleClient({ template: { name: 'nope' } })), /no such template.*larry/);
});

test('template on: fields, tags, pipeline, custom values, workflows, smart lists and copy are added', () => {
  const r = resolve(def, larry());
  for (const f of ['stl_first_touch_at', 'stl_status', 'react_segment', 'react_style', 'react_batch', 'react_last_touch_at', 'react_context']) assert.ok(r.contactFields.some((x) => x.name === f), f);
  assert.deepEqual(r.contactFields.find((f) => f.name === 'react_style').options, ['check-in', 'its-dana', 'whats-changed']);
  assert.deepEqual(r.contactFields.find((f) => f.name === 'react_segment').options.slice(0, 2), ['01-past-customers', '02-lost-estimates']);
  for (const t of ['stl:new', 'stl:handoff-dana', 'react:segment-06', 'react:excluded', 'aff:outreach-sent', 'aff:queue-realtor', 'aff:queue-contractor']) assert.ok(r.tags.some((x) => x.name === t), t);
  assert.ok(r.pipelines.some((p) => p.name === 'STL | Inbound Leads' && p.stages.includes('Handed to Dana')));
  assert.ok(!r.pipelines.some((p) => p.name === 'AFF | Broker Intake'), 'broker intake shell is off by default');
  const cv = r.customValues.map((v) => v.name);
  for (const n of ['sr_quick_app_url', 'sr_partner_calendar_url', 'sr_dana_phone', 'sr_dana_email', 'sr_assistant_email']) assert.ok(cv.includes(n), n);
  assert.equal(r.customValues.find((v) => v.name === 'sr_partner_calendar_url').value, '@booking_url');
  const names = r.workflows.filter((w) => w.program).map((w) => w.name);
  assert.equal(names.length, 17);
  assert.ok(names.includes('REACT | Segment 06 - Long Tail'));
  assert.ok(!names.some((n) => /Segment 05/.test(n)), 'segment 05 hands off to partner outreach, no workflow');
  assert.ok(names.includes('AFF | Outreach - General Contractors'));
  assert.equal(r.smartLists.length, 6);
  assert.ok(r.templateCopy.length >= 5);
});

test('email-only segment has no SMS steps; SMS steps on outreach appear only once A2P is approved', () => {
  const r = resolve(def, larry());
  const s06 = r.workflows.find((w) => w.name === 'REACT | Segment 06 - Long Tail');
  assert.ok(!steps(s06).some((s) => /SMS/.test(s)));
  assert.ok(steps(r.workflows.find((w) => w.name === 'REACT | Segment 01 - Past Customers')).some((s) => /SMS Day 0/.test(s)));
  const out = (c) => steps(c.workflows.find((w) => w.name === 'AFF | Outreach - Realtors'));
  assert.ok(!out(r).some((s) => /SMS/.test(s)));
  const on = resolve(def, exampleClient({ template: { name: 'larry' }, sms: { a2p_status: 'approved' } }));
  assert.equal(out(on).filter((s) => /Send SMS/.test(s)).length, 2);
});

test("the client's own lead pipeline replaces STL | Inbound Leads everywhere", () => {
  const r = resolve(def, larry({ stl: { own_lead_pipeline: 'Roof Leads', own_lead_stage: 'New', own_app_done_stage: 'Estimate Booked', quick_app_url: 'https://x.example/estimate' } }));
  assert.ok(!r.pipelines.some((p) => p.name === 'STL | Inbound Leads'));
  const instant = r.workflows.find((w) => w.key === 'stl_instant');
  assert.ok(steps(instant).some((s) => /pipeline Roof Leads, stage New/.test(s)));
  assert.ok(steps(r.workflows.find((w) => w.key === 'stl_ladder')).some((s) => /Estimate Booked/.test(s)));
  assert.ok(steps(r.workflows.find((w) => w.key === 'stl_router')).some((s) => /No stage move/.test(s)));
  assert.ok(steps(r.workflows.find((w) => w.key === 'react_router')).some((s) => /Create opportunity in Roof Leads at New/.test(s)));
});

test('a program switched off drops its fields, tags and workflows', () => {
  const r = resolve(def, larry({ stl: { enabled: false }, aff_email: { enabled: false } }));
  assert.ok(!r.contactFields.some((f) => f.name.startsWith('stl_')));
  assert.ok(!r.tags.some((t) => t.name.startsWith('stl:') || t.name.startsWith('aff:')));
  assert.ok(!r.workflows.some((w) => w.program === 'stl' || w.program === 'aff'));
  assert.ok(r.workflows.some((w) => w.program === 'react'));
  assert.ok(!r.pipelines.some((p) => p.name === 'STL | Inbound Leads'));
});

test('customize.remove can drop a template object by name', () => {
  const c = larry();
  c.customize.remove.workflows = ['REACT | Re-entry - Check-in'];
  c.customize.remove.tags = ['src:linkedin'];
  const r = resolve(def, c);
  assert.ok(!r.workflows.some((w) => w.name === 'REACT | Re-entry - Check-in'));
  assert.ok(!r.tags.some((t) => t.name === 'src:linkedin'));
});

test('build plan (dry run) lists the template objects and makes no network call', async () => {
  const t = setup({ client: larry(), live: false });
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'dry' });
  const names = r.actions.map((a) => a.name);
  for (const n of ['contact: stl_status', 'contact: react_segment', 'stl:new', 'aff:queue-realtor', 'STL | Inbound Leads', 'sr_quick_app_url', 'sr_dana_phone']) assert.ok(names.includes(n), n);
  assert.equal(t.fetchCount, 0);
});

test('live build creates the template objects once; a second run writes nothing and nothing is deleted', async () => {
  const t = setup({ client: larry() });
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  assert.equal(r.summary.failed, 0, JSON.stringify(r.actions.filter((a) => a.action === 'failed'), null, 2));
  assert.ok(t.fake.state.fields.some((f) => f.name === 'stl_status' && f.picklistOptions.includes('quick-app-complete')));
  assert.ok(t.fake.state.tags.some((x) => x.name === 'react:segment-03'));
  assert.equal(t.fake.state.pipelines.length, 4);
  const cv = Object.fromEntries(t.fake.state.customValues.map((v) => [v.name, v.value]));
  assert.equal(cv.sr_partner_calendar_url, `https://api.leadconnectorhq.com/widget/booking/${t.fake.state.calendars[0].id}`);
  assert.equal(cv.sr_quick_app_url, ' ', 'blank until the client gives the link');
  const before = t.fake.calls.length;
  const r2 = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  assert.equal(r2.summary.created, 0);
  assert.equal(writes(t.fake.calls.slice(before)).length, 0);
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live', repair: true });
  assert.equal(t.fake.calls.filter((c) => c.method === 'DELETE').length, 0);
});

test('build never renames or edits an existing template object of the same name', async () => {
  const t = setup({ client: larry() });
  t.fake.state.fields.push({ id: 'cf_old', name: 'stl_status', dataType: 'TEXT', model: 'contact' });
  t.fake.state.pipelines.push({ id: 'p_old', name: 'STL | Inbound Leads', stages: [{ id: 's1', name: 'New Lead', position: 0 }] });
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  assert.match(r.actions.find((a) => a.name === 'contact: stl_status').warning, /it is TEXT/);
  assert.match(r.actions.find((a) => a.name === 'STL | Inbound Leads').warning, /missing stages/);
  assert.equal(t.fake.calls.filter((c) => c.method === 'PUT').length, 0);
});

async function builtWithUi(client) {
  const t = setup({ client });
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  t.fake.state.workflows = t.resolved.workflows.map((w, i) => ({ id: `wf_${i}`, name: w.name, status: 'draft', version: 1 }));
  t.fake.state.forms = t.resolved.forms.map((f, i) => ({ id: `form_${i}`, name: f.name }));
  return t;
}

test('verify: a complete template build passes; smart lists and copy approval are MANUAL', async () => {
  const t = await builtWithUi(larry());
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  assert.equal(r.summary.fail, 0, formatTable(r.rows.filter((x) => x.result === 'FAIL')));
  assert.equal(r.rows.filter((x) => x.area === 'smart lists' && x.result === 'MANUAL').length, 6);
  assert.ok(r.rows.some((x) => x.area === 'copy' && x.result === 'MANUAL'));
  assert.ok(r.rows.some((x) => x.area === 'fields' && x.check === 'contact: react_segment' && x.result === 'PASS'));
});

test('verify: a missing template workflow fails; a live customer-facing one is a WARN', async () => {
  const t = await builtWithUi(larry());
  t.fake.state.workflows = t.fake.state.workflows.filter((w) => w.name !== 'AFF | Reply Router');
  t.fake.state.workflows.find((w) => w.name === 'STL | Ad Lead - Instant Response').status = 'published';
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  const fails = r.rows.filter((x) => x.result === 'FAIL');
  assert.equal(fails.length, 1);
  assert.match(fails[0].check, /AFF \| Reply Router/);
  assert.equal(r.rows.find((x) => x.check.startsWith('STL | Ad Lead - Instant Response')).result, 'WARN');
});

test('verify: a template tag or custom value that is missing fails', async () => {
  const t = await builtWithUi(larry());
  t.fake.state.tags = t.fake.state.tags.filter((x) => x.name !== 'stl:replied');
  t.fake.state.customValues = t.fake.state.customValues.filter((v) => v.name !== 'sr_dana_phone');
  const r = await runVerify({ resolved: t.resolved, ghl: t.ghl });
  assert.match(r.rows.find((x) => x.area === 'tags').found, /stl:replied/);
  assert.equal(r.rows.find((x) => x.check === 'sr_dana_phone').result, 'FAIL');
});

test('checklist: every template workflow and smart list, with the client values filled in', () => {
  const r = resolve(def, larry());
  const md = renderChecklist(r, { generatedAt: 'TEST' });
  for (const w of r.workflows) assert.ok(md.includes(`### ${w.name}`), w.name);
  assert.ok(md.includes('REACT \\| 01 - Past Customers'), 'smart list names escaped in the table');
  assert.ok(md.includes('Particular users: builder@agency.example'));
  assert.ok(md.includes('Mon, Tue, Wed, Thu, Fri, 09:00 to 17:00, the account time zone (America/Denver)'));
  assert.ok(md.includes('aff:queue-realtor'));
  assert.ok(md.includes('{{contact.name}}'), 'GHL merge fields survive');
  assert.ok(!md.includes('${'), 'no ${...} left');
  assert.ok(!/<missing: tpl\./.test(md), 'missing inputs are named by their client.yaml path');
});

test('copy: every program rendered, DRAFT on top, merge fields kept, nothing unresolved', () => {
  const r = resolve(def, larry());
  const copy = renderCopy(r, { generatedAt: 'TEST' });
  assert.match(copy, /^# Message copy \(DRAFT\): Summit Ridge Roofing/);
  assert.match(copy, /The client approves every message below in writing/);
  for (const h of ['# Speed to lead (STL)', '# Reactivation (REACT)', '# Partner emails (AFF)', '# Partner outreach: Realtors', '# Partner outreach: General Contractors']) assert.ok(copy.includes(h), h);
  assert.ok(copy.includes('{{custom_values.sr_quick_app_url}}'));
  assert.ok(copy.includes('**Subject:** it\'s Dana'));
  assert.ok(copy.includes('{{contact.react_context}}'));
  assert.ok(!copy.includes('${'));
});

test('no source-client leakage: a non-source client gets none of its names, people, links or prefix', () => {
  const r = resolve(def, larry());
  const out = renderChecklist(r, { generatedAt: 'TEST' }) + renderCopy(r, { generatedAt: 'TEST' }) + JSON.stringify({ f: r.contactFields, t: r.tags, p: r.pipelines, v: r.customValues, w: r.workflows });
  const hit = out.match(LEAK);
  assert.equal(hit, null, hit && `found "${hit[0]}" near: ${out.slice(Math.max(0, hit.index - 80), hit.index + 80)}`);
  for (const dir of ['templates/larry', 'templates/larry/copy']) {
    for (const f of fs.readdirSync(path.join(REPO, dir)).filter((x) => /\.(json|md)$/.test(x) && x !== 'README.md')) {
      const text = fs.readFileSync(path.join(REPO, dir, f), 'utf8');
      assert.equal(text.match(LEAK), null, `${dir}/${f}`);
    }
  }
});

test('parity: with the source build\'s inputs the template gives the live names (Oct 17 read)', () => {
  const r = resolve(def, sourceClient());
  // Fields: the stl_ and react_ fields match the live account exactly (name, type, options).
  const live = LIVE.contactFields.filter((f) => /^(stl_|react_)/.test(f.name));
  for (const f of live) {
    const mine = r.contactFields.find((x) => x.name === f.name);
    assert.ok(mine, f.name);
    assert.equal(mine.dataType, f.dataType, f.name);
    if (f.options) assert.deepEqual(mine.options, f.options, f.name);
  }
  // Tags: every template tag exists live; the live ones the template leaves out are the documented ones.
  const mineTags = r.tags.filter((t) => /^(src:|stl:|react:|aff:)/.test(t.name)).map((t) => t.name);
  for (const t of mineTags) assert.ok(LIVE.tags.includes(t), `template tag ${t} is live`);
  assert.deepEqual(LIVE.tags.filter((t) => !mineTags.includes(t)).sort(), ['aff:broker-business-loan', 'aff:broker-cre', 'aff:broker-mortgage', 'aff:has-list', 'aff:tier-1-referral', 'aff:tier-2-broker', 'src:import-2026-09']);
  // Custom values: every template value exists live; cb_what_changed and cb_partner_comp_line are left out.
  const cv = r.customValues.map((v) => v.name).filter((n) => n.startsWith('cb_'));
  for (const n of cv) assert.ok(LIVE.customValues.includes(n), n);
  assert.deepEqual(LIVE.customValues.filter((n) => !cv.includes(n)).sort(), ['cb_partner_comp_line', 'cb_what_changed']);
  // Workflows: same set, with plain hyphens and "Ad Lead" for "FB Lead"; two live AFF workflows become additions to the standard ones.
  const norm = (n) => n.replace(/ – /g, ' - ').replace('FB Lead', 'Ad Lead');
  const liveNames = LIVE.workflows.map((w) => norm(w.name)).filter((n) => !['AFF | Partner - Signed Up', 'AFF | Referral Received'].includes(n)).sort();
  assert.deepEqual(r.workflows.filter((w) => w.program).map((w) => w.name).sort(), liveNames);
  // Pipelines: the client's own pipeline is used, so STL | Inbound Leads is not built; its stages match live when it is.
  assert.ok(!r.pipelines.some((p) => p.name === 'STL | Inbound Leads'));
  const stl = resolve(def, { ...sourceClient(), template: { ...sourceClient().template, stl: {} } }).pipelines.find((p) => p.name === 'STL | Inbound Leads');
  assert.deepEqual(stl.stages, LIVE.pipelines.find((p) => p.name === 'STL | Inbound Leads').stages);
  const shell = resolve(def, { ...sourceClient(), template: { ...sourceClient().template, aff_email: { broker_intake_shell: true } } }).pipelines.find((p) => p.name === 'AFF | Broker Intake');
  assert.deepEqual(shell.stages, LIVE.pipelines.find((p) => p.name === 'AFF | Broker Intake').stages);
});

test('preflight: template inputs are checked only when the template is on', () => {
  const off = checkInputs(exampleClient());
  assert.ok(!off.some((r) => r.path.startsWith('template.')));
  const c = larry({ value_prefix: 'Bad Prefix', sender_name: '' });
  const rows = checkInputs(c);
  const block = blocking(rows, false).map((r) => r.path);
  assert.ok(block.includes('template.value_prefix'));
  assert.ok(block.includes('template.sender_name'));
  assert.equal(rows.find((r) => r.path === 'template.copy.approved').stage, 'go-live');
  assert.ok(blocking(checkInputs(exampleClient({ template: { name: 'nope' } })), false).some((r) => r.path === 'template.name'));
  const bad = larry({ react: { segments: [{ num: '01', name: 'X', sequence: 'whats-changed' }] }, aff_email: { outreach: [{ key: 'x', name: 'X', audience: 'x', copy: 'cold' }] } });
  const badBlock = blocking(checkInputs(bad), false).map((r) => r.path);
  assert.ok(badBlock.includes('template.react.segments'));
  assert.ok(badBlock.includes('template.aff_email.outreach'));
});

test('every template object traces to a section that exists in spec/', () => {
  const dir = path.join(REPO, 'templates', 'larry');
  const refs = [];
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (typeof v.spec === 'string') refs.push(v.spec); Object.values(v).forEach(walk); } };
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) walk(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  assert.ok(refs.length > 40, `found ${refs.length}`);
  for (const ref of new Set(refs)) {
    const [file, section] = ref.split(' ');
    const text = fs.readFileSync(path.join(REPO, 'spec', `${file}.md`), 'utf8');
    assert.ok(new RegExp(`^#{2,3} ${section}\\b`, 'm').test(text), `spec/${file}.md has "${section}"`);
  }
});

test('cli: checklist writes the copy file next to the checklist when the template is on', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghl-build-tpl-'));
  const text = fs.readFileSync(EXAMPLE, 'utf8').replace('location_id: ""', 'location_id: "loc_test"').replace('  name: ""                                   # [build] "" | larry', '  name: larry');
  fs.writeFileSync(path.join(dir, 'client.yaml'), text);
  const out = [];
  assert.equal(await main(['checklist'], { cwd: dir, env: {}, stdout: (s) => out.push(s), stderr: (s) => out.push(s) }), 0, out.join('\n'));
  const copy = fs.readFileSync(path.join(dir, 'out', 'template-copy.md'), 'utf8');
  assert.match(copy, /DRAFT/);
  assert.match(fs.readFileSync(path.join(dir, 'out', 'ui-checklist.md'), 'utf8'), /STL \| Ad Lead - Instant Response/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('cli: preflight --live and build --live twice with the template, against the fake', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghl-build-tpl-'));
  const text = fs.readFileSync(EXAMPLE, 'utf8').replace('location_id: ""', 'location_id: "loc_test"').replace('  name: ""                                   # [build] "" | larry', '  name: larry');
  fs.writeFileSync(path.join(dir, 'client.yaml'), text);
  fs.writeFileSync(path.join(dir, '.env'), 'GHL_TOKEN=test-secret-value-456\n');
  const { createFakeGhl } = require('./helpers/fake-ghl.js');
  const fake = createFakeGhl({ locationId: 'loc_test', users: [{ email: 'builder@agency.example' }] });
  const out = [];
  const opts = { cwd: dir, env: {}, fetchImpl: fake.fetch, sleep: async () => {}, stdout: (s) => out.push(s), stderr: (s) => out.push(s) };
  assert.equal(await main(['preflight', '--live'], opts), 0, out.join('\n'));
  assert.equal(await main(['build', '--live'], opts), 0, out.join('\n'));
  const first = writes(fake.calls).length;
  assert.ok(fake.state.fields.some((f) => f.name === 'react_context'));
  assert.equal(await main(['build', '--live'], opts), 0);
  assert.equal(writes(fake.calls).length, first, 'second build writes nothing');
  for (const f of fs.readdirSync(path.join(dir, 'out'))) assert.ok(!fs.readFileSync(path.join(dir, 'out', f), 'utf8').includes('test-secret-value-456'), f);
  fs.rmSync(dir, { recursive: true, force: true });
});
