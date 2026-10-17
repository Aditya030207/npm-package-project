const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { auditRoutes, findMissingPermissions, findDuplicateRoutes, findConflictingPermissions } = require('../src');
const generateReport = require('../src/generateReport');
const cli = path.join(__dirname, '../bin/cli.js');
const route = access => ({ method: 'GET', path: '/users', access });
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
function fixture(t, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'permission-gap-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'routes.json');
  fs.writeFileSync(file, contents);
  return file;
}

for (const access of ['public', 'authenticated', 'admin']) {
  test(`accepts ${access} permission`, () => {
    const result = auditRoutes([route(access)]);
    assert.equal(result.hasIssues, false);
    assert.equal(result.summary.validPermissions, 1);
    assert.equal(result.summary.coveragePercentage, 100);
  });
}

test('detects absent, null and blank permissions', () => {
  const missing = findMissingPermissions([route(undefined), route(null), route(''), route('  ')]);
  assert.deepEqual(missing.map(item => item.index), [0, 1, 2, 3]);
});
test('reports unsupported and wrong-type policies as configuration errors', () => {
  const result = auditRoutes(['root', 'Public', ' admin ', 1, false, {}, []].map(route));
  assert.equal(result.findings.invalidPermissions.length, 7);
  assert.equal(result.summary.validPermissions, 0);
  assert.equal(result.summary.missingPermissions, 0);
});
test('groups duplicate routes and counts only extra definitions', () => {
  const routes = [route('public'), route('public'), { ...route('public'), method: 'get' }];
  assert.deepEqual(findDuplicateRoutes(routes), [{ method: 'GET', path: '/users', indices: [0, 1, 2], extraDefinitions: 2 }]);
  assert.equal(auditRoutes(routes).summary.duplicateRoutes, 2);
});
test('detects one conflict per group, even after a missing first policy', () => {
  const routes = [route(), route('admin'), route('public'), route('admin')];
  assert.deepEqual(findConflictingPermissions(routes), [{ method: 'GET', path: '/users', indices: [0, 1, 2, 3], permissions: ['admin', 'public'] }]);
  assert.equal(auditRoutes(routes).summary.conflictingRoutes, 1);
  assert.deepEqual(findConflictingPermissions([route('admin'), route('invalid')]), []);
});
test('different methods and exact different paths are distinct routes', () => {
  const routes = [route('public'), { ...route('admin'), method: 'POST' }, { ...route('admin'), path: '/Users' }, { ...route('admin'), path: '/users/' }];
  assert.deepEqual(findDuplicateRoutes(routes), []);
  assert.deepEqual(findConflictingPermissions(routes), []);
});
test('empty list has zero coverage and no findings', () => {
  const result = auditRoutes([]);
  assert.equal(result.summary.totalRoutes, 0);
  assert.equal(result.summary.coveragePercentage, 0);
  assert.equal(result.hasIssues, false);
});
test('invalid entries are findings, including sparse array slots', () => {
  const routes = [null, [], 'route', {}, { method: 'BAD', path: '/' }, { method: 'GET', path: 'users' }, { method: 'GET', path: '/bad path' }, ...Array(1)];
  const result = auditRoutes(routes);
  assert.equal(result.findings.invalidRoutes.length, 8);
  assert.equal(result.summary.coveragePercentage, 0);
  assert.equal(result.summary.missingPermissions, 0);
});
test('all public functions reject non-array input', () => {
  for (const fn of [auditRoutes, findMissingPermissions, findDuplicateRoutes, findConflictingPermissions]) {
    for (const input of [null, undefined, {}, 'routes', 10]) assert.throws(() => fn(input), /Routes must be an array/);
  }
});
test('coverage uses all definitions; categories partition the total', () => {
  const result = auditRoutes([route('public'), route('admin'), route(), route('invalid'), null, { ...route('authenticated'), path: '/other' }]);
  const s = result.summary;
  assert.equal(s.coveragePercentage, 50);
  assert.equal(s.validPermissions + s.missingPermissions + s.invalidPermissions + s.invalidRoutes, s.totalRoutes);
  assert.equal(auditRoutes([route('public'), route(), null]).summary.coveragePercentage, 33.3);
});
test('structured output and input immutability', () => {
  const input = Object.freeze([Object.freeze({ method: 'get', path: '/', access: 'public' })]);
  const result = auditRoutes(input);
  assert.deepEqual(Object.keys(result), ['summary', 'findings', 'hasIssues']);
  assert.deepEqual(Object.keys(result.findings), ['missingPermissions', 'invalidPermissions', 'invalidRoutes', 'duplicateRoutes', 'conflictingPermissions']);
  assert.equal(input[0].method, 'get');
  assert.doesNotThrow(() => JSON.stringify(result));
});
test('readable report includes all finding types and clean result', () => {
  const report = generateReport(auditRoutes([route(), route('bad'), null, route('admin'), route('public')]));
  for (const text of ['Missing permission declaration', 'Invalid permission', 'Index 2', 'Duplicate route definition', 'Conflicting permissions', 'Permission Coverage: 40%', 'Audit Complete']) assert.ok(report.includes(text));
  assert.match(generateReport(auditRoutes([])), /No issues found/);
});
test('CLI reads valid JSON and prints a report', t => {
  const result = run('check', fixture(t, JSON.stringify([route('public')])));
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Permission Coverage: 100%/);
  assert.equal(result.stderr, '');
});
test('CLI --json returns structured findings and exit 1', t => {
  const result = run('check', fixture(t, JSON.stringify([route()])), '--json');
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).summary.missingPermissions, 1);
  assert.equal(result.stderr, '');
});
test('CLI unreadable path gives friendly error and exit 2', () => {
  const result = run('check', path.join(os.tmpdir(), 'nonexistent-permission-gap', 'missing.json'));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Cannot read file/);
});
test('CLI malformed JSON and non-array JSON give structured errors', t => {
  for (const [content, message] of [['{', /Invalid JSON/], ['{}', /Routes must be an array/]]) {
    const result = run('check', fixture(t, content), '--json');
    assert.equal(result.status, 2);
    assert.match(JSON.parse(result.stdout).error, message);
  }
});
test('CLI help and version work', () => {
  assert.equal(run('--help').status, 0);
  assert.match(run('--help').stdout, /Usage:/);
  assert.equal(run('--version').stdout.trim(), require('../package.json').version);
});
test('CLI rejects missing or unsupported arguments', () => {
  for (const args of [[], ['check'], ['scan', 'routes.json'], ['check', 'routes.json', '--unknown'], ['check', 'routes.json', '--json', '--json']]) {
    assert.equal(run(...args).status, 2);
  }
});

