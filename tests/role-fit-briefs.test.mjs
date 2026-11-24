import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderIndex, renderTarget, validateTargets } from '../scripts/render-role-fit-briefs.mjs';

const source = JSON.parse(await readFile(new URL('../site-v15/data/role-fit-targets.json', import.meta.url), 'utf8'));

test('five researched roles produce source-bound employer-specific briefs', () => {
  const registry = validateTargets(source);
  assert.equal(registry.targets.length, 5);
  const pages = [renderIndex(registry), ...registry.targets.map(renderTarget)];
  for (const page of pages) {
    assert.equal([...page.matchAll(/<h1\b/g)].length, 1);
    assert.match(page, /href="\/resume\/"/);
    assert.match(page, /mailto:glacier\.equilibrium@gmail\.com/);
    assert.doesNotMatch(page, /<script\b|\sstyle\s*=|\sonclick\s*=/i);
    assert.match(page, /<link rel="stylesheet" href="\/assets\/site\.complete\.css">/);
    assert.match(page, /<\/body>\s*<\/html>/);
  }
  for (const target of registry.targets) {
    const page = renderTarget(target);
    assert.ok(page.includes(target.company));
    assert.ok(page.includes(target.job_url.replace(/&/g, '&amp;')));
    const expectedMove = target.first_move.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
    assert.ok(page.includes(expectedMove));
    assert.match(page, /Independent technical fit|INDEPENDENT TECHNICAL FIT/);
    for (const proof of target.proofs) assert.ok(page.includes(proof.url));
  }
});

test('the employer-fit data rejects forged source paths and unsafe content', () => {
  for (const mutate of [
    row => { row.targets[0].slug = '../elsewhere'; },
    row => { row.targets[0].proofs[0].url = 'javascript:alert(1)'; },
    row => { row.targets[0].job_url = 'https://bad.example/role'; },
    row => { row.targets[0].proofs = []; },
    row => { row.targets[1].slug = row.targets[0].slug; },
  ]) {
    const value = structuredClone(source);
    mutate(value);
    assert.throws(() => validateTargets(value));
  }
  const hostile = structuredClone(source.targets[0]);
  hostile.problem = '<script>alert("x")</script>';
  hostile.company = 'Hostile & "quoted"';
  const html = renderTarget(hostile);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Hostile &amp; &quot;quoted&quot;'));
  assert.doesNotMatch(html, /<script\b/i);
});
