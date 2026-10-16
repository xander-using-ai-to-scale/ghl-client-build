// Turns config/*.json (the build definition) plus client.yaml (one client's details) into one
// resolved build: every ${...} filled, every 'when' applied, the client's customize block applied.
//
//   ${path}          a value from client.yaml, e.g. ${program.name}; ${derived.x} is computed below.
//                    A value that is the template alone keeps its type (a list stays a list).
//   {{...}}          a GHL merge field. Left exactly as it is.
//   "when": "..."    "path" (truthy), "!path", "path == value", "path != value"; join several with " && ".
'use strict';
const fs = require('fs');
const path = require('path');
const { parseYaml } = require('./yaml.js');
const { loadTemplate, deriveTemplate, applyTemplate } = require('./template.js');

const REPO_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(REPO_DIR, 'config');
const CONFIG_FILES = ['fields', 'tags', 'pipelines', 'calendar', 'custom-values', 'forms', 'workflows', 'ui-steps'];

const DEFAULT_TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];
const DEFAULT_PAYMENT_METHODS = ['ACH', 'Check', 'PayPal', 'Gift Card', 'Service Credit', 'Other'];
const DAY_NUMBERS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`Cannot read ${file}: ${e.message}`); }
}

function loadDefinition(dir = CONFIG_DIR) {
  const def = {};
  for (const name of CONFIG_FILES) def[name] = readJson(path.join(dir, `${name}.json`));
  return def;
}

function loadClientFile(file) {
  if (!fs.existsSync(file)) throw new Error(`No client file at ${file}. Copy client.example.yaml to the client's folder as client.yaml and fill it in.`);
  const text = fs.readFileSync(file, 'utf8');
  // Tokens never live in client.yaml. GHL Private Integration tokens start "pit-".
  if (/\bpit-[0-9a-f-]{8,}/i.test(text)) {
    throw new Error(`${file} contains what looks like a GHL token. Move it to .env (GHL_TOKEN=...), delete it from client.yaml, and rotate the token if the file was ever shared or committed.`);
  }
  const data = parseYaml(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${file}: expected a map at the top level.`);
  return data;
}

function get(obj, p) {
  return p.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
}

const present = (v) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));
const list = (v) => (Array.isArray(v) ? v : present(v) ? [v] : []);
const slugify = (s) => String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function evalWhen(expr, ctx) {
  if (expr === undefined || expr === null || expr === '') return true;
  if (String(expr).includes('&&')) return String(expr).split('&&').every((part) => evalWhen(part.trim(), ctx));
  const e = String(expr).trim();
  const m = e.match(/^([\w.]+)\s*(==|!=)\s*(.+)$/);
  if (m) {
    const v = get(ctx, m[1]);
    const want = m[3].trim().replace(/^["']|["']$/g, '');
    const eq = String(v) === want;
    return m[2] === '==' ? eq : !eq;
  }
  if (e.startsWith('!')) return !present(get(ctx, e.slice(1).trim())) || get(ctx, e.slice(1).trim()) === false;
  const v = get(ctx, e);
  return v !== false && present(v);
}

function hhmm(s, label) {
  const m = String(s ?? '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`calendar.hours: "${s}" is not a time like "10:00" (${label})`);
  return [Number(m[1]), Number(m[2])];
}

// client.yaml hours -> GHL openHours: one entry per day, each with its time windows.
function toOpenHours(hours) {
  const byDay = new Map();
  for (const [i, h] of list(hours).entries()) {
    if (!h || typeof h !== 'object') continue;
    const [oh, om] = hhmm(h.open, `window ${i + 1}`);
    const [ch, cm] = hhmm(h.close, `window ${i + 1}`);
    for (const d of list(h.days)) {
      const n = DAY_NUMBERS[String(d).toLowerCase().slice(0, 3)];
      if (n === undefined) throw new Error(`calendar.hours: "${d}" is not a day (use mon, tue, wed, thu, fri, sat, sun)`);
      if (!byDay.has(n)) byDay.set(n, []);
      byDay.get(n).push({ openHour: oh, openMinute: om, closeHour: ch, closeMinute: cm });
    }
  }
  return [...byDay.keys()].sort((a, b) => a - b).map((d) => ({ daysOfTheWeek: [d], hours: byDay.get(d) }));
}

// Values computed from client.yaml that the config refers to as ${derived.*}.
function derive(c) {
  const program = c.program || {};
  const cal = c.calendar || {};
  const people = c.people || {};
  const domain = (c.domain || {}).partner_domain;
  const email = c.email_sending || {};
  const prefix = (c.naming || {}).prefix || '';
  const am = present(get(c, 'affiliate_manager.enabled')) && get(c, 'affiliate_manager.enabled') !== false;
  const rate = program.commission_rate_percent;
  const names = {
    recruiting: `${prefix}Partner Recruiting`,
    lifecycle: `${prefix}Partner Lifecycle`,
    referred: `${prefix}Referred Leads`,
    calendar: `${prefix}${cal.name || 'Partner Intro Call'}`,
    refer_form: `${prefix}Refer a Client`,
    signup_form: `${prefix}Partner Sign-Up`,
    staff_form: `${prefix}Staff Attribution`,
    funnel: program.name || '<program.name>',
    campaign: program.name || '<program.name>',
  };
  let openHours = [];
  let openHoursError = null;
  try { openHours = toOpenHours(cal.hours); } catch (e) { openHoursError = e.message; }
  return {
    prefix,
    names,
    partner_tiers: present(program.partner_tiers) ? list(program.partner_tiers) : DEFAULT_TIERS,
    payment_methods: present(program.payment_methods) ? list(program.payment_methods) : DEFAULT_PAYMENT_METHODS,
    segment_tags: list(program.segments).map((s) => `segment/${slugify(s)}`),
    open_hours: openHours,
    open_hours_error: openHoursError,
    slot_interval: present(cal.interval_minutes) ? cal.interval_minutes : 30,
    confirmation_text: present(cal.confirmation_text) ? cal.confirmation_text : 'Your call is booked. A calendar invite with the details is on its way to your email.',
    partner_page_url: present(domain) ? `https://${domain}/become-a-partner` : '',
    refer_url: present(domain) ? `https://${domain}/refer` : '',
    commission_label: present(program.commission_label) ? program.commission_label : present(rate) ? `${rate}%` : '',
    alert_list: list(people.alert_emails).join(', ') || '<people.alert_emails>',
    token_env: get(c, 'ghl.token_env') || 'GHL_TOKEN',
    referral_code_query_key: am ? 'am_id' : 'claimed_referral_code',
    refer_link_template: `https://api.leadconnectorhq.com/widget/form/<${names.refer_form} form id>?claimed_partner_id={{contact.id}}&claimed_partner_name={{contact.first_name}}%20{{contact.last_name}}`,
    video_link_text: present(cal.video_link) ? cal.video_link : 'ASK THE CLIENT for the video link (Zoom, Meet or GHL video)',
    daily_max_text: present(cal.daily_max) && cal.daily_max > 0 ? `${cal.daily_max} a day` : 'none (as many as fit in the hours)',
    blocked_dates_text: present(cal.blocked_dates) ? list(cal.blocked_dates).join('; ') : 'none given yet; ask the client',
    domain_text: present(domain) ? domain : 'ASK THE CLIENT which domain we can use (forms use GHL\'s default domain until then)',
    payout_terms_text: present(program.payout_terms) ? program.payout_terms : 'ask the client',
    stripe_text: get(c, 'stripe.connected') === true
      ? 'Stripe is connected: showing earnings in the portal needs a sales campaign with a percentage commission; agree it with the client first.'
      : 'Stripe is not connected, which is fine: the referral engine tracks commissions without it.',
    sending_domain_text: present(email.sending_domain) ? `${email.sending_domain} (authenticated: ${email.authenticated === true ? 'yes' : 'NOT YET'})` : 'NOT SET: ask the client',
    from_text: present(email.from_email) ? `${email.from_name || ''} <${email.from_email}>`.trim() : 'NOT SET: ask the client',
  };
}

