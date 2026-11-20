'use strict';

// Narrow adapter for the existing, public-source-only application compiler.
// All other site routes continue to use Vercel's verified static deployment.
const compilerProxy = require('../deployment/vercel-source-bridge/api/compiler-proxy.js');
const VIEWS = Object.freeze({
  html: 'compiler/index.html',
  json: 'data/application-compiler.json',
  css: 'assets/application-compiler.css',
  motion: 'assets/site.emerald-motion.css',
});

function compilerRewriteUrl(input) {
  const original = new URL(String(input || '/'), 'https://glaciereq.invalid');
  const view = original.searchParams.get('__view') || 'html';
  const target = VIEWS[view];
  if (!target) return null;
  original.searchParams.delete('__view');
  original.searchParams.set('path', target);
  return '/?' + original.searchParams.toString();
}

module.exports = async function handler(req, res) {
  const normalized = compilerRewriteUrl(req.url);
  if (!normalized) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    return res.end('Not found');
  }
  const delegatedRequest = Object.assign(Object.create(req), { url: normalized });
  return compilerProxy(delegatedRequest, res);
};

module.exports.compilerRewriteUrl = compilerRewriteUrl;
