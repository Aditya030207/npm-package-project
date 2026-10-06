const ACCESS_TYPES = ['public', 'authenticated', 'admin'];
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];

function validateRoutes(routes) {
  if (!Array.isArray(routes)) throw new TypeError('Routes must be an array.');
  const validRoutes = [];
  const invalidRoutes = [];
  for (let index = 0; index < routes.length; index++) {
    const route = routes[index];
    if (!route || typeof route !== 'object' || Array.isArray(route) ||
        typeof route.method !== 'string' || !METHODS.includes(route.method.toUpperCase()) ||
        typeof route.path !== 'string' || !route.path.startsWith('/') || /\s/.test(route.path)) {
      invalidRoutes.push({ index, message: 'Expected an object with a supported HTTP method and a path starting with / without whitespace.' });
      continue;
    }
    validRoutes.push({ index, method: route.method.toUpperCase(), path: route.path, access: route.access });
  }
  return { validRoutes, invalidRoutes };
}

function checkPermissions(routes) {
  const missingPermissions = [];
  const invalidPermissions = [];
  let validPermissions = 0;
  for (const route of routes) {
    const { index, method, path, access } = route;
    if (access === undefined || access === null || (typeof access === 'string' && access.trim() === '')) {
      missingPermissions.push({ index, method, path });
    } else if (!ACCESS_TYPES.includes(access)) {
      invalidPermissions.push({ index, method, path, access });
    } else {
      validPermissions++;
    }
  }
  return { validPermissions, missingPermissions, invalidPermissions };
}

module.exports = { validateRoutes, checkPermissions, ACCESS_TYPES };
