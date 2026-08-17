const nativeFetch = globalThis.fetch;

if (typeof nativeFetch !== 'function') {
  throw new Error('github_fetch_resilience_native_fetch_missing');
}

const RAW_HOST = 'raw.githubusercontent.com';
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;
const MIN_RAW_GAP_MS = 225;

let rawTail = Promise.resolve();
let lastRawStartedAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requestUrl(input) {
  if (typeof input === 'string' || input instanceof URL) return new URL(String(input));
  if (input && typeof input.url === 'string') return new URL(input.url);
  return null;
}

async function paceRawRequest() {
  const wait = Math.max(0, MIN_RAW_GAP_MS - (Date.now() - lastRawStartedAt));
  if (wait > 0) await sleep(wait);
  lastRawStartedAt = Date.now();
}

async function fetchRawWithRecovery(input, init) {
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await paceRawRequest();
    try {
      const response = await nativeFetch(input, init);
      lastResponse = response;
      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) return response;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
    }

    const retryAfter = Number(lastResponse?.headers?.get?.('retry-after'));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 8_000)
      : Math.min(350 * (2 ** (attempt - 1)), 4_000);
    await sleep(backoff);
  }

  if (lastError) throw lastError;
  return lastResponse;
}

globalThis.fetch = function resilientGitHubFetch(input, init) {
  const url = requestUrl(input);
  if (!url || url.hostname !== RAW_HOST) return nativeFetch(input, init);

  const run = rawTail.then(() => fetchRawWithRecovery(input, init));
  rawTail = run.catch(() => undefined);
  return run;
};
