'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkInputs, checkAccount, blocking } = require('../lib/preflight.js');
const { setup, exampleClient, BUILDER } = require('./helpers/setup.js');

test('the example client has nothing that blocks the build', () => {
  const rows = checkInputs(exampleClient());
  assert.deepEqual(blocking(rows, false).map((r) => r.path), []);
});

test('missing inputs are flagged with the stage they block', () => {
  const c = exampleClient();
  delete c.program.partner_types;
  c.calendar.slug = '';
  c.program.commission_mode = 'sometimes';
  c.ghl.location_id = '';
  const rows = checkInputs(c);
  const byPath = Object.fromEntries(rows.map((r) => [r.path, r]));
  assert.equal(byPath['program.partner_types'].status, 'missing');
  assert.equal(byPath['program.partner_types'].stage, 'build');
  assert.equal(byPath['calendar.slug'].status, 'missing');
  assert.equal(byPath['program.commission_mode'].status, 'invalid');
  assert.equal(byPath['ghl.location_id'].stage, 'live');
  assert.deepEqual(blocking(rows, false).map((r) => r.path).sort(), ['calendar.slug', 'program.commission_mode', 'program.partner_types']);
  assert.ok(blocking(rows, true).some((r) => r.path === 'ghl.location_id'), 'location id blocks a live run');
});

test('go-live gaps are listed but do not block the build', () => {
  const rows = checkInputs(exampleClient());
  const golive = rows.filter((r) => r.stage === 'go-live' && r.status !== 'ok').map((r) => r.path);
  assert.ok(golive.includes('domain.partner_domain'));
  assert.ok(golive.includes('calendar.video_link'));
  assert.equal(blocking(rows, true).filter((r) => r.stage === 'go-live').length, 0);
});

test('bad calendar hours are caught before the build', () => {
  const c = exampleClient({ calendar: { hours: [{ days: ['funday'], open: '10:00', close: '17:00' }] } });
  assert.ok(blocking(checkInputs(c), false).some((r) => r.path === 'calendar.hours'));
});

test('Instantly inputs are only asked for when Instantly is on', () => {
  assert.ok(!checkInputs(exampleClient()).some((r) => r.path.startsWith('instantly.')));
  assert.ok(checkInputs(exampleClient({ instantly: { enabled: true } })).some((r) => r.path === 'instantly.workspace_access'));
});

test('live preflight: a person who is not a sub-account user is flagged (agency-owner trap)', async () => {
  const client = exampleClient({ people: { alert_emails: [BUILDER, 'owner@summitridgeroofing.example'] } });
  const t = setup({ client });
  const rows = await checkAccount(t.ghl, client, t.resolved);
  const bad = rows.filter((r) => r.status === 'invalid');
  assert.equal(bad.length, 1);
  assert.match(bad[0].label, /owner@summitridgeroofing\.example/);
  assert.match(bad[0].note, /agency owner/);
  assert.equal(t.fake.calls.filter((c) => c.method !== 'GET').length, 0, 'preflight only reads');
});

test('live preflight: an existing field with another type is a warning', async () => {
  const t = setup();
  t.fake.state.fields.push({ id: 'x', name: 'Partner Type', dataType: 'TEXT', model: 'contact' });
  const rows = await checkAccount(t.ghl, t.client, t.resolved);
  assert.ok(rows.some((r) => r.status === 'warn' && /Partner Type/.test(r.label)));
});

test('live preflight: unreachable location stops the account checks', async () => {
  const t = setup();
  const wrong = require('../lib/ghl.js').createGhl(t.http, 'loc_wrong');
  const rows = await checkAccount(wrong, t.client, t.resolved);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'invalid');
});
