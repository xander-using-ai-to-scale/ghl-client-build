// Templates: an opt-in layer on top of the standard build, switched on in client.yaml with
// `template: { name: <name> }`. A template lives in templates/<name>/ and has the same shape as
// config/: fields, tags, pipelines, custom values, workflows and UI steps, plus smart lists and
// message copy. Its objects are merged into the resolved build, so build, verify and checklist
// treat them like the standard ones (create-only, verify by name, Draft first).
//
// Extra to config/:
//   "each": "<path>"   repeat the object once per item of that list; inside it ${item.x} is the item
//   ${tpl.x}           values computed for the template (see deriveTemplate), e.g. ${tpl.cv.quick_app_url}
//   copy/*.md          message copy, filled the same way and written to out/template-copy.md
'use strict';
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');
const FILES = ['defaults', 'fields', 'tags', 'pipelines', 'custom-values', 'smart-lists', 'workflows', 'ui-steps', 'copy'];

const present = (v) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));
const list = (v) => (Array.isArray(v) ? v : present(v) ? [v] : []);
const slugify = (s) => String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { throw new Error(`Cannot read ${file}: ${e.message}`); }
}

function templateNames(dir = TEMPLATES_DIR) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'workflows.json'))) : [];
}

// Reads templates/<name>/*.json and the copy files the copy manifest names.
function loadTemplate(name, dir = TEMPLATES_DIR) {
  const root = path.join(dir, String(name));
  if (!/^[a-z0-9-]+$/.test(String(name)) || !fs.existsSync(path.join(root, 'workflows.json'))) {
    throw new Error(`client.yaml template.name is "${name}", but there is no such template. Known: ${templateNames(dir).join(', ') || 'none'}. Use "" for the standard build only.`);
  }
  const t = { name: String(name), root };
  for (const f of FILES) {
    const file = path.join(root, `${f}.json`);
    t[f] = fs.existsSync(file) ? readJson(file) : {};
  }
  t.copyFiles = list(t.copy.files).map((c) => ({ ...c, text: fs.readFileSync(path.join(root, 'copy', c.file), 'utf8') }));
  return t;
}

// Values the template's JSON and copy refer to as ${tpl.*}. Defaults come from defaults.json, so the
// template rebuilds its source client exactly when client.yaml leaves an input out.
function deriveTemplate(c, derived, tdef) {
  const t = c.template || {};
  const d = tdef.defaults || {};
  const stl = t.stl || {};
  const react = t.react || {};
  const aff = t.aff_email || {};
  const people = c.people || {};
  const p = present(t.value_prefix) ? String(t.value_prefix) : '<missing: template.value_prefix>';
  const senderName = present(t.sender_name) ? String(t.sender_name) : '';
  const first = senderName.split(/\s+/)[0] || '';
  const senderSlug = first ? slugify(first) : 'owner';
  const own = present(stl.own_lead_pipeline);
  const window = t.sending_window || {};
  const days = present(window.days) ? list(window.days) : d.sending_window.days;
  const dayText = (ds) => ds.map((x) => String(x).slice(0, 3)).map((x) => x[0].toUpperCase() + x.slice(1)).join(', ');
  const segments = (present(react.segments) ? list(react.segments) : d.segments).map((s) => ({
    ...s,
    num: String(s.num).padStart(2, '0'),
    key: s.key || slugify(s.name),
    email_only: s.email_only === true,
    context: present(s.context) ? s.context : '',
  }));
  const outreach = (present(aff.outreach) ? list(aff.outreach) : d.outreach).map((o) => ({ ...o, key: o.key || slugify(o.name), copy: o.copy || 'introducer' }));
  const first_outreach = outreach[0] || { key: '<missing: template.aff_email.outreach>' };
  const cvName = {
    quick_app_url: `${p}_quick_app_url`,
    partner_signup_url: `${p}_partner_signup_url`,
    partner_calendar_url: `${p}_partner_calendar_url`,
    referral_form_url: `${p}_referral_form_url`,
    sender_phone: `${p}_${senderSlug}_phone`,
    sender_email: `${p}_${senderSlug}_email`,
    assistant_email: `${p}_assistant_email`,
  };
  const cv = Object.fromEntries(Object.entries(cvName).map(([k, v]) => [k, `{{custom_values.${v}}}`]));
  const assistant = present(t.assistant_email) ? t.assistant_email : people.task_assignee_email;
  const owner = present(t.owner_email) ? t.owner_email : people.commission_approver_email;
  const on = (x) => x.enabled !== false;
  return {
    name: tdef.name,
    stl_on: on(stl),
    react_on: on(react),
    aff_on: on(aff),
    react_tags_on: on(react) || on(stl),
    stl_pipeline_on: on(stl) && !own,
    broker_intake_on: on(aff) && aff.broker_intake_shell === true,
    p,
    cv_name: cvName,
    cv,
    sender_first_name: first || '<missing: template.sender_name>',
    sender_slug: senderSlug,
    sms_on: String((c.sms || {}).a2p_status) === 'approved',
    sms_text: String((c.sms || {}).a2p_status) === 'approved'
      ? 'A2P is approved: build the SMS steps and keep them in Draft with the rest.'
      : `A2P status is ${(c.sms || {}).a2p_status || 'unknown'}: build the SMS steps but leave the workflow in Draft; nothing texts until A2P is approved.`,
    assistant_email: assistant || '<missing: template.assistant_email>',
    owner_email: owner || '<missing: template.owner_email>',
    alert_list: list(people.alert_emails).join(', ') || '<people.alert_emails>',
    own_lead_pipeline: own,
    lead_pipeline: own ? stl.own_lead_pipeline : d.stl_pipeline.name,
    lead_stage: own ? (stl.own_lead_stage || '<missing: template.stl.own_lead_stage>') : d.stl_pipeline.new_stage,
    app_done_stage: own ? (stl.own_app_done_stage || '<missing: template.stl.own_app_done_stage>') : d.stl_pipeline.app_done_stage,
    replied_stage: own ? (stl.own_replied_stage || '') : d.stl_pipeline.replied_stage,
    replied_stage_step: own && !present(stl.own_replied_stage)
      ? 'No stage move (template.stl.own_replied_stage is empty).'
      : `Find opportunity (pipeline ${own ? stl.own_lead_pipeline : d.stl_pipeline.name}, the contact's open deal), then Update opportunity -> stage ${own ? stl.own_replied_stage : d.stl_pipeline.replied_stage}.`,
    lead_trigger: present(stl.lead_trigger) ? stl.lead_trigger : d.stl_lead_trigger,
    source_tag: present(stl.source_tag) ? stl.source_tag : d.stl_source_tag,
    window_days: dayText(days),
    window_text: `${dayText(days)}, ${window.start || d.sending_window.start} to ${window.end || d.sending_window.end}, ${window.timezone === 'contact' ? "the contact's time zone" : `the account time zone (${(c.client || {}).timezone || 'client.timezone'})`}`,
    stl_window_text: d.stl_window,
    segments,
    segment_options: segments.map((s) => `${s.num}-${s.key}`),
    message_segments: segments.filter((s) => s.sequence !== 'aff-handoff'),
    handoff_segments: segments.filter((s) => s.sequence === 'aff-handoff'),
    handoff_text: segments.filter((s) => s.sequence === 'aff-handoff').map((s) => `${s.num} ${s.name}`).join(', ') || 'none',
    segment_workflow_names: segments.filter((s) => s.sequence !== 'aff-handoff').map((s) => `REACT | Segment ${s.num} - ${s.name}`).join(', '),
    unfinished_app_segment: (segments.find((s) => s.unfinished_app) || segments[2] || { num: '03' }).num,
    outreach,
    first_outreach_key: first_outreach.key,
    outreach_workflow_names: outreach.map((o) => `AFF | Outreach - ${o.name}`).join(', '),
    drip_batch: present(react.drip_batch_size) ? react.drip_batch_size : d.drip.batch_size,
    drip_days: present(react.drip_days) ? dayText(list(react.drip_days)) : dayText(d.drip.days),
    drip_window: present(react.drip_window) ? react.drip_window : d.drip.window,
    referral_form_url: present(aff.referral_form_url) ? aff.referral_form_url : derived.refer_url,
    partner_signup_url: present(aff.partner_signup_url) ? aff.partner_signup_url : derived.partner_page_url,
  };
}

