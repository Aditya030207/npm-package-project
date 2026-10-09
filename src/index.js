const auditRoutes = require('./auditRoutes');

function findMissingPermissions(routes) {
  return auditRoutes(routes).findings.missingPermissions;
}

function findDuplicateRoutes(routes) {
  return auditRoutes(routes).findings.duplicateRoutes;
}

function findConflictingPermissions(routes) {
  return auditRoutes(routes).findings.conflictingPermissions;
}

module.exports = { auditRoutes, findMissingPermissions, findDuplicateRoutes, findConflictingPermissions };
