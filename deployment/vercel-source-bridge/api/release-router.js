const proxy = require('./proxy.js');
const designProxy = require('./design-proxy.js');

module.exports = async function releaseRouter(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v21_verify') return proxy(req, res);
  return designProxy(req, res);
};
