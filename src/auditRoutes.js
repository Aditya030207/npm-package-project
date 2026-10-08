const { validateRoutes, checkPermissions } = require('./checkPermissions');
const checkDuplicates = require('./checkDuplicates');

function auditRoutes(routes) {
  const { validRoutes, invalidRoutes } = validateRoutes(routes);
  const { validPermissions, missingPermissions, invalidPermissions } = checkPermissions(validRoutes);
  const { duplicateRoutes, conflictingPermissions } = checkDuplicates(validRoutes);
  const findings = { missingPermissions, invalidPermissions, invalidRoutes, duplicateRoutes, conflictingPermissions };
  return {
    summary: {
      totalRoutes: routes.length,
      validPermissions,
      missingPermissions: missingPermissions.length,
      invalidPermissions: invalidPermissions.length,
      invalidRoutes: invalidRoutes.length,
      duplicateRoutes: duplicateRoutes.reduce((sum, group) => sum + group.extraDefinitions, 0),
      conflictingRoutes: conflictingPermissions.length,
      coveragePercentage: routes.length === 0 ? 0 : Math.round(validPermissions / routes.length * 1000) / 10
    },
    findings,
    hasIssues: Object.values(findings).some(items => items.length > 0)
  };
}

module.exports = auditRoutes;