// Repeats every object that carries "each" once per item of that list (ctx.item = the item).
function expand(items, ctx, fill, evalWhen, missing) {
  const out = [];
  for (const it of list(items)) {
    if (it && typeof it === 'object' && it.each) {
      const { each, ...rest } = it;
      const arr = (each.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx)) || [];
      for (const item of list(arr)) {
        const ictx = { ...ctx, item };
        if (!evalWhen(rest.when, ictx)) continue;
        out.push(fill(rest, ictx, missing));
      }
      continue;
    }
    if (it && typeof it === 'object' && !evalWhen(it.when, ctx)) continue;
    out.push(fill(it, ctx, missing));
  }
  return out;
}

// Merges a template into a resolved build. Called by config.resolve before the client's customize
// block, so customize.remove can still drop a template object by name.
function applyTemplate(r, tdef, ctx, { fill, evalWhen }) {
  const missing = r.missing;
  const tag = (o) => ({ ...o, program: o.program || 'template' });
  const fields = tdef.fields || {};
  r.contactFields.push(...expand(fields.contact, ctx, fill, evalWhen, missing));
  r.opportunityFields.push(...expand(fields.opportunity, ctx, fill, evalWhen, missing));
  for (const t of expand((tdef.tags || {}).tags, ctx, fill, evalWhen, missing)) r.tags.push({ name: String(t.name).toLowerCase(), spec: t.spec, program: t.program });
  r.pipelines.push(...expand((tdef.pipelines || {}).pipelines, ctx, fill, evalWhen, missing));
  r.customValues.push(...expand((tdef['custom-values'] || {}).customValues, ctx, fill, evalWhen, missing));
  r.smartLists = expand((tdef['smart-lists'] || {}).smartLists, ctx, fill, evalWhen, missing);
  const wf = tdef.workflows || {};
  r.templatePrograms = expand(wf.programs, ctx, fill, evalWhen, missing);
  r.workflows.push(...expand(wf.workflows, ctx, fill, evalWhen, missing).map(tag));
  r.templateSections = expand((tdef['ui-steps'] || {}).sections, ctx, fill, evalWhen, missing);
  r.templateCopy = [];
  for (const c of tdef.copyFiles || []) {
    const arr = c.each ? list(c.each.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx)) : [null];
    for (const item of arr) {
      const ictx = item ? { ...ctx, item } : ctx;
      if (!evalWhen(c.when, ictx)) continue;
      r.templateCopy.push({ title: fill(c.title, ictx, missing), program: c.program, text: fill(c.text, ictx, missing) });
    }
  }
  r.template = { name: tdef.name, about: (tdef.defaults || {}).about || '' };
}

module.exports = { TEMPLATES_DIR, loadTemplate, deriveTemplate, applyTemplate, templateNames, expand };
