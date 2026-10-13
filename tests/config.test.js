'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadDefinition, resolve, evalWhen, toOpenHours } = require('../lib/config.js');
const { exampleClient, REPO } = require('./helpers/setup.js');

const def = loadDefinition();

test('templates fill from client.yaml; GHL merge fields are left alone', () => {
  const r = resolve(def, exampleClient());
  const pt = r.contactFields.find((f) => f.name === 'Partner Type');
  assert.deepEqual(pt.options, exampleClient().program.partner_types);
  assert.equal(r.calendar.slotDuration, 20);
  assert.equal(r.calendar.eventTitle, 'Partner Intro Call - {{contact.name}}');
  const signup = r.workflows.find((w) => w.key === 'partner_signup');
  assert.ok(signup.steps.some((s) => /Revenue Share Percent -> 10/.test(s)));
  assert.ok(signup.steps.some((s) => /\{\{contact\.id\}\}/.test(s)));
});

test('segment tags come from program.segments', () => {
  const r = resolve(def, exampleClient());
  assert.ok(r.tags.some((t) => t.name === 'segment/realtor'));
  assert.ok(r.tags.some((t) => t.name === 'segment/general-contractor'));
  assert.ok(!r.tags.some((t) => /\$\{/.test(t.name)));
});

test('when: Instantly off drops its field and workflow; on brings them back', () => {
  const off = resolve(def, exampleClient());
  assert.ok(!off.contactFields.some((f) => f.name === 'Instantly Campaign'));
  assert.ok(!off.workflows.some((w) => w.key === 'instantly_reply'));
  const on = resolve(def, exampleClient({ instantly: { enabled: true } }));
  assert.ok(on.contactFields.some((f) => f.name === 'Instantly Campaign'));
  assert.ok(on.workflows.some((w) => w.key === 'instantly_reply'));
});

test('commission mode picks the right Commission 3 workflow', () => {
  const monthly = resolve(def, exampleClient());
  assert.ok(monthly.workflows.some((w) => w.key === 'commission_paid'));
  assert.ok(!monthly.workflows.some((w) => w.key === 'commission_paid_once'));
  const once = resolve(def, exampleClient({ program: { commission_mode: 'one_time' } }));
  assert.ok(once.workflows.some((w) => w.key === 'commission_paid_once'));
  assert.ok(!once.workflows.some((w) => w.key === 'commission_paid'));
});

test('Affiliate Manager off drops its workflow, steps and checklist section', () => {
  const r = resolve(def, exampleClient({ affiliate_manager: { enabled: false } }));
  assert.ok(!r.workflows.some((w) => w.key === 'affiliate_link'));
  assert.ok(!r.uiSections.some((s) => s.key === 'affiliate_manager'));
  const signup = r.workflows.find((w) => w.key === 'partner_signup');
  assert.ok(!signup.steps.some((s) => /affiliate/i.test(typeof s === 'string' ? s : s.text) && /Add to affiliate/.test(typeof s === 'string' ? s : s.text)));
});

test('naming prefix lands on pipelines, calendar, forms and workflows, not on fields or tags', () => {
  const r = resolve(def, exampleClient({ naming: { prefix: 'RPE | ' } }));
  assert.ok(r.pipelines.every((p) => p.name.startsWith('RPE | ')));
  assert.equal(r.calendar.name, 'RPE | Partner Intro Call');
  assert.ok(r.forms.every((f) => f.name.startsWith('RPE | ')));
  assert.ok(r.workflows.every((w) => w.name.startsWith('RPE | ')));
  assert.ok(r.contactFields.every((f) => !f.name.startsWith('RPE')));
});

test('an empty prefix is not reported as missing', () => {
  const r = resolve(def, exampleClient());
  assert.ok(![...r.missing].some((m) => m.includes('prefix')));
  assert.ok([...r.missing].includes('domain.partner_domain'));
});

test('customize: remove and add', () => {
  const r = resolve(def, exampleClient({
    customize: {
      remove: { fields: ['Partnership Type'], tags: ['source/linkedin-outflo'], pipelines: ['recruiting'], workflows: [], forms: [] },
      add: { contact_fields: [{ name: 'Roof Type', dataType: 'SINGLE_OPTIONS', options: ['Shingle', 'Metal'] }], opportunity_fields: [], tags: ['segment/hoa'], pipelines: [{ name: 'Referred Jobs', stages: ['Referral Received', 'Quoted', 'Won'] }] },
    },
  }));
  assert.ok(!r.contactFields.some((f) => f.name === 'Partnership Type'));
  assert.ok(r.contactFields.some((f) => f.name === 'Roof Type' && f.options.length === 2));
  assert.ok(!r.tags.some((t) => t.name === 'source/linkedin-outflo'));
  assert.ok(r.tags.some((t) => t.name === 'segment/hoa'));
  assert.ok(!r.pipelines.some((p) => p.key === 'recruiting'));
  assert.ok(r.pipelines.some((p) => p.name === 'Referred Jobs'));
});

test('evalWhen', () => {
  const ctx = { a: { on: true, off: false, mode: 'one_time' } };
  assert.equal(evalWhen('a.on', ctx), true);
  assert.equal(evalWhen('a.off', ctx), false);
  assert.equal(evalWhen('!a.off', ctx), true);
  assert.equal(evalWhen('a.mode == one_time', ctx), true);
  assert.equal(evalWhen('a.mode != one_time', ctx), false);
  assert.equal(evalWhen(undefined, ctx), true);
});

test('calendar hours become GHL openHours, one entry per day', () => {
  const oh = toOpenHours([{ days: ['mon', 'wed'], open: '09:30', close: '12:00' }, { days: ['mon'], open: '13:00', close: '17:00' }]);
  assert.deepEqual(oh.map((o) => o.daysOfTheWeek[0]), [1, 3]);
  assert.equal(oh[0].hours.length, 2);
  assert.deepEqual(oh[0].hours[0], { openHour: 9, openMinute: 30, closeHour: 12, closeMinute: 0 });
});

test('every config object traces to a section that exists in spec/', () => {
  const specDir = path.join(REPO, 'spec');
  const refs = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') { if (typeof v.spec === 'string') refs.push(v.spec); Object.values(v).forEach(walk); }
  };
  walk(def);
  assert.ok(refs.length > 60, `found ${refs.length} spec references`);
  for (const ref of new Set(refs)) {
    const [file, section] = ref.split(' ');
    const p = path.join(specDir, `${file}.md`);
    assert.ok(fs.existsSync(p), `spec/${file}.md exists (for "${ref}")`);
    const text = fs.readFileSync(p, 'utf8');
    assert.ok(new RegExp(`^#{2,3} ${section.replace('§', '§')}\\b`, 'm').test(text), `spec/${file}.md has a heading "${section}" (for "${ref}")`);
  }
});

