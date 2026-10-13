// An in-memory stand-in for GHL's API, used as the fetch implementation in tests.
// It records every call and reproduces the traps we hit for real:
//   - no browser User-Agent -> 403 "error code: 1010" (Cloudflare)
//   - locationId in a pipeline PUT body -> 422 "property locationId should not exist"
//   - a calendar PUT without slotDuration resets slotDuration to 30
//   - GET customFields returns only custom fields
//   - no workflow create endpoint (404)
'use strict';
const { BASE_URL } = require('../../lib/http.js');

function createFakeGhl({ locationId = 'loc_test', users = [], location = {} } = {}) {
  let seq = 0;
  const id = (p) => `${p}_${++seq}`;
  const state = {
    location: { id: locationId, name: 'Summit Ridge Roofing (TEST)', timezone: 'America/Denver', ...location },
    users: users.map((u) => ({ id: u.id || id('user'), ...u })),
    fields: [], // { id, name, dataType, model, fieldKey, picklistOptions }
    tags: [],
    pipelines: [],
    calendars: [],
    customValues: [],
    workflows: [],
    forms: [],
    rateLimitNext: 0,
  };
  const calls = [];

  const res = (status, body, headers = {}) => ({
    status,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });

  async function fetch(url, init = {}) {
    const u = new URL(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const call = { method, path: u.pathname, query: Object.fromEntries(u.searchParams), headers: init.headers || {}, body };
    calls.push(call);
    if (!url.startsWith(BASE_URL)) return res(404, { message: 'wrong host' });
    const h = call.headers;
    if (!/Mozilla\//.test(h['User-Agent'] || '')) return res(403, 'error code: 1010');
    if (!/^Bearer .+/.test(h.Authorization || '')) return res(401, { message: 'Invalid JWT' });
    if (h.Version !== '2021-07-28') return res(400, { message: 'Version header missing' });
    if (state.rateLimitNext > 0) { state.rateLimitNext--; return res(429, { message: 'Too many requests' }, { 'retry-after': '1' }); }

    const p = u.pathname;
    const L = `/locations/${locationId}`;
    const m = (re) => p.match(re);

    if (method === 'GET' && p === L) return res(200, { location: state.location });
    if (method === 'GET' && p === '/users/') return res(200, { users: state.users });

    if (p === `${L}/customFields`) {
      if (method === 'GET') return res(200, { customFields: state.fields.filter((f) => f.model === call.query.model) });
      if (method === 'POST') {
        const f = { id: id('cf'), name: body.name, dataType: body.dataType, model: body.model, fieldKey: `${body.model}.${body.name.toLowerCase().replace(/\W+/g, '_')}`, picklistOptions: body.options || [] };
        state.fields.push(f);
        return res(201, { customField: f });
      }
    }
    if (p === `${L}/tags`) {
      if (method === 'GET') return res(200, { tags: state.tags });
      if (method === 'POST') { const t = { id: id('tag'), name: body.name.toLowerCase() }; state.tags.push(t); return res(201, { tag: t }); }
    }
    if (p === '/opportunities/pipelines') {
      if (method === 'GET') return res(200, { pipelines: state.pipelines });
      if (method === 'POST') {
        const pl = { id: id('pipe'), name: body.name, stages: body.stages.map((s) => ({ id: id('stage'), name: s.name, position: s.position })) };
        state.pipelines.push(pl);
        return res(201, { pipeline: pl });
      }
    }
    if (method === 'PUT' && m(/^\/opportunities\/pipelines\/([^/]+)$/)) {
      if (body && 'locationId' in body) return res(422, { message: ['property locationId should not exist'] });
      if (call.query.locationId !== locationId) return res(400, { message: 'locationId query required' });
      const pl = state.pipelines.find((x) => x.id === m(/^\/opportunities\/pipelines\/([^/]+)$/)[1]);
      if (!pl) return res(404, { message: 'not found' });
      pl.name = body.name;
      pl.stages = body.stages.map((s) => ({ id: s.id || id('stage'), name: s.name, position: s.position }));
      return res(200, { pipeline: pl });
    }
    if (p === '/calendars/') {
      if (method === 'GET') return res(200, { calendars: state.calendars });
      if (method === 'POST') { const c = { id: id('cal'), ...body }; state.calendars.push(c); return res(201, { calendar: c }); }
    }
    const cm = m(/^\/calendars\/([^/]+)$/);
    if (cm) {
      const c = state.calendars.find((x) => x.id === cm[1]);
      if (!c) return res(404, { message: 'not found' });
      if (method === 'GET') return res(200, { calendar: c });
      if (method === 'PUT') {
        Object.assign(c, body);
        if (body.slotDuration === undefined) c.slotDuration = 30; // the real trap (Oct 8)
        return res(200, { calendar: c });
      }
    }
    if (p === `${L}/customValues`) {
      if (method === 'GET') return res(200, { customValues: state.customValues });
      if (method === 'POST') {
        if (!body.value) return res(422, { message: 'value should not be empty' });
        const v = { id: id('cv'), name: body.name, value: body.value, fieldKey: `{{ custom_values.${body.name.toLowerCase().replace(/\W+/g, '_')} }}` };
        state.customValues.push(v);
        return res(201, { customValue: v });
      }
    }
    const vm = m(new RegExp(`^${L}/customValues/([^/]+)$`));
    if (vm && method === 'PUT') {
      const v = state.customValues.find((x) => x.id === vm[1]);
      if (!v) return res(404, {});
      Object.assign(v, { name: body.name, value: body.value });
      return res(200, { customValue: v });
    }
    if (method === 'GET' && p === '/workflows/') return res(200, { workflows: state.workflows });
    if (method === 'GET' && p === '/forms/') return res(200, { forms: state.forms });
    return res(404, { message: `Cannot ${method} ${p}` });
  }

  return { fetch, state, calls };
}

module.exports = { createFakeGhl };
