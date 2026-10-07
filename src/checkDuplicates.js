const { ACCESS_TYPES } = require('./checkPermissions');

function checkDuplicates(routes) {
  const groups = new Map();
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(route);
  }
  const duplicateRoutes = [];
  const conflictingPermissions = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const { method, path } = group[0];
    const indices = group.map(route => route.index);
    duplicateRoutes.push({ method, path, indices, extraDefinitions: group.length - 1 });
    // Only supported policies can conflict; other values have their own findings.
    const permissions = [...new Set(group.map(route => route.access).filter(access => ACCESS_TYPES.includes(access)))];
    if (permissions.length > 1) {
      conflictingPermissions.push({ method, path, indices, permissions });
    }
  }
  return { duplicateRoutes, conflictingPermissions };
}

module.exports = checkDuplicates;
