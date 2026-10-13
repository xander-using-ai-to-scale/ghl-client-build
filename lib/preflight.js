// preflight: is client.yaml complete, and (with --live) is the GHL account ready?
//
// Offline it only reads client.yaml. With --live it also makes READ-ONLY calls: the location is
// reachable with this token, every person in client.yaml is a user of this sub-account (an agency
// owner is not, trap T11), and no existing field has one of our names with another type.
//
// Each input says which stage it blocks:
//   live      any --live run          build     the API build          checklist  the UI build
//   go-live   switching anything customer-facing on (not needed to build)
'use strict';
const { get, present, list, evalWhen } = require('./config.js');

const STAGES = ['live', 'build', 'checklist', 'go-live'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const REWARD_MODELS = ['Per Lead', 'Per Show', 'Per Qualified Consult', 'Per Sale', 'Revenue Share', 'Custom / Non-Cash'];

// path, what it is, the stage it blocks, an optional check returning a problem or '', and an optional 'when'.
const REQUIREMENTS = [
  ['client.name', 'Business name', 'build'],
  ['client.slug', 'Short name for files (lowercase-with-dashes)', 'build', (v) => (SLUG.test(String(v)) ? '' : 'use lowercase letters, digits and dashes')],
  ['client.timezone', 'Time zone (IANA name, e.g. America/Denver)', 'build', (v) => (/^[A-Za-z_]+\/[A-Za-z_\-/]+$/.test(String(v)) ? '' : 'use an IANA name like America/New_York')],
  ['ghl.platform', 'CRM platform: ghl or other', 'build', (v) => (['ghl', 'other'].includes(String(v)) ? '' : 'must be ghl or other')],
  ['ghl.location_id', 'GHL sub-account location id', 'live'],
  ['people.builder_email', 'Our user in the sub-account (holds person slots until handover)', 'build', (v) => (EMAIL.test(v) ? '' : 'not an email')],
  ['people.calendar_owner_email', 'Calendar owner (a user of the sub-account)', 'build', (v) => (EMAIL.test(v) ? '' : 'not an email')],
  ['people.alert_emails', 'Who gets new-lead alerts (users of the sub-account)', 'checklist', (v) => (list(v).every((e) => EMAIL.test(e)) ? '' : 'every entry must be an email')],
  ['people.task_assignee_email', 'Who gets the follow-up tasks (one user)', 'checklist', (v) => (EMAIL.test(v) ? '' : 'not an email')],
  ['people.commission_approver_email', 'Who approves commissions (one user)', 'checklist', (v) => (EMAIL.test(v) ? '' : 'not an email')],
  ['people.interested_leads_handled_by', 'Who handles interested leads (owner, assistant or agent)', 'checklist'],
  ['people.program_owner_name', 'Program owner name shown to partners', 'go-live'],
  ['program.name', 'Program name (funnel and affiliate campaign)', 'build'],
  ['program.partner_types', 'Partner Type options', 'build', (v) => (Array.isArray(v) && v.length ? '' : 'must be a list with at least one entry')],
  ['program.segments', 'Segment tags (segment/<name>)', 'checklist'],
  ['program.reward_model', 'Reward model', 'build', (v) => (REWARD_MODELS.includes(v) ? '' : `must be one of: ${REWARD_MODELS.join(', ')}`)],
  ['program.commission_mode', 'Commission cycle: recurring_monthly or one_time', 'build', (v) => (['recurring_monthly', 'one_time'].includes(String(v)) ? '' : 'must be recurring_monthly or one_time')],
  ['program.commission_rate_percent', 'Commission rate (percent, a number)', 'build', (v) => (typeof v === 'number' && v >= 0 && v <= 100 ? '' : 'must be a number from 0 to 100')],
  ['program.payout_terms', 'Payout terms (e.g. Net-15)', 'checklist'],
  ['calendar.name', 'Calendar name', 'build'],
  ['calendar.slug', 'Calendar booking slug', 'build', (v) => (SLUG.test(String(v)) ? '' : 'use lowercase letters, digits and dashes')],
  ['calendar.description', 'Calendar description', 'build'],
  ['calendar.duration_minutes', 'Call length in minutes', 'build', (v) => (typeof v === 'number' && v > 0 ? '' : 'must be a number')],
  ['calendar.buffer_minutes', 'Buffer between calls in minutes', 'build', (v) => (typeof v === 'number' && v >= 0 ? '' : 'must be a number')],
  ['calendar.min_notice_hours', 'Minimum notice in hours', 'build', (v) => (typeof v === 'number' && v >= 0 ? '' : 'must be a number')],
  ['calendar.booking_window_days', 'How many days ahead people can book', 'build', (v) => (typeof v === 'number' && v > 0 ? '' : 'must be a number')],
  ['calendar.hours', 'Bookable hours', 'build', (v) => (Array.isArray(v) && v.length ? '' : 'at least one window, e.g. days [mon, tue], open "10:00", close "17:00"')],
  ['calendar.video_link', 'Video link for partner calls', 'go-live'],
  ['domain.partner_domain', 'Domain for the partner pages and forms', 'go-live'],
  ['domain.dns_contact', 'Who can change the domain\'s DNS', 'go-live'],
  ['email_sending.from_email', 'From email for partner emails', 'go-live', (v) => (EMAIL.test(v) ? '' : 'not an email')],
  ['email_sending.authenticated', 'Sending domain has SPF, DKIM and DMARC', 'go-live', (v) => (v === true ? '' : 'not yet: true once SPF, DKIM and DMARC are set')],
  ['sms.a2p_status', 'A2P status (not_started, submitted, approved, not_needed)', 'go-live', (v) => (['not_started', 'submitted', 'approved', 'not_needed'].includes(String(v)) ? '' : 'unknown status')],
  ['instantly.workspace_access', 'Access to the client\'s Instantly workspace', 'checklist', (v) => (v === true ? '' : 'not yet'), 'instantly.enabled'],
  ['instantly.webhook_url', 'GHL trigger URL for the Instantly workflow (after the workflow is built)', 'go-live', null, 'instantly.enabled'],
];

function checkInputs(client) {
  const rows = [];
  for (const [p, label, stage, check, when] of REQUIREMENTS) {
    if (when && !evalWhen(when, client)) continue;
    const v = get(client, p);
    if (!present(v) && v !== 0 && v !== false) { rows.push({ path: p, label, stage, status: 'missing', note: '' }); continue; }
    const problem = check ? check(v) : '';
    rows.push({ path: p, label, stage, status: problem ? (v === false ? 'missing' : 'invalid') : 'ok', note: problem });
  }
  const hours = get(client, 'calendar.hours');
  if (Array.isArray(hours) && hours.length) {
    try { require('./config.js').toOpenHours(hours); } catch (e) { rows.push({ path: 'calendar.hours', label: 'Bookable hours', stage: 'build', status: 'invalid', note: e.message }); }
  }
  return rows;
}

// Read-only checks against the live account. `ghl` is lib/ghl.js; `users` and the rest are reads only.
async function checkAccount(ghl, client, resolved) {
  const rows = [];
  const loc = await ghl.getLocation();
  if (!loc.ok) {
    rows.push({ path: 'ghl.location_id', label: 'Location reachable with this token', stage: 'live', status: 'invalid', note: `${loc.status} ${loc.hint}` });
    return rows; // nothing else can be read
  }
  const location = loc.body && (loc.body.location || loc.body);
  rows.push({ path: 'ghl.location_id', label: 'Location reachable with this token', stage: 'live', status: 'ok', note: `${location.name || '(no name)'} (${ghl.locationId})` });
  if (location.timezone && client.client && client.client.timezone && location.timezone !== client.client.timezone) {
    rows.push({ path: 'client.timezone', label: 'Time zone matches the sub-account', stage: 'checklist', status: 'warn', note: `sub-account says ${location.timezone}, client.yaml says ${client.client.timezone}` });
  }

  const users = await ghl.listUsers();
  const emails = users.ok ? (users.body.users || []).map((u) => String(u.email || '').toLowerCase()) : null;
  const people = client.people || {};
  const slots = [
    ['people.builder_email', people.builder_email],
    ['people.calendar_owner_email', people.calendar_owner_email],
    ['people.task_assignee_email', people.task_assignee_email],
    ['people.commission_approver_email', people.commission_approver_email],
    ...list(people.alert_emails).map((e) => ['people.alert_emails', e]),
  ];
  for (const [p, email] of slots) {
    if (!present(email)) continue;
    if (!emails) { rows.push({ path: p, label: `${email} is a user of this sub-account`, stage: 'build', status: 'invalid', note: `cannot list users: ${users.status} ${users.hint}` }); continue; }
    const ok = emails.includes(String(email).toLowerCase());
    rows.push({
      path: p, label: `${email} is a user of this sub-account`, stage: 'build', status: ok ? 'ok' : 'invalid',
      note: ok ? '' : 'not a sub-account user. An agency owner can open the sub-account but is not a user of it. Add them in Settings -> My Staff (the client does this), then run preflight again.',
    });
  }

  for (const model of ['contact', 'opportunity']) {
    const r = await ghl.listCustomFields(model);
    if (!r.ok) { rows.push({ path: `fields.${model}`, label: `Read ${model} custom fields`, stage: 'build', status: 'invalid', note: `${r.status} ${r.hint}` }); continue; }
    const have = r.body.customFields || [];
    const want = model === 'contact' ? resolved.contactFields : resolved.opportunityFields;
    for (const f of want) {
      const hit = have.find((x) => x.name === f.name);
      if (hit && hit.dataType !== f.dataType) {
        rows.push({ path: `fields.${model}`, label: `Field "${f.name}"`, stage: 'build', status: 'warn', note: `already exists as ${hit.dataType}; we need ${f.dataType}. The build skips it. Decide with the account owner before building.` });
      }
    }
  }
  rows.push({ path: '-', label: 'Stock GHL fields are invisible to the API', stage: 'build', status: 'info', note: 'GET customFields returns only custom fields, so a clash with a stock field shows up as a create error, not here.' });

  const wf = await ghl.listWorkflows();
  if (wf.ok) {
    const live = (wf.body.workflows || []).filter((w) => w.status === 'published');
    rows.push({ path: '-', label: 'Existing published workflows', stage: 'checklist', status: 'info', note: `${live.length} published. Audit each one's Internal Notifications: GHL defaults to "All users" (see the checklist).` });
  } else {
    rows.push({ path: '-', label: 'Read workflows', stage: 'checklist', status: 'warn', note: `${wf.status} ${wf.hint} (needs the Workflows view scope)` });
  }
  return rows;
}

function blocking(rows, live) {
  return rows.filter((r) => (r.status === 'missing' || r.status === 'invalid') && (r.stage === 'build' || (live && r.stage === 'live')));
}

module.exports = { checkInputs, checkAccount, blocking, REQUIREMENTS, STAGES };
