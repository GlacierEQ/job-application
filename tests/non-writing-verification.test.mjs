import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('apply-complete-web-design.mjs --check fails closed without writing to disk when stylesheet is missing', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'design-check-nonwriting-'));
  try {
    const siteDir = path.join(temp, 'site-v15');
    await mkdir(siteDir, { recursive: true });
    const htmlPath = path.join(siteDir, 'index.html');
    const missingStylesheetHtml = [
      '<!doctype html><html><head>',
      '  <link rel="stylesheet" href="/assets/site.css">',
      '  <link rel="stylesheet" href="/assets/site.systems.css">',
      '</head><body><h1>Fixture</h1></body></html>',
    ].join('\n');
    await writeFile(htmlPath, missingStylesheetHtml, 'utf8');
    const beforeStat = await stat(htmlPath);

    const run = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/apply-complete-web-design.mjs'), '--check', '--site', siteDir],
      { encoding: 'utf8' },
    );

    assert.notEqual(run.status, 0, 'expected --check to exit non-zero on missing stylesheet');
    assert.match(`${run.stderr}\n${run.stdout}`, /index\.html/);
    const afterText = await readFile(htmlPath, 'utf8');
    const afterStat = await stat(htmlPath);
    assert.equal(afterText, missingStylesheetHtml, '--check must never modify drifted HTML on disk');
    assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs, '--check must not touch file mtime');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('apply-complete-web-design.mjs --check passes cleanly when all required stylesheets exist', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'design-check-clean-'));
  try {
    const siteDir = path.join(temp, 'site-v15');
    await mkdir(siteDir, { recursive: true });
    const htmlPath = path.join(siteDir, 'index.html');
    const completeHtml = [
      '<!doctype html><html><head>',
      '  <link rel="stylesheet" href="/assets/site.css">',
      '  <link rel="stylesheet" href="/assets/site.systems.css">',
      '  <link rel="stylesheet" href="/assets/site.complete.css">',
      '  <link rel="stylesheet" href="/assets/site.interaction.css">',
      '  <link rel="stylesheet" href="/assets/site.algerian.css">',
      '</head><body><h1>Fixture</h1></body></html>',
    ].join('\n');
    await writeFile(htmlPath, completeHtml, 'utf8');

    const run = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/apply-complete-web-design.mjs'), '--check', '--site', siteDir],
      { encoding: 'utf8' },
    );

    assert.equal(run.status, 0, run.stderr);
    assert.equal(await readFile(htmlPath, 'utf8'), completeHtml);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('activate-atlas-runtime.mjs --check fails closed without mutating drifted Atlas HTML', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'atlas-runtime-check-'));
  try {
    const atlasPath = path.join(temp, 'index.html');
    const unactivated = `<!doctype html><html><head><link rel="stylesheet" href="/assets/helix-atlas.stars.css"></head><body><span>2 governed lenses · zero client scripts</span><div class="atlas-directory"><a class="atlas-directory-item"><b class="evidence-state repository-rich">Verified Track</b></a></div></body></html>`;
    await writeFile(atlasPath, unactivated, 'utf8');

    const run = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/activate-atlas-runtime.mjs'), '--check', '--file', atlasPath],
      { encoding: 'utf8' },
    );

    assert.notEqual(run.status, 0, 'expected --check to fail on unactivated Atlas HTML');
    assert.equal(await readFile(atlasPath, 'utf8'), unactivated, '--check must not write to disk');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('package.json and ci.yml separate generate:site from 100% non-writing test and check commands', async () => {
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const ci = await readFile(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');

  assert.equal(typeof pkg.scripts['generate:site'], 'string');
  assert.ok(pkg.scripts['generate:site'].length > 0);

  for (const scriptName of ['test', 'test:invention-map', 'test:atlas-generated']) {
    const cmd = pkg.scripts[scriptName];
    assert.equal(typeof cmd, 'string', `missing script ${scriptName}`);
    for (const mutator of [
      'apply-complete-web-design.mjs',
      'activate-atlas-runtime.mjs',
      'compress-recruiter-surface.mjs',
      'render-invention-evidence-map.mjs',
      'render-helix-atlas.mjs',
      'link-helix-atlas.mjs',
      'prune-unavailable-github-links.mjs',
      'complete-sitemap.mjs',
    ]) {
      const barePattern = new RegExp(`node\\s+scripts\\/${mutator.replaceAll('.', '\\.')}(?!\\s+--check)`);
      assert.doesNotMatch(
        cmd,
        barePattern,
        `${scriptName} invokes mutating generator ${mutator} without --check`,
      );
    }
  }

  assert.doesNotMatch(
    ci,
    /node\s+scripts\/prune-unavailable-github-links\.mjs(?!\s+--check)/,
    'ci.yml must not run write-mode prune-unavailable-github-links.mjs before --check',
  );
  assert.match(ci, /node\s+scripts\/prune-unavailable-github-links\.mjs\s+--check/);
  assert.match(ci, /git status --porcelain/);
});
