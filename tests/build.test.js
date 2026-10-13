'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, exampleClient } = require('./helpers/setup.js');
const { runBuild } = require('../lib/build.js');

const writes = (calls) => calls.filter((c) => c.method !== 'GET');

test('first live build creates everything the config manages', async () => {
  const t = setup();
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const r1 = t.resolved;
  const expected = r1.contactFields.length + r1.opportunityFields.length + r1.tags.length + r1.pipelines.length + 1 + r1.customValues.length;
  assert.equal(r.summary.failed, 0, JSON.stringify(r.actions.filter((a) => a.action === 'failed'), null, 2));
  assert.equal(r.summary.created, expected);
  assert.equal(t.fake.state.pipelines.length, 3);
  assert.equal(t.fake.state.calendars.length, 1);
  assert.equal(t.fake.state.customValues.length, 5);
});

test('idempotent: a second build creates nothing and writes nothing', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const before = t.fake.calls.length;
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  assert.equal(r.summary.created, 0);
  assert.equal(r.summary.failed, 0);
  assert.equal(writes(t.fake.calls.slice(before)).length, 0, 'second run must only read');
});

test('dry run makes zero network calls', async () => {
  const t = setup({ live: false });
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'dry' });
  assert.equal(t.fetchCount, 0);
  assert.equal(t.http.requestCount, 0);
  assert.ok(r.summary.planned > 70, `planned ${r.summary.planned}`);
});

test('an HTTP client that is not live refuses every call, even if asked', async () => {
  const t = setup({ live: false });
  await assert.rejects(() => t.ghl.listTags(), /Dry run: no network call/);
  assert.equal(t.fetchCount, 0);
});

test('--check reads the account and writes nothing', async () => {
  const t = setup();
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'check' });
  assert.equal(writes(t.fake.calls).length, 0);
  assert.ok(r.summary.planned > 70);
});

test('the build never sends a DELETE', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live', repair: true });
  assert.equal(t.fake.calls.filter((c) => c.method === 'DELETE').length, 0);
});

test('every call carries the token, Version and a browser User-Agent', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  assert.ok(t.fake.calls.length > 10);
  for (const c of t.fake.calls) {
    assert.match(c.headers['User-Agent'], /^Mozilla\/5\.0/);
    assert.equal(c.headers.Version, '2021-07-28');
    assert.equal(c.headers.Authorization, 'Bearer test-token-not-real');
  }
});

test('repair appends a missing stage with locationId in the query, not the body', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const referred = t.fake.state.pipelines.find((p) => p.name === 'Referred Leads');
  referred.stages = referred.stages.filter((s) => s.name !== 'Attribution Review');
  const keptIds = referred.stages.map((s) => s.id);
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live', repair: true });
  const put = t.fake.calls.find((c) => c.method === 'PUT' && c.path.startsWith('/opportunities/pipelines/'));
  assert.ok(put, 'a pipeline PUT was sent');
  assert.equal(put.query.locationId, 'loc_test');
  assert.ok(!('locationId' in put.body), 'locationId must not be in the PUT body');
  assert.equal(r.actions.find((a) => a.kind === 'pipeline' && a.action === 'repaired').name, 'Referred Leads');
  const after = t.fake.state.pipelines.find((p) => p.name === 'Referred Leads');
  assert.equal(after.stages.at(-1).name, 'Attribution Review');
  assert.deepEqual(after.stages.slice(0, keptIds.length).map((s) => s.id), keptIds, 'existing stage ids are kept');
});

test('without --repair a pipeline missing a stage is reported, not changed', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const referred = t.fake.state.pipelines.find((p) => p.name === 'Referred Leads');
  referred.stages.pop();
  const before = t.fake.calls.length;
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  assert.equal(writes(t.fake.calls.slice(before)).length, 0);
  assert.match(r.actions.find((a) => a.name === 'Referred Leads').warning, /missing stages/);
});

