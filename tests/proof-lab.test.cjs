'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/verify-proof.js');
const { inspectClaim, CLAIMS, render } = handler;

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
function fakeRes() {
  return {
    headers: {},
    statusCode: 200,
    body: '',
    setHeader(key, val) { this.headers[key.toLowerCase()] = val; },
    end(value) { this.body = value; return this; }
  };
}

test('only public allowlisted receipt sources can be queried', () => {
  assert.deepEqual(Object.keys(CLAIMS), ['public-action', 'provider-recovery', 'dispatch-fencing']);
  for (const value of Object.values(CLAIMS)) {
    assert.match(value.repository, /^GlacierEQ\/[a-z0-9-]+$/);
    assert.match(value.sha, /^[a-f0-9]{40}$/);
    assert.ok(value.boundary.length > 35);
  }
});
test('completed successful workflow at exact expected SHA is matched', async () => {
  const sha = CLAIMS['public-action'].sha;
  const result = await inspectClaim('public-action', async (url, options) => {
    assert.match(url, /api\.github\.com\/repos\/GlacierEQ\/public-actions-runner-host\/actions\/runs\/31280194602$/);
    assert.ok(options.signal);
    return response({ status:'completed', conclusion:'success', head_sha:sha });
  });
  assert.equal(result.status, 'MATCH');
  assert.equal(result.observed_commit, sha);
});
test('failing workflow, wrong SHA, or pending run never matches', async () => {
  const sha=CLAIMS['public-action'].sha;
  for(const input of [
    {status:'completed', conclusion:'failure', head_sha:sha},
    {status:'in_progress', conclusion:null, head_sha:sha},
    {status:'completed', conclusion:'success', head_sha:'0'.repeat(40)},
  ]) {
    assert.equal((await inspectClaim('public-action', async()=>response(input))).status,'NOT_MATCHED');
  }
});
test('commit proof reports presence only, not tests or live traffic', async () => {
  const sha=CLAIMS['provider-recovery'].sha;
  const result=await inspectClaim('provider-recovery', async()=>response({sha}));
  assert.equal(result.status,'MATCH');
  assert.match(result.boundary,/not a live production/);
  assert.doesNotMatch(result.detail, /tests passed|customers acquired/i);
});
test('rate limiting and service outages do not fabricate success', async () => {
  const limited=await inspectClaim('dispatch-fencing',async()=>response({},403));
  assert.equal(limited.status,'UNAVAILABLE');
  const unavailable=await inspectClaim('dispatch-fencing',async()=>{throw new Error('timeout')});
  assert.equal(unavailable.status,'UNAVAILABLE');
});
test('unknown proof fails without issuing a network request', async () => {
  const result=await inspectClaim('https://evil.invalid', async()=>{throw Error('must not fetch')});
  assert.equal(result.status,'INVALID');
});
test('GET HTML is accessible and clearly bounded', async () => {
  const request={method:'GET',query:{claim:'provider-recovery'}}, res=fakeRes();
  const oldFetch=global.fetch;
  try {
    global.fetch=async()=>response({sha:CLAIMS['provider-recovery'].sha});
    await handler(request,res);
  } finally { global.fetch=oldFetch; }
  assert.equal(res.statusCode,200);
  assert.match(res.headers['content-type'],/text\/html/);
  assert.match(res.body,/<main[^>]+id="main"/);
  assert.match(res.body,/Evidence boundary/);
  assert.match(res.body,/MATCHED RECEIPT/);
  assert.doesNotMatch(res.body,/<script\b|style="/i);
});
test('JSON mode returns machine contract and observed source', async () => {
  const res=fakeRes(), oldFetch=global.fetch;
  try {
    global.fetch=async()=>response({sha:CLAIMS['dispatch-fencing'].sha});
    await handler({method:'GET',query:{claim:'dispatch-fencing',format:'json'}},res);
  } finally {global.fetch=oldFetch;}
  const report=JSON.parse(res.body);
  assert.equal(report.status,'MATCH');
  assert.equal(report.schema,'glaciereq.public-proof-inspector.v1');
  assert.equal(report.expected_commit,CLAIMS['dispatch-fencing'].sha);
});
test('non-GET methods fail before any network action', async()=>{
  const res=fakeRes();
  await handler({method:'POST',query:{}},res);
  assert.equal(res.statusCode,405);
  assert.equal(res.headers.allow,'GET');
});
test('public UI is script-free, accessible and links into inspector', ()=>{
  const html=fs.readFileSync(path.join(__dirname,'../site-v15/proof-lab/index.html'),'utf8');
  assert.match(html,/<label for="claim">/);
  assert.match(html,/method="get" action="\/api\/verify-proof"/);
  assert.match(html,/href="\/assets\/site.complete.css"/);
  assert.match(html,/<main id="main">/);
  assert.doesNotMatch(html,/<script\b|style="/i);
});
