// The command line: preflight, build, checklist, verify.
// Nothing touches the network without --live. Run logs go to out/ next to client.yaml.
'use strict';
const fs = require('fs');
const path = require('path');
const { loadDefinition, loadClientFile, resolve } = require('./config.js');
const { createHttp } = require('./http.js');
const { createGhl } = require('./ghl.js');
const { checkInputs, checkAccount, blocking } = require('./preflight.js');
const { runBuild } = require('./build.js');
const { renderChecklist } = require('./checklist.js');
const { runVerify, formatTable } = require('./verify.js');

const USAGE = `Usage: node <repo>/bin/ghl-build.js <command> [options]

Commands
  preflight    Is client.yaml complete? With --live: is the account ready (read-only)?
  build        Fields, tags, pipelines, calendar, custom values. Dry run unless --live.
  checklist    Writes out/ui-checklist.md: the exact UI steps, with this client's values.
  verify       With --live: reads everything back and prints a pass/fail table (read-only).

Options
  --client <file>      client.yaml to use (default: ./client.yaml)
  --live               allow network calls. build --live WRITES (creates what is missing)
  --check              with build --live: read the account and plan, write nothing
  --repair             with build --live: also append missing pipeline stages, fix our calendar's
                       settings (full settings, never partial) and fill blank custom values
  --token-file <file>  read the GHL token from this file instead of the .env variable
  --out <dir>          where logs and the checklist go (default: out/ next to client.yaml)
`;

function parseArgs(argv) {
  const out = { command: null, flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (['client', 'token-file', 'out'].includes(k) && v === undefined) out.flags[k] = argv[++i];
      else out.flags[k] = v === undefined ? true : v;
    } else if (!out.command) out.command = a;
    else throw new Error(`Unexpected argument "${a}".\n\n${USAGE}`);
  }
  return out;
}