// Paths that may legitimately be empty, and paths whose emptiness really means another input is missing.
const MAY_BE_EMPTY = ['derived.prefix', 'item.context'];
const MISSING_ALIAS = { 'derived.partner_page_url': 'domain.partner_domain', 'derived.refer_url': 'domain.partner_domain', 'tpl.partner_signup_url': 'domain.partner_domain', 'tpl.referral_form_url': 'domain.partner_domain' };
const noteMissing = (missing, p) => missing.add(MISSING_ALIAS[p] || p);

// Fills ${...}. Records every path that had no value in `missing`.
function fill(value, ctx, missing) {
  if (typeof value === 'string') {
    const whole = value.match(/^\$\{([\w.]+)\}$/);
    if (whole) {
      const v = get(ctx, whole[1]);
      if (!present(v) && v !== 0 && v !== false && !MAY_BE_EMPTY.includes(whole[1])) noteMissing(missing, whole[1]);
      return v;
    }
    return value.replace(/\$\{([\w.]+)\}/g, (_, p) => {
      const v = get(ctx, p);
      if (MAY_BE_EMPTY.includes(p) && (v === '' || v === undefined || v === null)) return '';
      if (!present(v) && v !== 0) { noteMissing(missing, p); return `<missing: ${MISSING_ALIAS[p] || p}>`; }
      return Array.isArray(v) ? v.join(', ') : String(v);
    });
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item) && 'when' in item && !evalWhen(item.when, ctx)) continue;
      const v = fill(item, ctx, missing);
      if (Array.isArray(v) && typeof item === 'string') out.push(...v); else out.push(v);
    }
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = fill(v, ctx, missing);
    return out;
  }
  return value;
}

