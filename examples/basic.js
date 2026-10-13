const { auditRoutes } = require('../src');
const routes = require('./routes.json');
console.log(JSON.stringify(auditRoutes(routes), null, 2));
