# Permission Gap Detector

A small, dependency-free CommonJS Node.js package that checks **declared API route permissions**.

## Problem statement

While building an Express REST API, a developer can forget to specify who should access a route. A route list makes these decisions visible. This package finds missing or inconsistent declarations so they can be reviewed.

It does not inspect Express middleware or prove that an application is secure.

## Features

- Detect missing permissions and unsupported permission values.
- Support `public`, `authenticated`, and `admin` policies.
- Detect repeated method/path pairs and conflicting valid policies.
- Return structured findings and permission declaration coverage.
- Read route lists from JSON using a simple CLI.

## Installation

Requires Node.js 20 or newer and npm. No external dependencies.

Install from npm:

```bash
npm install permission-gap-detector
```

Alternatively, install directly from GitHub:

```bash
npm install github:Aditya030207/npm-package-project
```

Or run `npm pack` in this repository and install the resulting archive in another project:

```bash
npm install /absolute/path/to/permission-gap-detector-1.0.1.tgz
```

## Basic usage

```js
const { auditRoutes } = require('permission-gap-detector');

const routes = [
  { method: 'GET', path: '/products', access: 'public' },
  { method: 'DELETE', path: '/products/:id' }
];

const result = auditRoutes(routes);
console.log(result.summary);
console.log(result.findings.missingPermissions);
// [{ index: 1, method: 'DELETE', path: '/products/:id' }]
```

Maintain this route list alongside your Express routes. The package does not automatically discover routes.

## Route format and validation

Input is an array of ordinary route objects. Each object needs:

| Field | Accepted values |
| --- | --- |
| `method` | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, CONNECT, TRACE; case-insensitive |
| `path` | A string starting with `/`, without whitespace or control characters |
| `access` | Exactly `public`, `authenticated`, or `admin` |

`public` allows anyone; `authenticated` requires a logged-in user; `admin` requires administrator access. These are declarations, not enforcement.

Absent, undefined, null, empty, and whitespace-only access values are missing. Other unsupported values are invalid permissions. Invalid route objects, methods, and paths are reported as invalid routes and excluded from other checks. Additional fields are ignored. Methods are normalized to uppercase without changing the input. Paths are compared exactly: `/users`, `/Users`, `/users/`, and parameter names are distinct.

## API

All four functions accept a route array and leave it unchanged. A non-array argument throws `TypeError`. Invalid entries inside an array are reported by `auditRoutes` instead of throwing.

### `auditRoutes(routes)`

Returns `{ summary, findings, hasIssues }`.

`summary` contains:

| Field | Meaning |
| --- | --- |
| `totalRoutes` | All submitted definitions, including invalid entries |
| `validPermissions` | Structurally valid definitions with a supported access value |
| `missingPermissions` | Valid route structures with missing access |
| `invalidPermissions` | Valid route structures with unsupported access |
| `invalidRoutes` | Invalid route structures |
| `duplicateRoutes` | Extra definitions beyond the first in each repeated method/path group |
| `conflictingRoutes` | Method/path groups with at least two distinct supported policies |
| `coveragePercentage` | Valid permissions divided by total definitions, multiplied by 100, rounded to one decimal |

The four permission/validation categories sum to `totalRoutes`. An empty array has 0% coverage because no declarations were checked. Duplicates and conflicts overlap with these categories and must not be added to them. Three copies of one route count as two duplicates. A conflicting group counts once. Valid policies on duplicates still count toward declaration coverage: **100% coverage can coexist with conflicts and does not mean secure**.

`findings` contains five arrays:

- `missingPermissions`: `{ index, method, path }`.
- `invalidPermissions`: `{ index, method, path, access }`.
- `invalidRoutes`: `{ index, message }`.
- `duplicateRoutes`: `{ method, path, indices, extraDefinitions }`.
- `conflictingPermissions`: `{ method, path, indices, permissions }`.

Indices are zero-based positions in the original array. Conflict indices include all definitions in that group; `permissions` lists its distinct supported values. Missing and invalid policies do not themselves create conflicts. `hasIssues` is true when any findings array is nonempty.

### `findMissingPermissions(routes)`

Returns the `missingPermissions` findings array.

### `findDuplicateRoutes(routes)`

Returns the `duplicateRoutes` findings array, one object per repeated group.

### `findConflictingPermissions(routes)`

Returns the `conflictingPermissions` findings array, one object per conflicting group.

The three convenience functions return only their named findings. Use `auditRoutes` to see validation errors as well.

## CLI usage

Run directly from npm:

```bash
npx permission-gap-detector check routes.json
```

After installation into a project:

```bash
npx --no-install permission-gap check routes.json
npx --no-install permission-gap check routes.json --json
```

For a direct shell command, globally install the package with `npm install -g permission-gap-detector` then run `permission-gap check routes.json`. Both binary names point to the same CLI.

From this repository:

```bash
node bin/cli.js check examples/routes.json
node bin/cli.js check examples/routes.json --json
node bin/cli.js --help
node bin/cli.js --version
```

Files must contain a JSON array, not an object wrapping the array. Paths are relative to the current working directory; quote paths containing spaces. Exit codes: **0** = no findings, **1** = audit findings, **2** = invalid command, unreadable file, malformed JSON, or non-array input. Human-readable failures go to stderr. With `--json`, failures are `{ "error": "message" }` on stdout.

## Example output

Running the included six-definition example produces:

```text
==================================
     PERMISSION GAP DETECTOR
==================================

Total Routes Checked: 6
Valid Permissions: 5
Missing Permissions: 1
Invalid Permissions: 0
Invalid Route Definitions: 0
Duplicate Routes (extra definitions): 2
Conflicting Policies (route groups): 1

Permission Coverage: 83.3%

Issues Found:
[WARNING] DELETE /products/:id: Missing permission declaration (index 2).
[WARNING] GET /products: Duplicate route definition (indices 0, 3).
[WARNING] GET /admin: Duplicate route definition (indices 4, 5).
[ERROR] GET /admin: Conflicting permissions: admin, public.

==================================
Audit Complete
==================================
```

The example intentionally has issues and exits with code 1.

## Development and testing

```bash
git clone https://github.com/Aditya030207/npm-package-project.git
cd npm-package-project
npm ci
npm test
node examples/basic.js
npm pack --dry-run
```

The 20 automated tests use `node:test` and strict assertions. They cover valid policies, input validation, missing permissions, duplicates, conflicts, counting, immutability, reports, and CLI behavior with real temporary files and child processes.

## Source structure

```text
npm-package-project/
├── src/
│   ├── index.js             # Four public exports
│   ├── auditRoutes.js       # Combine checks and calculate summary
│   ├── checkPermissions.js  # Validate input and access policies
│   ├── checkDuplicates.js   # Group routes and find conflicts
│   └── generateReport.js    # Format readable terminal output
├── bin/cli.js               # Arguments, JSON file reading, exit codes
├── tests/package.test.js    # API and CLI tests
├── examples/
│   ├── basic.js
│   └── routes.json
├── package.json
├── package-lock.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .gitignore
```

## Limitations

This audits only supplied route declarations. It does not scan source code, discover Express routes, execute middleware, validate tokens, enforce access rules, or assess application security. It does not infer route equivalence, inherited policies, Express mount paths, or wildcard matching. A public policy on a sensitive route is only detected as a conflict if another definition declares a different valid policy. Keep route declarations synchronized with the actual application.

## Contributing

Open an issue describing a problem or propose a small change. Add a meaningful test for changed behavior and run `npm test`. Keep the project simple and dependency-free.

## License

MIT. See [LICENSE](LICENSE).
