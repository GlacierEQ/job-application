'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const zlib = require('node:zlib');

const REPOSITORY = 'GlacierEQ/job-application';
const TRANSPORT_COMMIT = '668fb80279b7c67af19c4c3c474765fa498240f3';
const TRANSPORT_PATH = 'deployment/transport/v27-9fffd696';
const EXPECTED_MANIFEST_SHA256 =
  '5c99276c94524a7e58c68c94719f0a163d8b36fe6a1885b9743ad1ab1d6bca07';
const EXPECTED_COMPRESSED_SHA256 =
  '808a9482b9dd17109eb9133ea751648065aa5f49e8874ba429aecfd7663aff47';
const EXPECTED_API_SHA256 =
  '387fb5058286f10f73cf5cc287f7e83d633d68ce96bb6c9d75966d646af16068';
const EXPECTED_HELIX =
  '9fffd69665c6f1b6c1d62bf88795762469422752';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { 'user-agent': 'glaciereq-v27-transport/1' } },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location &&
          redirects < 3
        ) {
          response.resume();
          resolve(fetchText(response.headers.location, redirects + 1));
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`fetch failed ${response.statusCode}: ${url}`));
          response.resume();
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      },
    );
    request.on('error', reject);
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
  if (manifest.schema !== 'glaciereq.v27-build-time-transport.v1') {
    throw new Error('unexpected transport schema');
  }
  if (manifest.presentation_generation !== 'V27-MONUMENTAL-ALGERIAN') {
    throw new Error('presentation generation mismatch');
  }
  if (manifest.helix_commit !== EXPECTED_HELIX) {
    throw new Error('Helix authority mismatch');
  }
  if (
    manifest.invariants?.build_time_only !== true ||
    manifest.invariants?.runtime_bootstrap_network_fetch_required !== false ||
    manifest.invariants?.part_sha256_verified_before_decode !== true ||
    manifest.invariants?.compressed_sha256_verified_before_decompress !== true ||
    manifest.invariants?.api_index_sha256_verified_before_build !== true
  ) {
    throw new Error('transport invariant mismatch');
  }
  if (manifest.compression?.sha256 !== EXPECTED_COMPRESSED_SHA256) {
    throw new Error('compressed authority mismatch');
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
  if (sha256(compressed) !== EXPECTED_COMPRESSED_SHA256) {
    throw new Error('compressed SHA-256 mismatch');
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
    schema: 'glaciereq.v27-build-time-bootstrap-readback.v1',
    status: 'PASS',
    transport_commit: TRANSPORT_COMMIT,
    helix_commit: EXPECTED_HELIX,
    presentation_generation: manifest.presentation_generation,
    manifest_sha256: EXPECTED_MANIFEST_SHA256,
    compressed_sha256: EXPECTED_COMPRESSED_SHA256,
    reconstructed_api_sha256: EXPECTED_API_SHA256,
    reconstructed_api_bytes: source.length,
    part_count: manifest.parts.length,
    runtime_bootstrap_network_fetch_required: false,
    authority_source: process.env.TRANSPORT_DIR ? 'offline_fixture' : 'immutable_github',
  })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