const keep = (ctx) => (item) => evalWhen(item.when, ctx);

function applyCustomize(r, cz, missing) {
  if (!cz || typeof cz !== 'object') return;
  const rm = cz.remove || {};
  const has = (names, n) => list(names).map(String).includes(n);
  r.contactFields = r.contactFields.filter((f) => !has(rm.fields, f.name));
  r.opportunityFields = r.opportunityFields.filter((f) => !has(rm.fields, f.name));
  r.tags = r.tags.filter((t) => !has(rm.tags, t.name));
  r.pipelines = r.pipelines.filter((p) => !has(rm.pipelines, p.key) && !has(rm.pipelines, p.name));
  r.workflows = r.workflows.filter((w) => !has(rm.workflows, w.key) && !has(rm.workflows, w.name));
  r.forms = r.forms.filter((f) => !has(rm.forms, f.key) && !has(rm.forms, f.name));
  const add = cz.add || {};
  const upsert = (arr, items, src) => {
    for (const it of list(items)) {
      if (!it || !it.name) { missing.add(`customize.add.${src} (an item has no name)`); continue; }
      const entry = { ...it, spec: 'client.yaml customize' };
      if (it.type && !it.dataType) entry.dataType = it.type;
      const i = arr.findIndex((x) => x.name === it.name);
      if (i >= 0) arr[i] = { ...arr[i], ...entry }; else arr.push(entry);
    }
  };
  upsert(r.contactFields, add.contact_fields, 'contact_fields');
  upsert(r.opportunityFields, add.opportunity_fields, 'opportunity_fields');
  for (const t of list(add.tags)) if (!r.tags.some((x) => x.name === t)) r.tags.push({ name: String(t), spec: 'client.yaml customize' });
  for (const p of list(add.pipelines)) {
    if (!p || !p.name) continue;
    const entry = { key: p.key || slugify(p.name), name: p.name, stages: list(p.stages), spec: 'client.yaml customize' };
    const i = r.pipelines.findIndex((x) => x.name === p.name || x.key === entry.key);
    if (i >= 0) r.pipelines[i] = entry; else r.pipelines.push(entry);
  }
}

function resolve(def, client) {
  const derived = derive(client);
  const tname = get(client, 'template.name');
  const tdef = present(tname) ? ((def.templates && def.templates[tname]) || loadTemplate(tname)) : null;
  if (tdef) derived.tpl = deriveTemplate(client, derived, tdef);
  const ctx = { ...client, derived, tpl: derived.tpl };
  const missing = new Set();
  const r = {
    client,
    derived,
    contactFields: fill(def.fields.contact.filter(keep(ctx)), ctx, missing),
    opportunityFields: fill(def.fields.opportunity.filter(keep(ctx)), ctx, missing),
    tags: [],
    pipelines: fill(def.pipelines.pipelines.filter(keep(ctx)), ctx, missing),
    calendar: fill(def.calendar.calendar, ctx, missing),
    calendarManagedKeys: def.calendar.managedKeys,
    calendarAlwaysSend: def.calendar.alwaysSendKeys,
    customValues: fill(def['custom-values'].customValues.filter(keep(ctx)), ctx, missing),
    forms: fill(def.forms.forms.filter(keep(ctx)), ctx, missing),
    rulesForAll: fill(def.workflows.rulesForAll, ctx, missing),
    workflows: fill(def.workflows.workflows.filter(keep(ctx)), ctx, missing),
    uiSections: fill(def['ui-steps'].sections.filter(keep(ctx)), ctx, missing),
    missing,
  };
  for (const t of def.tags.tags.filter(keep(ctx))) {
    const v = fill(t.name, ctx, missing);
    for (const name of list(v)) r.tags.push({ name: String(name), spec: t.spec });
  }
  if (tdef) {
    for (const p of ['template.value_prefix', 'template.sender_name']) if (!present(get(client, p))) missing.add(p);
    applyTemplate(r, tdef, ctx, { fill, evalWhen });
  }
  applyCustomize(r, client.customize, missing);
  for (const f of [...r.contactFields, ...r.opportunityFields]) f.options = Array.isArray(f.options) ? f.options : f.options ? list(f.options) : undefined;
  const seen = new Set();
  r.tags = r.tags.filter((t) => (seen.has(t.name) ? false : seen.add(t.name)));
  delete r.calendar.spec;
  return r;
}

module.exports = {
  REPO_DIR, CONFIG_DIR, loadDefinition, loadClientFile, resolve, derive, fill, evalWhen, toOpenHours, get, present, list, slugify,
};
