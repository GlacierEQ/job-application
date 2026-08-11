const proxy = require('./proxy.js');
const designProxy = require('./design-proxy.js');
const estateProxy = require('./estate-proxy.js');
const truthRuntime = require('./truth-runtime.js');
const typographyProxy = require('./typography-proxy.js');
const compilerProxy = require('./compiler-proxy.js');
const titleFontProxy = require('./title-font-proxy.js');
const monumentTitleProxy = require('./monument-title-proxy.js');

const V26_ASSETS = new Set([
  'assets/title-algerian.woff2',
  'assets/site.title-font.css',
]);

module.exports = async function releaseRouter(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v21_verify') return proxy(req, res);
  if (rawPath === '__design_verify') return designProxy(req, res);
  if (rawPath === '__v22_verify') return estateProxy(req, res);
  if (rawPath === '__v23_verify') return truthRuntime(req, res);
  if (rawPath === '__v24_verify') return typographyProxy(req, res);
  if (rawPath === '__v25_verify') return compilerProxy(req, res);
  if (rawPath === '__v26_verify' || V26_ASSETS.has(rawPath)) return titleFontProxy(req, res);
  if (rawPath === '__v27_verify') return monumentTitleProxy(req, res);
  return monumentTitleProxy(req, res);
};

module.exports.V26_ASSETS = V26_ASSETS;