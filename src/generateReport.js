function generateReport(result) {
  const { summary: s, findings: f } = result;
  const lines = [
    '==================================', '     PERMISSION GAP DETECTOR', '==================================', '',
    `Total Routes Checked: ${s.totalRoutes}`, `Valid Permissions: ${s.validPermissions}`,
    `Missing Permissions: ${s.missingPermissions}`, `Invalid Permissions: ${s.invalidPermissions}`,
    `Invalid Route Definitions: ${s.invalidRoutes}`, `Duplicate Routes (extra definitions): ${s.duplicateRoutes}`,
    `Conflicting Policies (route groups): ${s.conflictingRoutes}`, '',
    `Permission Coverage: ${s.coveragePercentage}%`, '', 'Issues Found:'
  ];
  for (const route of f.missingPermissions) lines.push(`[WARNING] ${route.method} ${route.path}: Missing permission declaration (index ${route.index}).`);
  for (const route of f.invalidPermissions) lines.push(`[ERROR] ${route.method} ${route.path}: Invalid permission; use public, authenticated, or admin (index ${route.index}).`);
  for (const route of f.invalidRoutes) lines.push(`[ERROR] Index ${route.index}: ${route.message}`);
  for (const route of f.duplicateRoutes) lines.push(`[WARNING] ${route.method} ${route.path}: Duplicate route definition (indices ${route.indices.join(', ')}).`);
  for (const route of f.conflictingPermissions) lines.push(`[ERROR] ${route.method} ${route.path}: Conflicting permissions: ${route.permissions.join(', ')}.`);
  if (!result.hasIssues) lines.push('No issues found.');
  lines.push('', '==================================', 'Audit Complete', '==================================');
  return lines.join('\n');
}

module.exports = generateReport;
