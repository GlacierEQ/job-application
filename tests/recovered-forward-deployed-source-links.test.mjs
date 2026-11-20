import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  recoveredForwardDeployedSource,
  rewriteForwardDeployedSourceAnchors,
} from '../scripts/recovered-forward-deployed-source-links.mjs';

const names = {
  spacex: [
    'spacex-starship-flight-software', 'spacex-ai-flight-controller',
    'spacex-engine-out-compensator', 'spacex-stage-separation-optimizer',
    'spacex-flight-termination-hardener', 'spacex-hitl-testbed-automation',
    'spacex-in-space-refueling-planner',
  ],
  nvidia: [
    'nvidia-blackwell-fp4-optimizer', 'nvidia-cuda-graphs-conditional',
    'nvidia-moe-grouped-gemm', 'nvidia-nvlink-scaler',
    'nvidia-tensorrt-llm-tuner', 'nvidia-kernel-autotuner',
    'nvidia-power-perf-profiler',
  ],
};

test('all fourteen bundled capabilities link to real commit-pinned source, not fictional standalone repos', () => {
  for (const [family, entries] of Object.entries(names)) {
    for (const entry of entries) {
      const result = recoveredForwardDeployedSource(entry);
      assert.equal(result.family, family);
      assert.match(result.url, /github\.com\/GlacierEQ\/job-app-helix\/blob\/[a-f0-9]{40}\/src\/job_app_helix\/forward_deployed\//);
      assert.match(result.url, new RegExp('/' + family + '/__init__\\.py$'));
    }
  }
});

test('preserve every unavailable bundled repository row, relink to actual source, and disclose bundling', () => {
  for (const entries of Object.values(names)) {
    for (const entry of entries) {
      const html = '<ul><li class="repository"><a class="source-link" href="https://github.com/GlacierEQ/' + entry + '">Inspect canonical repository</a></li></ul>';
      const rewritten = rewriteForwardDeployedSourceAnchors(html);
      assert.match(rewritten, /<li class="repository">/);
      assert.match(rewritten, /job-app-helix\/blob\//);
      assert.match(rewritten, /Bundled source; standalone repository not published/);
      assert.doesNotMatch(rewritten, new RegExp('href="https://github\\.com/GlacierEQ/' + entry + '"'));
    }
  }
});

test('do not expose private identities, rewrite unknown systems, or cap other repositories', () => {
  for (const name of ['AKOS', 'FILEBOSS', 'spacex-new-capability', 'GlacierEQ_Swarm']) {
    assert.equal(recoveredForwardDeployedSource(name), null);
    const html = '<a href="https://github.com/GlacierEQ/' + name + '">View</a>';
    assert.equal(rewriteForwardDeployedSourceAnchors(html), html);
  }
});

test('actual pruning command preserves recovered public engineering evidence and excludes private links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'glaciereq-source-continuity-'));
  try {
    const scripts = join(root, 'scripts');
    const site = join(root, 'site-v15');
    await mkdir(scripts);
    await mkdir(site);
    for (const script of ['prune-unavailable-github-links.mjs', 'unavailable-github-repositories.mjs', 'recovered-forward-deployed-source-links.mjs']) {
      await copyFile(new URL('../scripts/' + script, import.meta.url), join(scripts, script));
    }
    const file = join(site, 'examples.html');
    const refs = [
      ...names.spacex.map(name => '<li><a href="https://github.com/GlacierEQ/' + name + '">Inspect canonical repository</a></li>'),
      ...names.nvidia.map(name => '<li><a href="https://github.com/GlacierEQ/' + name + '">Inspect canonical repository</a></li>'),
      '<li><a href="https://github.com/GlacierEQ/AKOS">Private reference</a></li>',
    ];
    await writeFile(file, '<ul>' + refs.join('') + '</ul>');
    const command = join(scripts, 'prune-unavailable-github-links.mjs');
    const repaired = spawnSync(process.execPath, [command], { encoding: 'utf8' });
    assert.equal(repaired.status, 0, repaired.stderr);
    const html = await readFile(file, 'utf8');
    for (const [family, entries] of Object.entries(names)) {
      for (const name of entries) {
        assert.match(html, new RegExp(name + ': Bundled source; standalone repository not published'));
        assert.doesNotMatch(html, new RegExp('href="https://github\\.com/GlacierEQ/' + name + '"'));
      }
      assert.equal(html.split('forward_deployed/' + family + '/__init__.py').length - 1, entries.length);
    }
    assert.doesNotMatch(html, /href="https:\/\/github\.com\/GlacierEQ\/AKOS"/);
    const checked = spawnSync(process.execPath, [command, '--check'], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
