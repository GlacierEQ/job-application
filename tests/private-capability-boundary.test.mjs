import assert from 'node:assert/strict';
import test from 'node:test';

import { WITHHELD, ownedRepositoryFromUrl, sanitizePortfolio } from '../scripts/preserve-private-capability-cards.mjs';

test('ownedRepositoryFromUrl resolves nested GlacierEQ links to repository identity', () => {
  assert.equal(ownedRepositoryFromUrl('https://github.com/GlacierEQ/AKOS/tree/main/stones/psysoc-x'), 'GlacierEQ/AKOS');
  assert.equal(ownedRepositoryFromUrl('https://github.com/other/repo'), null);
});

test('sanitizer preserves every capability card while withholding nonpublic repository identity', async () => {
  const source = {
    release: {},
    flagships: [
      { id: 'public-system', repo: 'https://github.com/GlacierEQ/public-system', public_surface: 'PUBLIC', summary: 'Public capability' },
      { id: 'private-system', repo: 'https://github.com/GlacierEQ/private-system', public_surface: 'PUBLIC', summary: 'Private capability must remain discoverable' },
      { id: 'nested-public-system', repo: 'https://github.com/GlacierEQ/AKOS/tree/main/stones/example', public_surface: 'PUBLIC_ALLOWLIST_REQUIRED', summary: 'Nested capability' },
    ],
  };
  const calls = [];
  const resolveVisibility = async (repository) => {
    calls.push(repository);
    return repository === 'GlacierEQ/private-system'
      ? { public: false, observed: true, reason: 'live_nonpublic_repository' }
      : { public: true, observed: true, reason: 'live_public_repository' };
  };
  const { portfolio, receipt } = await sanitizePortfolio(structuredClone(source), resolveVisibility);
  assert.deepEqual(calls, ['GlacierEQ/public-system', 'GlacierEQ/private-system', 'GlacierEQ/AKOS']);
  assert.equal(portfolio.flagships.length, source.flagships.length);
  assert.deepEqual(portfolio.flagships.map((row) => row.id), source.flagships.map((row) => row.id));
  const privateCard = portfolio.flagships.find((row) => row.id === 'private-system');
  assert.equal(privateCard.repo, WITHHELD);
  assert.equal(privateCard.public_surface, 'PRIVATE_IDENTITY_WITHHELD');
  assert.equal(privateCard.summary, 'Private capability must remain discoverable');
  assert.equal(privateCard.identity_disclosure.capability_preserved, true);
  assert.equal(privateCard.identity_disclosure.repository_identity_published, false);
  const publicCard = portfolio.flagships.find((row) => row.id === 'public-system');
  assert.equal(publicCard.repo, 'https://github.com/GlacierEQ/public-system');
  assert.equal(publicCard.identity_disclosure.state, 'PUBLIC_VERIFIED');
  assert.equal(receipt.capability_cardinality_preserved, true);
  assert.deepEqual(receipt.redacted_system_ids, ['private-system']);
  assert.equal(portfolio.release.private_capability_boundary.nonpublic_repository_identities_withheld, 1);
  assert.equal(portfolio.release.private_capability_boundary.public_repository_identities_verified, 2);
});

test('already-withheld cards remain preserved without repository lookup', async () => {
  const source = { flagships: [{ id: 'withheld-system', repo: WITHHELD, public_surface: 'PRIVATE_IDENTITY_WITHHELD', summary: 'Capability survives identity redaction' }] };
  const { portfolio, receipt } = await sanitizePortfolio(source, async () => { throw new Error('resolver must not be called'); });
  assert.equal(portfolio.flagships[0].summary, 'Capability survives identity redaction');
  assert.equal(portfolio.flagships[0].identity_disclosure.capability_preserved, true);
  assert.deepEqual(receipt.redacted_system_ids, ['withheld-system']);
});
