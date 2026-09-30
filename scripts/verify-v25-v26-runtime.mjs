#!/usr/bin/env node

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const releaseRouter = require('../deployment/vercel-source-bridge/api/release-router.js');

function capture(path) {
  return new Promise((resolve, reject) => {
    const headers = new Map();
    let settled = false;
    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers.set(String(name).toLowerCase(), value);
      },
      getHeader(name) {
        return headers.get(String(name).toLowerCase());
      },
      end(chunk = '') {
        if (settled) return;
        settled = true;
        resolve({
          status: this.statusCode,
          headers,
          body: Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
        });
      },
    };
    Promise.resolve(releaseRouter({ url: `/?path=${path}` }, res))
      .then(() => {
        if (!settled) reject(new Error(`${path}: handler did not end response`));
      })
      .catch(reject);
  });
}

const verifiers = [
  '__v21_verify',
  '__design_verify',
  '__v22_verify',
  '__v23_verify',
  '__v24_verify',
  '__v25_verify',
  '__v26_verify',
];
const failures = [];
for (const path of verifiers) {
  const response = await capture(path);
  let payload;
  try {
    payload = JSON.parse(response.body.toString('utf8'));
  } catch (error) {
    throw new Error(`${path}: invalid JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
  const result = {
    verifier: path,
    http_status: response.status,
    status: payload?.status ?? null,
    schema: payload?.schema ?? null,
    release: payload?.release ?? null,
    errors: Array.isArray(payload?.errors) ? payload.errors : [],
    compiler_helix_commit: payload?.compiler_helix_commit ?? null,
  };
  console.log(JSON.stringify(result));
  if (response.status !== 200 || payload?.status !== 'PASS') failures.push(result);
}
if (failures.length) {
  throw new Error(`release_chain_failed:${JSON.stringify(failures)}`);
}
