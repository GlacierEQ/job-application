import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderIndex, renderTarget, renderResume, renderResumeText, validateTargets } from '../scripts/render-role-fit-briefs.mjs';

const source = JSON.parse(await readFile(new URL('../site-v15/data/role-fit-targets.json', import.meta.url), 'utf8'));
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

test('five researched roles produce source-bound employer-specific briefs', () => {
  const registry = validateTargets(source);
  assert.equal(registry.targets.length, 5);
  const pages = [renderIndex(registry), ...registry.targets.map(target => renderTarget(target, registry.researched_on)), ...registry.targets.map(renderResume)];
  for (const page of pages) {
    assert.equal([...page.matchAll(/<h1\b/g)].length, 1);
    assert.match(page, /href="\/resume\/"/);
    assert.match(page, /mailto:glacier\.equilibrium@gmail\.com/);
    assert.doesNotMatch(page, /<script\b|\sstyle\s*=|\sonclick\s*=/i);
    assert.match(page, /<link rel="stylesheet" href="\/assets\/site\.complete\.css">/);
    assert.match(page, /<\/body>\s*<\/html>/);
  }
  for (const target of registry.targets) {
    const page = renderTarget(target, registry.researched_on);
    assert.ok(page.includes(target.company));
    assert.ok(page.includes(target.job_url.replace(/&/g, '&amp;')));
    const expectedMove = target.first_move.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
    assert.ok(page.includes(expectedMove));
    assert.match(page, /Independent technical fit|INDEPENDENT TECHNICAL FIT/);
    assert.match(page, /not employer work, affiliation or endorsement/);
    assert.match(page, new RegExp('Published role researched ' + registry.researched_on));
    for (const proof of target.proofs) assert.ok(page.includes(proof.url));
    const resume = renderResume(target);
    const ats = renderResumeText(target);
    assert.equal(target.experience.length, 3);
    for (const bullet of target.experience) assert.ok(ats.includes(bullet) && resume.includes(escapeHtml(bullet)));
    assert.doesNotMatch(ats, /source-governed engineering proof|machine-facing portfolio surfaces|Architect and implement Python\/TypeScript agent infrastructure|Develop recovery mechanisms for ambiguous provider outcomes/);
    assert.doesNotMatch(resume, /source-governed engineering proof|machine-facing portfolio surfaces|Architect and implement Python\/TypeScript agent infrastructure|Develop recovery mechanisms for ambiguous provider outcomes/);
    for (const proof of target.proofs) assert.ok(!proof.url.includes('job-app-helix') && !proof.url.includes('job-application'));
    assert.match(resume, /CASEY|Casey del Carpio Barton/);
    assert.match(resume, /University of Hawaiʻi at Mānoa/);
    assert.match(resume, /href="\/role-fit\/[^" ]+\/resume\.txt"/);
    assert.match(ats, /GLACIEREQ \| Founder/);
    assert.match(ats, /TARGET:/);
    for (const proof of target.proofs) assert.ok(resume.includes(proof.url) && ats.includes(proof.url));
  }
  assert.ok(!registry.targets.flatMap(target => target.proofs).some(proof => proof.url.includes('/apex-control-plane')));
});

test('the employer-fit data rejects forged source paths and unsafe content', () => {
  for (const [mutate, reason] of [
    [row => { row.targets[0].slug = '../elsewhere'; }, 'role_fit_slug_invalid'],
    [row => { delete row.targets[0].slug; }, 'role_fit_slug_invalid'],
    [row => { row.targets[0].proofs[0].url = 'javascript:alert(1)'; }, 'proof_url_invalid'],
    [row => { row.targets[0].proofs[0].url = 'https://github.com/GlacierEQ/ECHO/blob/main/../secret'; }, 'proof_url_invalid'],
    [row => { row.targets[0].job_url = 'https://bad.example/role'; }, 'job_source_invalid'],
    [row => { row.targets[0].proofs = []; }, 'proofs_missing'],
    [row => { row.targets[1].slug = row.targets[0].slug; }, 'role_fit_slug_invalid'],
  ]) {
    const value = structuredClone(source);
    mutate(value);
    assert.throws(() => validateTargets(value), new RegExp(reason));
  }
  const hostile = structuredClone(source.targets[0]);
  hostile.problem = '<script>alert("x")</script>';
  hostile.company = 'Hostile & "quoted"';
  const html = renderTarget(hostile);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Hostile &amp; &quot;quoted&quot;'));
  assert.doesNotMatch(html, /<script\b/i);
});
