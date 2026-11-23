import assert from 'node:assert/strict';
import test from 'node:test';
import { admittedAtlasCompany } from '../scripts/public-atlas-admission.mjs';

const repo = (name, visibility = 'public', inventory_scope = 'HELIX_ADMITTED') =>
  ({ repository: `GlacierEQ/${name}`, visibility, inventory_scope });
const company = (repositories, stage = 'MAPPED_ONLY', track_state = 'MAPPED_WITH_RECRUITER_READY_PUBLIC_SUBSET') =>
  ({ repositories, second_depth: { stage }, track_state });

test('excludes blocked recruiter states despite qualifying repositories and stage', () => {
  for (const state of ['MAPPED_NOT_RECRUITER_READY', 'CANDIDATE_TARGET_REQUIRES_DIRECT_EVIDENCE', 'NO_DIRECT_EXHIBIT_VERIFIED']) {
    assert.equal(admittedAtlasCompany(company([repo('one'), repo('two')], 'CLAIM_PROMOTED', state)), false);
  }
});

test('admits two distinct source-admitted public repositories', () => {
  assert.equal(admittedAtlasCompany(company([repo('one'), repo('two')])), true);
});

test('rejects duplicate evidence rows as a substitute for distinct repositories', () => {
  assert.equal(admittedAtlasCompany(company([repo('one'), repo('one')])), false);
});

test('admits verified depth only when at least one public repository is admitted', () => {
  assert.equal(admittedAtlasCompany(company([repo('one')], 'PROOF_REPRODUCED')), true);
  assert.equal(admittedAtlasCompany(company([], 'PROOF_REPRODUCED')), false);
  assert.equal(admittedAtlasCompany(company([repo('one', 'private')], 'CLAIM_PROMOTED')), false);
});

test('rejects estate-only and malformed repository records', () => {
  assert.equal(admittedAtlasCompany(company([repo('one'), repo('two', 'public', 'ESTATE_DISCOVERED_NOT_HELIX_ADMITTED')])), false);
  assert.equal(admittedAtlasCompany(company([{ repository: '../../private', visibility: 'public', inventory_scope: 'HELIX_ADMITTED' }])), false);
  assert.equal(admittedAtlasCompany({}), false);
});
