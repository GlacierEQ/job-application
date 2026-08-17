#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTFOLIO_PATH = path.join(ROOT, 'site-v15/data/portfolio.json');
const WITHHELD = 'PRIVATE_REPOSITORY_IDENTITY_WITHHELD';
const OWNER = 'GlacierEQ';
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  throw new Error(`private_capability_boundary:${message}`);
}

function ownedRepositoryFromUrl(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^https:\/\/github\.com\/GlacierEQ\/([A-Za-z0-9_.-]+)(?:\/.*)?$/);
  return match ? `${OWNER}/${match[1]}` : null;
}

async function githubRepositoryVisibility(repository, fetchImpl = globalThis.fetch) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GlacierEQ-job-application-private-capability-boundary',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetchImpl(`https://api.github.com/repos/${repository}`, { headers });
      if (response.status === 404) return { public: false, observed: true, reason: 'not_publicly_addressable' };
      if (response.ok) {
        const body = await response.json();
        if (body?.full_name !== repository) fail(`identity_mismatch:${repository}`);
        return {
          public: body.private === false,
          observed: true,
          reason: body.private === false ? 'live_public_repository' : 'live_nonpublic_repository',
        };
      }
      if (!RETRYABLE.has(response.status) || attempt === 4) {
        fail(`visibility_http_${response.status}:${repository}`);
      }
      lastError = new Error(`http_${response.status}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('private_capability_boundary:')) throw error;
      lastError = error;
      if (attempt === 4) break;
    }
    await sleep(Math.min(500 * (2 ** (attempt - 1)), 4_000));
  }
  fail(`visibility_unresolved:${repository}:${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function sanitizePortfolio(portfolio, resolveVisibility = githubRepositoryVisibility) {
  if (!portfolio || typeof portfolio !== 'object' || Array.isArray(portfolio)) fail('portfolio_invalid');
  if (!Array.isArray(portfolio.flagships)) fail('flagships_missing');

  const beforeIds = portfolio.flagships.map((row) => row?.id);
  const beforeCount = beforeIds.length;
  const seen = new Set();
  const redacted = [];
  const verifiedPublic = [];

  for (const row of portfolio.flagships) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('flagship_row_invalid');
    if (typeof row.id !== 'string' || !row.id) fail('flagship_id_missing');
    if (seen.has(row.id)) fail(`duplicate_flagship:${row.id}`);
    seen.add(row.id);

    if (row.repo === WITHHELD) {
      row.identity_disclosure = {
        state: 'WITHHELD',
        capability_preserved: true,
        repository_identity_published: false,
        reason: 'nonpublic_repository_identity',
      };
      redacted.push(row.id);
      continue;
    }

    const repository = ownedRepositoryFromUrl(row.repo);
    if (!repository) continue;

    const visibility = await resolveVisibility(repository);
    if (!visibility?.observed) fail(`visibility_not_observed:${row.id}`);
    if (visibility.public) {
      verifiedPublic.push(row.id);
      row.identity_disclosure = {
        state: 'PUBLIC_VERIFIED',
        capability_preserved: true,
        repository_identity_published: true,
        reason: visibility.reason,
      };
      continue;
    }

    row.repo = WITHHELD;
    row.public_surface = 'PRIVATE_IDENTITY_WITHHELD';
    row.identity_disclosure = {
      state: 'WITHHELD',
      capability_preserved: true,
      repository_identity_published: false,
      reason: visibility.reason,
    };
    redacted.push(row.id);
  }

  const afterIds = portfolio.flagships.map((row) => row.id);
  if (portfolio.flagships.length !== beforeCount) fail('capability_cardinality_changed');
  if (JSON.stringify(afterIds) !== JSON.stringify(beforeIds)) fail('capability_identity_order_changed');

  portfolio.release = portfolio.release && typeof portfolio.release === 'object' ? portfolio.release : {};
  portfolio.release.private_capability_boundary = {
    schema: 'glaciereq.private-capability-boundary.v1',
    capability_cardinality_preserved: true,
    repository_visibility_verified_live: true,
    nonpublic_repository_identities_withheld: redacted.length,
    public_repository_identities_verified: verifiedPublic.length,
    policy: 'preserve capability; publish repository identity only when live-public visibility is observed',
  };

  return {
    portfolio,
    receipt: {
      status: 'PASS',
      flagships: beforeCount,
      redacted_system_ids: redacted.sort(),
      verified_public_system_ids: verifiedPublic.sort(),
      capability_cardinality_preserved: true,
    },
  };
}

async function main() {
  const portfolio = JSON.parse(await readFile(PORTFOLIO_PATH, 'utf8'));
  const { portfolio: output, receipt } = await sanitizePortfolio(portfolio);
  await writeFile(PORTFOLIO_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(receipt, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

export { WITHHELD, githubRepositoryVisibility, ownedRepositoryFromUrl };
