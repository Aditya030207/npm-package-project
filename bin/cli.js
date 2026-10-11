#!/usr/bin/env node
const fs = require('node:fs');
const { auditRoutes } = require('../src');
const generateReport = require('../src/generateReport');
const { version } = require('../package.json');
const args = process.argv.slice(2);
const json = args.includes('--json');
const usage = 'Usage: permission-gap check <routes.json> [--json]\nOptions: --help, --version, --json';

try {
  if (args.length === 1 && args[0] === '--help') {
    console.log(usage);
  } else if (args.length === 1 && args[0] === '--version') {
    console.log(version);
  } else {
    const positional = args.filter(arg => arg !== '--json');
    if (positional.length !== 2 || positional[0] !== 'check' || positional[1].startsWith('--') || args.filter(arg => arg === '--json').length > 1) {
      throw new Error(usage);
    }
    let content;
    try { content = fs.readFileSync(positional[1], 'utf8'); }
    catch { throw new Error(`Cannot read file: ${positional[1]}`); }
    let routes;
    try { routes = JSON.parse(content); }
    catch { throw new Error(`Invalid JSON in file: ${positional[1]}`); }
    const result = auditRoutes(routes);
    console.log(json ? JSON.stringify(result, null, 2) : generateReport(result));
    process.exitCode = result.hasIssues ? 1 : 0;
  }
} catch (error) {
  if (json) console.log(JSON.stringify({ error: error.message }));
  else console.error(`Error: ${error.message}`);
  process.exitCode = 2;
}
