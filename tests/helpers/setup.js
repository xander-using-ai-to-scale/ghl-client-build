// Shared test setup: the example client made complete, a fake GHL, and a resolved build.
'use strict';
const fs = require('fs');
const path = require('path');
const { parseYaml } = require('../../lib/yaml.js');
const { loadDefinition, resolve } = require('../../lib/config.js');
const { createHttp } = require('../../lib/http.js');
const { createGhl } = require('../../lib/ghl.js');
const { createFakeGhl } = require('./fake-ghl.js');

const REPO = path.resolve(__dirname, '..', '..');
const EXAMPLE = path.join(REPO, 'client.example.yaml');
const BUILDER = 'builder@agency.example';

function exampleClient(overrides = {}) {
  const c = parseYaml(fs.readFileSync(EXAMPLE, 'utf8'));
  c.ghl.location_id = 'loc_test';
  return deepMerge(c, overrides);
}

function deepMerge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], v);
    else a[k] = v;
  }
  return a;
}

function setup({ client = exampleClient(), live = true, users = [{ email: BUILDER, name: 'Builder' }] } = {}) {
  const fake = createFakeGhl({ locationId: client.ghl.location_id, users });
  let fetchCount = 0;
  const fetchImpl = (...args) => { fetchCount++; return fake.fetch(...args); };
  const http = createHttp({ token: 'test-token-not-real', live, fetchImpl, sleep: async () => {} });
  const ghl = createGhl(http, client.ghl.location_id);
  const resolved = resolve(loadDefinition(), client);
  return { fake, http, ghl, resolved, client, get fetchCount() { return fetchCount; } };
}

module.exports = { setup, exampleClient, REPO, EXAMPLE, BUILDER };
