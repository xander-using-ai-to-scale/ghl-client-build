'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseYaml } = require('../lib/yaml.js');
const { main } = require('../lib/cli.js');
const { EXAMPLE } = require('./helpers/setup.js');
const { createFakeGhl } = require('./helpers/fake-ghl.js');

test('yaml: the example client parses', () => {
  const c = parseYaml(fs.readFileSync(EXAMPLE, 'utf8'));
  assert.equal(c.client.name, 'Summit Ridge Roofing');
  assert.equal(c.calendar.duration_minutes, 20);
  assert.deepEqual(c.calendar.hours[0].days, ['mon', 'tue', 'wed', 'thu', 'fri']);
  assert.equal(c.calendar.hours[0].open, '10:00');
  assert.equal(c.ghl.location_id, '');
  assert.equal(c.instantly.enabled, false);
  assert.deepEqual(c.customize.remove.fields, []);
});

test('yaml: lists of maps, quotes, comments, numbers, blocks', () => {
  const y = parseYaml([
    'a: 1',
    'b: "x # not a comment"   # a comment',
    "c: 'it''s'",
    'd:',
    '  - name: one',
    '    n: 1.5',
    '  - plain',
    'e: [x, "y, z", 3]',
    'f: |',
    '  line one',
    '  line two',
    'g: https://example.com/a:b',
    'h: ~',
  ].join('\n'));
  assert.deepEqual(y, { a: 1, b: 'x # not a comment', c: "it's", d: [{ name: 'one', n: 1.5 }, 'plain'], e: ['x', 'y, z', 3], f: 'line one\nline two', g: 'https://example.com/a:b', h: null });
});

test('yaml: tabs, duplicate keys and nested flow are refused with a line number', () => {
  assert.throws(() => parseYaml('a:\n\tb: 1'), /line 2.*tabs/);
  assert.throws(() => parseYaml('a: 1\na: 2'), /line 2.*twice/);
  assert.throws(() => parseYaml('a: [[1]]'), /line 1/);
});

function clientDir(extra = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghl-build-cli-'));
  let text = fs.readFileSync(EXAMPLE, 'utf8').replace('location_id: ""', 'location_id: "loc_test"');
  fs.writeFileSync(path.join(dir, 'client.yaml'), text + extra);
  return dir;
}

test('cli: build without --live makes no network call and writes a run log', async () => {
  const dir = clientDir();
  let calls = 0;
  const out = [];
  const code = await main(['build'], { cwd: dir, env: {}, fetchImpl: () => { calls++; throw new Error('network'); }, stdout: (s) => out.push(s), stderr: (s) => out.push(s) });
  assert.equal(code, 0, out.join('\n'));
  assert.equal(calls, 0);
  const logs = fs.readdirSync(path.join(dir, 'out')).filter((f) => f.endsWith('-build.json'));
  assert.equal(logs.length, 1);
  const log = JSON.parse(fs.readFileSync(path.join(dir, 'out', logs[0]), 'utf8'));
  assert.equal(log.mode, 'dry');
  assert.equal(log.requests, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('cli: preflight, build --live twice, verify --live against the fake; the token never reaches a file', async () => {
  const dir = clientDir();
  fs.writeFileSync(path.join(dir, '.env'), 'GHL_TOKEN=test-secret-value-123\n');
  const fake = createFakeGhl({ locationId: 'loc_test', users: [{ email: 'builder@agency.example' }] });
  const quiet = { cwd: dir, env: {}, fetchImpl: fake.fetch, sleep: async () => {}, stdout: () => {}, stderr: () => {} };
  assert.equal(await main(['preflight', '--live'], quiet), 0);
  assert.equal(await main(['build', '--live'], quiet), 0);
  const writesAfterFirst = fake.calls.filter((c) => c.method !== 'GET').length;
  assert.ok(writesAfterFirst > 70);
  assert.equal(await main(['build', '--live'], quiet), 0);
  assert.equal(fake.calls.filter((c) => c.method !== 'GET').length, writesAfterFirst, 'second build writes nothing');
  assert.equal(await main(['verify', '--live'], quiet), 1, 'workflows and forms are not built yet, so verify fails');
  for (const f of fs.readdirSync(path.join(dir, 'out'))) {
    assert.ok(!fs.readFileSync(path.join(dir, 'out', f), 'utf8').includes('test-secret-value-123'), `${f} has no token`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('cli: build --live refuses when client.yaml blocks the build', async () => {
  const dir = clientDir();
  const file = path.join(dir, 'client.yaml');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('slug: summit-ridge-partner-intro-call', 'slug: ""'));
  const err = [];
  const code = await main(['build', '--live'], { cwd: dir, env: { GHL_TOKEN: 'x' }, fetchImpl: () => { throw new Error('no'); }, stdout: () => {}, stderr: (s) => err.push(s) });
  assert.equal(code, 1);
  assert.match(err.join('\n'), /calendar\.slug/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('cli: a non-GHL client stops after the checklist', async () => {
  const dir = clientDir();
  const file = path.join(dir, 'client.yaml');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('platform: ghl', 'platform: other'));
  const quiet = { cwd: dir, env: {}, stdout: () => {}, stderr: () => {} };
  assert.equal(await main(['checklist'], quiet), 0);
  assert.equal(await main(['build'], quiet), 1);
  assert.ok(fs.existsSync(path.join(dir, 'out', 'ui-checklist.md')));
  fs.rmSync(dir, { recursive: true, force: true });
});
