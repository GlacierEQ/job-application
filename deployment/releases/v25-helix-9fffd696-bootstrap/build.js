'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const zlib = require('node:zlib');

const REPOSITORY = 'GlacierEQ/job-application';
const TRANSPORT_COMMIT = '176e96b1d137217985a9a5e438f5821f27f355d7';
const TRANSPORT_PATH = 'deployment/transport/v25-9fffd696';
const EXPECTED_MANIFEST_SHA256 =
  '52588e36669b3c69565030795008d8358db6e37d37e43f2a1605628948abc207';
const EXPECTED_API_SHA256 =
  '4ef605a0e89c73846b1a827789bb52e39dcca65ce784a8f8f0a2acccf83f422d';
const EXPECTED_HELIX =
  '9fffd69665c6f1b6c1d62bf88795762469422752';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'glaciereq-v25-transport/2' } }, (res) => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location &&
        redirects < 3
      ) {
        res.resume();
        resolve(fetchText(res.headers.location, redirects + 1));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`fetch failed ${res.statusCode}: ${url}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function readAuthorityFile(file) {
  const localRoot = process.env.TRANSPORT_DIR;
  if (localRoot) {
    return Promise.resolve(fs.readFileSync(path.join(localRoot, file), 'utf8'));
  }
  const base = [
    'https://raw.githubusercontent.com',
    REPOSITORY,
    TRANSPORT_COMMIT,
    TRANSPORT_PATH,
  ].join('/');
  return fetchText(`${base}/${file}`);
}

async function main() {
  const manifestText = await readAuthorityFile('manifest.json');
  if (sha256(manifestText) !== EXPECTED_MANIFEST_SHA256) {
    throw new Error('manifest SHA-256 mismatch');
  }

  const manifest = JSON.parse(manifestText);
  if (manifest.schema !== 'glaciereq.v25-build-time-transport.v2') {
    throw new Error('unexpected transport schema');
  }
  if (manifest.helix_commit !== EXPECTED_HELIX) {
    throw new Error('Helix authority mismatch');
  }
  if (
    manifest.invariants?.build_time_only !== true ||
    manifest.invariants?.runtime_bootstrap_network_fetch_required !== false ||
    manifest.invariants?.part_sha256_verified_before_decode !== true ||
    manifest.invariants?.api_index_sha256_verified_before_build !== true
  ) {
    throw new Error('transport invariant mismatch');
  }
  if (manifest.api_index?.sha256 !== EXPECTED_API_SHA256) {
    throw new Error('API authority mismatch');
  }

  const parts = [];
  for (const part of manifest.parts) {
    const text = await readAuthorityFile(part.file);
    if (text.length !== part.chars) {
      throw new Error(`part length mismatch: ${part.file}`);
    }
    if (sha256(text) !== part.sha256) {
      throw new Error(`part SHA-256 mismatch: ${part.file}`);
    }
    parts.push(text);
  }

  const encoded = parts.join('');
  if (encoded.length !== manifest.base64_length) {
    throw new Error('base64 length mismatch');
  }

  const compressed = Buffer.from(encoded, 'base64');
  if (compressed.length !== manifest.compression?.compressed_bytes) {
    throw new Error('compressed byte count mismatch');
  }
  const source = zlib.brotliDecompressSync(compressed);
  if (source.length !== manifest.api_index.bytes) {
    throw new Error('API byte count mismatch');
  }
  if (sha256(source) !== EXPECTED_API_SHA256) {
    throw new Error('reconstructed API SHA-256 mismatch');
  }

  fs.mkdirSync('api', { recursive: true });
  fs.writeFileSync('api/index.js', source);

  process.stdout.write(`${JSON.stringify({
    schema: 'glaciereq.v25-build-time-bootstrap-readback.v1',
    status: 'PASS',
    transport_commit: TRANSPORT_COMMIT,
    helix_commit: EXPECTED_HELIX,
    manifest_sha256: EXPECTED_MANIFEST_SHA256,
    reconstructed_api_sha256: EXPECTED_API_SHA256,
    part_count: manifest.parts.length,
    runtime_bootstrap_network_fetch_required: false,
    authority_source: process.env.TRANSPORT_DIR ? 'offline_fixture' : 'immutable_github',
  })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
