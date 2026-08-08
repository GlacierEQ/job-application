const crypto = require('node:crypto');
const Module = require('node:module');

const BRIDGE_URL = 'https://raw.githubusercontent.com/GlacierEQ/job-application/d8c84f3032570b70033b6036ad528d94bb6837bb/deployment/vercel-source-bridge/api/proxy.js';
const EXPECTED_BRIDGE_SHA256 = '8af9f491dc8532ef2e6e43f5d040f0c4c5a4ff634ecc37a3d0f2f3ddcd93de96';
let handlerPromise = null;

async function loadHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(BRIDGE_URL, {
          headers: { 'User-Agent': 'GlacierEQ-V21-Immutable-Bridge-Bootstrap/1.1' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`canonical bridge returned ${response.status}`);
        const sourceBytes = Buffer.from(await response.arrayBuffer());
        const actualHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
        if (actualHash !== EXPECTED_BRIDGE_SHA256) {
          throw new Error('canonical bridge integrity check failed');
        }
        const source = sourceBytes.toString('utf8');
        const compiled = new Module(BRIDGE_URL, module);
        compiled.filename = BRIDGE_URL;
        compiled.paths = module.paths;
        compiled._compile(source, BRIDGE_URL);
        if (typeof compiled.exports !== 'function') throw new Error('canonical bridge export is not a handler');
        return compiled.exports;
      } finally {
        clearTimeout(timer);
      }
    })().catch((error) => {
      handlerPromise = null;
      throw error;
    });
  }
  return handlerPromise;
}

module.exports = async function bootstrap(req, res) {
  try {
    const handler = await loadHandler();
    return await handler(req, res);
  } catch (error) {
    console.error('Immutable bridge bootstrap failure', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    res.end('Immutable bridge bootstrap unavailable');
  }
};
