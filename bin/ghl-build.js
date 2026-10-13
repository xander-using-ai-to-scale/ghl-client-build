#!/usr/bin/env node
// GHL client build pipeline. Run from the client's folder (where client.yaml and .env live):
//   node ghl-client-build/bin/ghl-build.js preflight
//   node ghl-client-build/bin/ghl-build.js build            (dry run, no network)
//   node ghl-client-build/bin/ghl-build.js build --live     (creates what is missing)
//   node ghl-client-build/bin/ghl-build.js checklist
//   node ghl-client-build/bin/ghl-build.js verify --live
'use strict';
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  console.error(`Node 18 or newer is needed (this is ${process.versions.node}).`);
  process.exit(2);
}
require('../lib/cli.js').main(process.argv.slice(2))
  .then((code) => { process.exitCode = code; })
  .catch((e) => { console.error(e && e.message ? e.message : e); process.exitCode = 1; });
