import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const affected = {
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

test('blocked company dossiers stay private after Helix projection regeneration', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'glaciereq-source-surface-'));
  try {
    await mkdir(path.join(temp, 'scripts'));
    await mkdir(path.join(temp, 'site-v15', 'data'), { recursive: true });
    await mkdir(path.join(temp, 'site-v15', 'assets'));
    for (const file of ['render-helix-atlas.mjs', 'recovered-forward-deployed-source-links.mjs', 'public-atlas-admission.mjs']) {
      await copyFile(path.join(root, 'scripts', file), path.join(temp, 'scripts', file));
    }
    const snapshot = JSON.parse(await readFile(path.join(root, 'site-v15/data/helix-root.json'), 'utf8'));
    for (const [companyId, names] of Object.entries(affected)) {
      const company = snapshot.companies.find(c => c.company_id === companyId);
      assert.ok(company, 'Helix company exists: ' + companyId);
      company.repositories = company.repositories.filter(r => !names.includes(r.repository.split('/').pop()));
    }
    await writeFile(path.join(temp, 'site-v15/data/helix-root.json'), JSON.stringify(snapshot));
    const run = spawnSync(process.execPath, [path.join(temp, 'scripts/render-helix-atlas.mjs')], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);

    // Blocked company dossiers remain in the private Helix source, not public routes.
    const source = JSON.parse(await readFile(path.join(temp, 'site-v15/data/helix-root.json'), 'utf8'));
    for (const [companyId, names] of Object.entries(affected)) {
      const original = snapshot.companies.find(c => c.company_id === companyId);
      const retained = source.companies.find(c => c.company_id === companyId);
      assert.deepEqual(retained.repositories, original.repositories, 'internal source remains intact');
      assert.equal(retained.track_state, 'MAPPED_NOT_RECRUITER_READY');
      for (const name of names) assert.ok(!retained.repositories.some(r => r.repository.endsWith('/' + name)));
      await assert.rejects(readFile(path.join(temp, 'site-v15/companies', companyId, 'index.html'), 'utf8'), { code: 'ENOENT' });
    }
    await assert.rejects(readFile(path.join(temp, 'site-v15/companies/openai/record.json'), 'utf8'), { code: 'ENOENT' });

  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