test('calendar repair sends the full saved settings, so slotDuration survives an hours change', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const cal = t.fake.state.calendars[0];
  cal.customFieldTheClientSet = 'keep me';
  // Change only the hours in client.yaml.
  const client = exampleClient({ calendar: { hours: [{ days: ['tue', 'thu'], open: '14:00', close: '17:00' }] } });
  const t2 = { ...t, resolved: require('../lib/config.js').resolve(require('../lib/config.js').loadDefinition(), client) };
  const r = await runBuild({ resolved: t2.resolved, ghl: t.ghl, mode: 'live', repair: true });
  const put = t.fake.calls.find((c) => c.method === 'PUT' && c.path.startsWith('/calendars/'));
  assert.ok(put, 'a calendar PUT was sent');
  for (const k of ['slotDuration', 'slotDurationUnit', 'slotInterval', 'slotIntervalUnit', 'slotBuffer', 'slotBufferUnit', 'openHours']) {
    assert.ok(put.body[k] !== undefined, `PUT carries ${k}`);
  }
  assert.equal(put.body.slotDuration, 20);
  assert.equal(put.body.customFieldTheClientSet, 'keep me', 'settings we do not manage are sent back unchanged');
  assert.ok(!('id' in put.body) && !('locationId' in put.body));
  assert.equal(t.fake.state.calendars[0].slotDuration, 20, 'slotDuration not reset to 30');
  assert.deepEqual(t.fake.state.calendars[0].openHours.map((o) => o.daysOfTheWeek[0]), [2, 4]);
  const a = r.actions.find((x) => x.kind === 'calendar');
  assert.equal(a.action, 'repaired');
  assert.equal(a.warning, undefined);
  assert.equal(a.savedBefore.slotDuration, 20, 'the saved calendar is kept in the run log');
});

test('calendarUpdateBody refuses a partial update', () => {
  const { calendarUpdateBody } = require('../lib/ghl.js');
  assert.throws(() => calendarUpdateBody({ id: 'x', openHours: [] }, { openHours: [] }, ['openHours'], ['slotDuration', 'openHours']), /partial calendar update/);
});

test('calendar owner who is not a sub-account user: calendar is not created', async () => {
  const t = setup({ users: [{ email: 'someone.else@agency.example' }] });
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  assert.equal(t.fake.state.calendars.length, 0);
  assert.match(r.actions.find((a) => a.kind === 'calendar').error, /not a user of this sub-account/);
});

test('booking URL custom value is filled from the calendar id; blanks are a single space', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const cv = Object.fromEntries(t.fake.state.customValues.map((v) => [v.name, v.value]));
  assert.equal(cv['Partner Call Booking URL'], `https://api.leadconnectorhq.com/widget/booking/${t.fake.state.calendars[0].id}`);
  assert.equal(cv['Partner Page URL'], ' ');
  assert.equal(cv['Partner Commission Rate'], '10%');
});

test('repair fills a blank custom value once the client supplies it', async () => {
  const t = setup();
  await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const { resolve, loadDefinition } = require('../lib/config.js');
  const resolved = resolve(loadDefinition(), exampleClient({ domain: { partner_domain: 'partners.summitridgeroofing.example' } }));
  await runBuild({ resolved, ghl: t.ghl, mode: 'live', repair: true });
  const v = t.fake.state.customValues.find((x) => x.name === 'Partner Page URL');
  assert.equal(v.value, 'https://partners.summitridgeroofing.example/become-a-partner');
});

test('an existing field with another type is skipped with a warning, never changed', async () => {
  const t = setup();
  t.fake.state.fields.push({ id: 'cf_x', name: 'Lost Reason', dataType: 'TEXT', model: 'contact' });
  const r = await runBuild({ resolved: t.resolved, ghl: t.ghl, mode: 'live' });
  const a = r.actions.find((x) => x.name === 'contact: Lost Reason');
  assert.equal(a.action, 'exists');
  assert.match(a.warning, /it is TEXT/);
  assert.equal(t.fake.state.fields.filter((f) => f.name === 'Lost Reason').length, 1);
});

test('a failed read stops the build before any write', async () => {
  const t = setup();
  const origFetch = t.fake.fetch;
  const { createHttp } = require('../lib/http.js');
  const { createGhl } = require('../lib/ghl.js');
  const http = createHttp({ token: 't', live: true, sleep: async () => {}, fetchImpl: async (url, init) => (url.includes('/customFields') ? { status: 500, headers: { get: () => null }, text: async () => 'boom' } : origFetch(url, init)) });
  await assert.rejects(() => runBuild({ resolved: t.resolved, ghl: createGhl(http, 'loc_test'), mode: 'live' }), /Stopped before writing anything else/);
  assert.equal(writes(t.fake.calls).length, 0);
});
