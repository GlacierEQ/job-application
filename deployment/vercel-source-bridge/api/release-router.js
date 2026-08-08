const proxy = require('./proxy.js');
const designProxy = require('./design-proxy.js');
const estateProxy = require('./estate-proxy.js');
const typographyProxy = require('./typography-proxy.js');

module.exports = async function releaseRouter(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v21_verify') return proxy(req, res);
  if (rawPath === '__design_verify') return designProxy(req, res);
  if (rawPath === '__v22_verify') return estateProxy(req, res);
  return typographyProxy(req, res);
};