test('every object the build manages has a spec reference', () => {
  for (const f of [...def.fields.contact, ...def.fields.opportunity]) assert.ok(f.spec, `field ${f.name}`);
  for (const t of def.tags.tags) assert.ok(t.spec, `tag ${t.name}`);
  for (const p of def.pipelines.pipelines) assert.ok(p.spec, `pipeline ${p.key}`);
  assert.ok(def.calendar.calendar.spec);
  for (const v of def['custom-values'].customValues) assert.ok(v.spec, `custom value ${v.name}`);
  for (const f of def.forms.forms) assert.ok(f.spec, `form ${f.key}`);
  for (const w of def.workflows.workflows) assert.ok(w.spec, `workflow ${w.key}`);
  for (const s of def['ui-steps'].sections) assert.ok(s.spec, `ui section ${s.key}`);
});

test('a token in client.yaml is refused', () => {
  const { loadClientFile } = require('../lib/config.js');
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghl-build-'));
  const file = path.join(dir, 'client.yaml');
  fs.writeFileSync(file, 'client:\n  name: X\nghl:\n  token: pit-1234abcd-0000-1111-2222-333344445555\n');
  assert.throws(() => loadClientFile(file), /looks like a GHL token/);
  fs.rmSync(dir, { recursive: true, force: true });
});