test('rejects control characters before including paths in a terminal report', () => {
  for (const character of ['\x00', '\x1b', '\x7f', '\x85', '\x9b']) {
    const result = auditRoutes([{ method: 'GET', path: `/users${character}[2J`, access: 'public' }]);
    assert.equal(result.summary.invalidRoutes, 1);
    assert.equal(result.summary.validPermissions, 0);
    assert.ok(!generateReport(result).includes(character));
  }
});

test('CLI accepts a UTF-8 BOM but still rejects malformed JSON after it', t => {
  const good = run('check', fixture(t, '\uFEFF' + JSON.stringify([route('public')])), '--json');
  assert.equal(good.status, 0);
  assert.equal(JSON.parse(good.stdout).summary.validPermissions, 1);
  const bad = run('check', fixture(t, '\uFEFF{'), '--json');
  assert.equal(bad.status, 2);
  assert.match(JSON.parse(bad.stdout).error, /Invalid JSON/);
});

test('CLI treats dash-prefixed filenames literally after --', t => {
  const file = fixture(t, JSON.stringify([route('public')]));
  const dir = path.dirname(file);
  for (const name of ['-routes.json', '--json']) {
    fs.copyFileSync(file, path.join(dir, name));
    const result = spawnSync(process.execPath, [cli, 'check', '--json', '--', name], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).summary.validPermissions, 1);
  }
  assert.equal(run('check', '-unknown').status, 2);
  assert.equal(run('check', '--').status, 2);
});