// KEY=VALUE lines from .env next to client.yaml. Existing environment variables win.
function loadDotEnv(dir, env = process.env) {
  const file = path.join(dir, '.env');
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const v = m[2].replace(/^["']|["']$/g, '');
    if (env[m[1]] === undefined) env[m[1]] = v;
  }
  return true;
}

function tokenSource(client, flags, env = process.env) {
  const file = flags['token-file'] || (client.ghl && client.ghl.token_file);
  if (file) {
    return {
      where: `file ${file}`,
      present: fs.existsSync(file) && fs.readFileSync(file, 'utf8').trim() !== '',
      read: () => fs.readFileSync(file, 'utf8').trim(),
    };
  }
  const name = (client.ghl && client.ghl.token_env) || 'GHL_TOKEN';
  return { where: `environment variable ${name} (.env)`, present: !!(env[name] && env[name].trim()), read: () => (env[name] || '').trim() };
}

function writeLog(outDir, command, data) {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(outDir, `${stamp}-${command}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

const fmtAction = (a) => `${a.action.padEnd(15)} ${a.kind.padEnd(13)} ${a.name}${a.detail ? `  (${a.detail})` : ''}${a.warning ? `  WARNING: ${a.warning}` : ''}${a.error ? `  ERROR: ${a.error}` : ''}`;

async function main(argv, { env = process.env, fetchImpl, sleep, stdout = console.log, stderr = console.error, cwd = process.cwd() } = {}) {
  const { command, flags } = parseArgs(argv);
  if (!command || flags.help || command === 'help') { stdout(USAGE); return 0; }
  if (!['preflight', 'build', 'checklist', 'verify'].includes(command)) { stderr(`Unknown command "${command}".\n\n${USAGE}`); return 2; }

  const clientFile = path.resolve(cwd, flags.client || 'client.yaml');
  const clientDir = path.dirname(clientFile);
  const outDir = path.resolve(clientDir, flags.out || 'out');
  loadDotEnv(clientDir, env);
  const client = loadClientFile(clientFile);
  const resolved = resolve(loadDefinition(), client);
  const live = flags.live === true;
  const tok = tokenSource(client, flags, env);
  const isGhl = !client.ghl || client.ghl.platform !== 'other';
  const name = (client.client && client.client.name) || clientFile;
  const makeGhl = () => {
    const http = createHttp({ token: () => tok.read(), live, fetchImpl, sleep });
    return { http, ghl: createGhl(http, client.ghl && client.ghl.location_id) };
  };

  if (command === 'checklist') {
    const md = renderChecklist(resolved);
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, 'ui-checklist.md');
    fs.writeFileSync(file, md);
    stdout(`Wrote ${file} (${md.split('\n').length} lines) for ${name}.`);
    if (resolved.missing.size) stdout(`Missing in client.yaml, shown as <missing: ...>: ${[...resolved.missing].join(', ')}`);
    return 0;
  }

  if (command === 'preflight') {
    stdout(`Preflight for ${name}${live ? ' (live, read-only)' : ' (offline: client.yaml only; add --live to check the account)'}`);
    const rows = checkInputs(client);
    rows.push({ path: '(token)', label: `GHL token in ${tok.where}`, stage: 'live', status: tok.present ? 'ok' : 'missing', note: tok.present ? 'present (not shown)' : 'put it in .env next to client.yaml; never in chat' });
    if (!isGhl) rows.push({ path: 'ghl.platform', label: 'Not GoHighLevel', stage: 'build', status: 'info', note: 'build and verify do not apply. Run checklist and use spec/ as the description of what to build.' });
    if (live && isGhl) {
      if (!tok.present || !(client.ghl && client.ghl.location_id)) rows.push({ path: '-', label: 'Account checks', stage: 'live', status: 'info', note: 'skipped: token or location id missing' });
      else rows.push(...await checkAccount(makeGhl().ghl, client, resolved));
    }
    for (const stage of ['live', 'build', 'checklist', 'go-live']) {
      const r = rows.filter((x) => x.stage === stage);
      if (!r.length) continue;
      stdout(`\n${stage.toUpperCase()}${stage === 'go-live' ? ' (not needed to build; needed before anything customer-facing goes on)' : ''}`);
      for (const x of r) stdout(`  ${x.status.toUpperCase().padEnd(8)} ${x.label} [${x.path}]${x.note ? ` - ${x.note}` : ''}`);
    }
    const block = blocking(rows, live);
    const log = writeLog(outDir, 'preflight', { command, live, client: name, rows });
    stdout(`\n${block.length ? `${block.length} input(s) block the build: ${block.map((b) => b.path).join(', ')}` : 'Nothing blocks the build.'}\nLog: ${log}`);
    return block.length ? 1 : 0;
  }

  if (!isGhl) { stderr(`${name} is not on GoHighLevel (ghl.platform: other). Stop after the checklist: spec/ still describes what to build.`); return 1; }

  if (command === 'build') {
    const pre = blocking(checkInputs(client), live);
    if (pre.length) { stderr(`Nothing built. Fix client.yaml first (run preflight): ${pre.map((b) => b.path).join(', ')}`); return 1; }
    const mode = !live ? 'dry' : flags.check ? 'check' : 'live';
    if (!live && (flags.check || flags.repair)) stdout(`--${flags.check ? 'check' : 'repair'} needs --live; without it this is the dry run.`);
    if (live && !tok.present) { stderr(`No GHL token found in ${tok.where}. Put it in .env next to client.yaml.`); return 1; }
    stdout(mode === 'dry' ? `Build plan for ${name}: DRY RUN, no network. Add --live --check to compare with the account, or --live to build.`
      : mode === 'check' ? `Build check for ${name}: reads the account, writes nothing.`
        : `Building for ${name}: creates only what is missing${flags.repair ? ', plus --repair' : ''}.`);
    const { http, ghl } = mode === 'dry' ? { http: null, ghl: null } : makeGhl();
    let result;
    try {
      result = await runBuild({ resolved, ghl, mode, repair: flags.repair === true, print: (a) => stdout(fmtAction(a)) });
    } catch (e) {
      const log = writeLog(outDir, 'build', { command, mode, client: name, locationId: client.ghl && client.ghl.location_id, error: e.message });
      stderr(`${e.message}\nLog: ${log}`);
      return 1;
    }
    const s = result.summary;
    const log = writeLog(outDir, 'build', { command, mode, repair: !!flags.repair, client: name, locationId: client.ghl && client.ghl.location_id, requests: http ? http.requestCount : 0, ...result });
    stdout(mode === 'live' ? `\nCreated ${s.created}, repaired ${s.repaired}, already there ${s.exists}, failed ${s.failed}, warnings ${s.warnings}.`
      : mode === 'check' ? `\n${s.planned} to create or repair, ${s.exists} already there, warnings ${s.warnings}. Nothing was written.`
        : `\n${s.planned} objects managed by the API build. Dry run: the account was not read and nothing was written.`);
    stdout(`Log: ${log}`);
    if (mode === 'live' && !s.failed) stdout('Next: node <repo>/bin/ghl-build.js checklist, build the UI parts, then verify --live.');
    return s.failed ? 1 : 0;
  }

  if (command === 'verify') {
    if (!live) { stdout('verify reads the account, so it needs --live. It is read-only: GET requests only.'); return 2; }
    if (!tok.present) { stderr(`No GHL token found in ${tok.where}.`); return 1; }
    const { ghl } = makeGhl();
    const result = await runVerify({ resolved, ghl });
    stdout(formatTable(result.rows));
    const s = result.summary;
    stdout(`\nPASS ${s.pass} · FAIL ${s.fail} · WARN ${s.warn} · MANUAL ${s.manual}`);
    stdout(`Log: ${writeLog(outDir, 'verify', { command, client: name, ...result })}`);
    return s.fail ? 1 : 0;
  }
  return 2;
}

module.exports = { main, parseArgs, loadDotEnv, tokenSource, USAGE };
