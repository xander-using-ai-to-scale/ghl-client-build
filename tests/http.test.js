'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHttp, NetworkDisabledError, hintFor, USER_AGENT } = require('../lib/http.js');
const { createGhl } = require('../lib/ghl.js');

function recorder(responses) {
  const calls = [];
  const queue = responses.slice();
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const r = queue.length ? queue.shift() : { status: 200, body: {} };
    return { status: r.status, headers: { get: (k) => (r.headers || {})[k.toLowerCase()] ?? null }, text: async () => JSON.stringify(r.body ?? {}) };
  };
  return { calls, fetchImpl };
}

test('headers: token, Version 2021-07-28 and a browser User-Agent on every method', async () => {
  const rec = recorder([]);
  const http = createHttp({ token: 'tok', live: true, fetchImpl: rec.fetchImpl });
  await http.get('/x');
  await http.post('/x', { a: 1 });
  await http.put('/x', { a: 1 });
  assert.equal(rec.calls.length, 3);
  for (const c of rec.calls) {
    assert.equal(c.init.headers.Authorization, 'Bearer tok');
    assert.equal(c.init.headers.Version, '2021-07-28');
    assert.equal(c.init.headers['User-Agent'], USER_AGENT);
    assert.match(c.init.headers['User-Agent'], /Mozilla\/5\.0 .*Chrome/);
  }
});

test('not live: no fetch at all, a clear error instead', async () => {
  const rec = recorder([]);
  const http = createHttp({ token: 'tok', live: false, fetchImpl: rec.fetchImpl });
  await assert.rejects(() => http.get('/x'), NetworkDisabledError);
  assert.equal(rec.calls.length, 0);
  assert.equal(http.requestCount, 0);
});

test('429 is retried politely, honouring Retry-After', async () => {
  const rec = recorder([{ status: 429, headers: { 'retry-after': '2' } }, { status: 429 }, { status: 200, body: { ok: 1 } }]);
  const waits = [];
  const http = createHttp({ token: 'tok', live: true, fetchImpl: rec.fetchImpl, sleep: async (ms) => { waits.push(ms); } });
  const r = await http.get('/x');
  assert.equal(r.ok, true);
  assert.equal(rec.calls.length, 3);
  assert.deepEqual(waits, [2000, 2000]); // Retry-After 2s, then backoff 2s on the second attempt
});

test('429 gives up after the retry limit and reports it', async () => {
  const rec = recorder(Array(10).fill({ status: 429 }));
  const http = createHttp({ token: 'tok', live: true, fetchImpl: rec.fetchImpl, sleep: async () => {}, maxRetries: 2 });
  const r = await http.get('/x');
  assert.equal(r.status, 429);
  assert.equal(rec.calls.length, 3);
});

test('no token when live: refuses before any request', async () => {
  const rec = recorder([]);
  const http = createHttp({ token: '', live: true, fetchImpl: rec.fetchImpl });
  await assert.rejects(() => http.get('/x'), /No GHL token/);
  assert.equal(rec.calls.length, 0);
});

test('hints explain the traps in plain words', () => {
  assert.match(hintFor(403, 'error code: 1010'), /User-Agent/);
  assert.match(hintFor(401, { message: 'user type mismatch' }), /SUB-ACCOUNT/);
  assert.match(hintFor(422, { message: ['property locationId should not exist'] }), /query string/);
  assert.match(hintFor(401, { statusCode: 401, message: 'The token is not authorized for this scope.' }), /lacks a scope/);
  assert.match(hintFor(401, { message: 'Invalid JWT' }), /Token rejected/);
});

test('pipeline PUT: locationId in the query string, stripped from the body', async () => {
  const rec = recorder([]);
  const ghl = createGhl(createHttp({ token: 'tok', live: true, fetchImpl: rec.fetchImpl }), 'loc_1');
  await ghl.updatePipeline('pipe_1', { locationId: 'loc_1', id: 'pipe_1', name: 'P', stages: [] });
  const url = new URL(rec.calls[0].url);
  assert.equal(rec.calls[0].init.method, 'PUT');
  assert.equal(url.pathname, '/opportunities/pipelines/pipe_1');
  assert.equal(url.searchParams.get('locationId'), 'loc_1');
  const body = JSON.parse(rec.calls[0].init.body);
  assert.ok(!('locationId' in body));
  assert.ok(!('id' in body));
});

test('the GHL layer has no delete method', () => {
  const ghl = createGhl(createHttp({ live: false }), 'loc_1');
  assert.deepEqual(Object.keys(ghl).filter((k) => /delete|remove/i.test(k)), []);
});
