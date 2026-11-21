import assert from 'node:assert/strict';
import test from 'node:test';
import { admittedAtlasCompany } from '../scripts/public-atlas-admission.mjs';
const row = (track_state, count, stage='MAPPED_ONLY') => ({track_state, repositories:Array.from({length:count},()=>({})), second_depth:{stage}});
test('excludes scaffold, seeded, and blocked states even when repo count or stage is high',()=>{
  for (const state of ['MAPPED_NOT_RECRUITER_READY','CANDIDATE_TARGET_REQUIRES_DIRECT_EVIDENCE','NO_DIRECT_EXHIBIT_VERIFIED']) {
    assert.equal(admittedAtlasCompany(row(state, 10, 'CLAIM_PROMOTED')),false);
  }
  assert.equal(admittedAtlasCompany(row('OTHER',0)),false);
  assert.equal(admittedAtlasCompany(row('OTHER',1)),false);
});
test('admits nonblocked repository-rich and verified-depth tracks',()=>{
  assert.equal(admittedAtlasCompany(row('MAPPED_WITH_RECRUITER_READY_PUBLIC_SUBSET',2,'CODE_INSPECTED')),true);
  assert.equal(admittedAtlasCompany(row('OTHER',0,'PROOF_REPRODUCED')),true);
});
test('fails closed on malformed rows',()=>assert.equal(admittedAtlasCompany({}),false));
