import process from 'node:process';

const nativeFetch = globalThis.fetch;
if (typeof nativeFetch !== 'function') throw new Error('global fetch is unavailable');

const SECOND_DEPTH_SUFFIX = '/manifests/company_second_depth.json';
const OVERRIDE_INDEX_SUFFIX = '/manifests/company_second_depth_overrides/index.json';

function requestUrl(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input.url === 'string') return input.url;
  return String(input);
}

async function fetchJson(url, init) {
  const response = await nativeFetch(url, init);
  if (!response.ok) throw new Error(`effective company second-depth fetch failed ${response.status}: ${url}`);
  return response.json();
}

async function effectiveSecondDepth(url, init) {
  const baseResponse = await nativeFetch(url, init);
  if (!baseResponse.ok) return baseResponse;
  const base = await baseResponse.json();
  if (base?.schema !== 'glaciereq.company-second-depth.v1') {
    throw new Error(`unexpected base company second-depth schema: ${base?.schema ?? 'missing'}`);
  }

  const rawBase = url.slice(0, -SECOND_DEPTH_SUFFIX.length);
  const indexResponse = await nativeFetch(`${rawBase}${OVERRIDE_INDEX_SUFFIX}`, init);
  if (indexResponse.status === 404) {
    return new Response(`${JSON.stringify(base, null, 2)}\n`, {status: 200, headers: {'content-type': 'application/json'}});
  }
  if (!indexResponse.ok) throw new Error(`modular override index fetch failed ${indexResponse.status}`);

  const index = await indexResponse.json();
  if (index?.schema !== 'glaciereq.company-second-depth-overrides.v1') {
    throw new Error(`unexpected modular override index schema: ${index?.schema ?? 'missing'}`);
  }
  if (!Array.isArray(index.overrides)) throw new Error('modular override index missing overrides array');

  const merged = structuredClone(base);
  merged.company_overrides ??= {};
  for (const row of index.overrides) {
    const companyId = row?.company_id;
    const relativePath = row?.path;
    if (typeof companyId !== 'string' || !companyId) throw new Error('modular override missing company_id');
    if (typeof relativePath !== 'string' || !relativePath.startsWith('manifests/company_second_depth_overrides/')) {
      throw new Error(`invalid modular override path for ${companyId}`);
    }
    if (Object.prototype.hasOwnProperty.call(merged.company_overrides, companyId)) {
      throw new Error(`company ${companyId} has both inline and modular overrides`);
    }
    const payload = await fetchJson(`${rawBase}/${relativePath}`, init);
    if (payload?.schema !== 'glaciereq.company-second-depth-company.v1') {
      throw new Error(`unexpected company override schema for ${companyId}`);
    }
    if (payload.company_id !== companyId) throw new Error(`company override identity mismatch for ${companyId}`);
    if (!payload.state || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
      throw new Error(`company override state missing for ${companyId}`);
    }
    merged.company_overrides[companyId] = payload.state;
  }

  merged.effective_override_source = {
    schema: index.schema,
    authority: index.authority,
    company_ids: index.overrides.map((row) => row.company_id).sort(),
    helix_root_sha: process.env.HELIX_ROOT_SHA ?? null,
  };

  return new Response(`${JSON.stringify(merged, null, 2)}\n`, {
    status: 200,
    headers: {'content-type': 'application/json'},
  });
}

globalThis.fetch = async (input, init) => {
  const url = requestUrl(input);
  if (url.includes(SECOND_DEPTH_SUFFIX)) return effectiveSecondDepth(url, init);
  return nativeFetch(input, init);
};

try {
  await import('./sync-helix-projection.mjs');
} finally {
  globalThis.fetch = nativeFetch;
}
