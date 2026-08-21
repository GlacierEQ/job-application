const workflowTopologyProxy = require('./workflow-topology-proxy.js');

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1024 * 1024;
const { PORTFOLIO_COMMIT } = workflowTopologyProxy.constants;
const PORTFOLIO_URL = `https://raw.githubusercontent.com/GlacierEQ/job-application/${PORTFOLIO_COMMIT}/site-v15/data/portfolio.json`;

let topologyPromise = null;

async function fetchPortfolio(fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(PORTFOLIO_URL, {
      headers: { 'user-agent': 'GlacierEQ-V30-RECRUITER-PROOF-RUNTIME/1.0' },
      signal: controller.signal,
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`recruiter_topology_http_${response.status}`);
    const declared = Number(response.headers?.get?.('content-length') || 0);
    if (declared && declared > MAX_BYTES) throw new Error('recruiter_topology_declared_too_large');
    const body = Buffer.from(await response.arrayBuffer());
    if (!body.length || body.length > MAX_BYTES) throw new Error('recruiter_topology_body_size');
    return JSON.parse(body.toString('utf8'));
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('recruiter_topology_fetch_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function loadTopology(fetchImpl = fetch) {
  if (!topologyPromise) {
    topologyPromise = fetchPortfolio(fetchImpl)
      .then(workflowTopologyProxy.buildTopology)
      .catch((error) => {
        topologyPromise = null;
        throw error;
      });
  }
  return topologyPromise;
}

// WHY: preserve the proven topology implementation as the sole topology builder while
// exposing a bounded loader that the V30 recruiter runtime can compose without cloning it.
workflowTopologyProxy.loadTopology = loadTopology;

module.exports = { loadTopology, fetchPortfolio, PORTFOLIO_URL };
