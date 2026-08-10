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

for (const path of ['__v25_verify', '__v26_verify']) {
  const response = await capture(path);
  let payload;
  try {
    payload = JSON.parse(response.body.toString('utf8'));
  } catch (error) {
    throw new Error(`${path}: invalid JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (response.status !== 200 || payload?.status !== 'PASS') {
    throw new Error(`${path}: ${JSON.stringify({ status: response.status, payload })}`);
  }
  console.log(JSON.stringify({
    verifier: path,
    status: payload.status,
    schema: payload.schema,
    release: payload.release,
    compiler_helix_commit: payload.compiler_helix_commit ?? null,
    inherited_v25: payload.inherited_v25 ?? null,
  }));
}
