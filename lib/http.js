// The only place that talks to GoHighLevel. Every request carries the three headers GHL needs:
//   Authorization: Bearer <Private Integration token>
//   Version: 2021-07-28
//   User-Agent: a browser string. Without it Cloudflare answers 403 "error code: 1010",
//               which looks exactly like an auth failure and is not one (trap T1).
// A 429 is retried politely (Retry-After if GHL sends one, else 1s, 2s, 4s, 8s).
// When live is false there is no network at all: any call throws NetworkDisabledError.
'use strict';

const BASE_URL = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

class NetworkDisabledError extends Error {
  constructor(what) {
    super(`Dry run: no network call is made (${what}). Add --live to read or write GHL.`);
    this.name = 'NetworkDisabledError';
  }
}

function queryString(query) {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

// A plain-words hint for the errors that cost us real time.
function hintFor(status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body || '');
  if (status === 403 && /1010/.test(text)) return 'Cloudflare 1010: the request had no browser User-Agent. This is not an auth problem.';
  if (/user type mismatch/i.test(text)) return 'Agency-level token. Use a SUB-ACCOUNT Private Integration token (Settings -> Private Integrations inside the sub-account).';
  if (/locationId should not exist/i.test(text)) return 'locationId must go in the query string, not the body (pipeline PUT).';
  if (status === 401) return 'Token rejected: wrong, expired or revoked. Make a new sub-account Private Integration token.';
  if (status === 403) return 'Token lacks a scope for this call. Check the scopes in CLIENT-CHECKLIST.md.';
  if (status === 404) return 'Not found. If this is a workflow create or edit: GHL has no API for that; build it in the UI.';
  return '';
}

function parseRetryAfter(headers) {
  const v = headers && typeof headers.get === 'function' ? headers.get('retry-after') : null;
  if (!v) return null;
  const secs = Number(v);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const when = Date.parse(v);
  return Number.isFinite(when) ? Math.max(0, when - Date.now()) : null;
}

function createHttp({ token, live = false, fetchImpl = globalThis.fetch, sleep, maxRetries = 4, onRequest } = {}) {
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  let count = 0;

  async function request(method, path, { query, body } = {}) {
    const url = BASE_URL + path + queryString(query);
    if (!live) throw new NetworkDisabledError(`${method} ${path}`);
    const t = typeof token === 'function' ? token() : token;
    if (!t) throw new Error('No GHL token. Put it in .env next to client.yaml (GHL_TOKEN=...) or pass --token-file. Never in chat.');
    const headers = {
      Authorization: `Bearer ${t}`,
      Version: API_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    };
    for (let attempt = 0; ; attempt++) {
      count++;
      if (onRequest) onRequest({ method, url });
      const res = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await res.text();
      let parsed;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
      if (res.status === 429 && attempt < maxRetries) {
        const ms = parseRetryAfter(res.headers) ?? Math.min(1000 * 2 ** attempt, 30000);
        await wait(Math.min(ms, 60000));
        continue;
      }
      const ok = res.status >= 200 && res.status < 300;
      return { status: res.status, ok, body: parsed, hint: ok ? '' : hintFor(res.status, parsed), method, path };
    }
  }

  return {
    live,
    request,
    get: (path, query) => request('GET', path, { query }),
    post: (path, body, query) => request('POST', path, { body, query }),
    put: (path, body, query) => request('PUT', path, { body, query }),
    get requestCount() { return count; },
  };
}

module.exports = { createHttp, NetworkDisabledError, hintFor, BASE_URL, API_VERSION, USER_AGENT, queryString };
