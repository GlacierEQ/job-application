import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_PIN = '7cbb2e1000edc254ed1990a12e4e145937ee153a';

test('portfolio-source.json pins immutable 40-char Helix commit matching checked-in snapshot and receipt', async () => {
  const [pointer, snapshot, receipt] = await Promise.all([
    readFile(path.join(ROOT, 'portfolio-source.json'), 'utf8').then(JSON.parse),
    readFile(path.join(ROOT, 'site-v15/data/helix-root.json'), 'utf8').then(JSON.parse),
    readFile(path.join(ROOT, 'site-v15/data/helix-root.receipt.json'), 'utf8').then(JSON.parse),
  ]);

  assert.match(pointer.authority?.pinned_commit ?? '', /^[a-f0-9]{40}$/);
  assert.equal(pointer.authority.pinned_commit, EXPECTED_PIN);
  assert.equal(pointer.authority.pinned_commit, snapshot.source.root_ref);
  assert.equal(pointer.authority.pinned_commit, receipt.source_commit);
});

test('resolveHelixSha uses authority.pinned_commit by default without calling commit_api_url', async () => {
  const { resolveHelixSha } = await import('../scripts/sync-helix-projection.mjs');
  const authority = {
    commit_api_url: 'https://api.github.com/repos/GlacierEQ/job-app-helix/commits/main',
    pinned_commit: EXPECTED_PIN,
  };

  let networkCalled = false;
  const sha = await resolveHelixSha(authority, {
    argv: ['node', 'scripts/sync-helix-projection.mjs'],
    env: {},
    fetchImpl: async () => {
      networkCalled = true;
      throw new Error('commit_api_url must not be queried during default pinned reproduction');
    },
  });

  assert.equal(sha, EXPECTED_PIN);
  assert.equal(networkCalled, false);
});

test('resolveHelixSha prioritizes HELIX_ROOT_SHA and rejects malformed pinned_commit or HELIX_ROOT_SHA', async () => {
  const { resolveHelixSha } = await import('../scripts/sync-helix-projection.mjs');
  const overrideSha = 'a'.repeat(40);
  const authority = {
    commit_api_url: 'https://api.github.com/repos/GlacierEQ/job-app-helix/commits/main',
    pinned_commit: EXPECTED_PIN,
  };

  const resolvedOverride = await resolveHelixSha(authority, {
    argv: ['node', 'scripts/sync-helix-projection.mjs'],
    env: { HELIX_ROOT_SHA: overrideSha },
    fetchImpl: async () => {
      throw new Error('must not fetch commit_api_url when HELIX_ROOT_SHA is supplied');
    },
  });
  assert.equal(resolvedOverride, overrideSha);

  for (const badPin of ['', 'main', '1234', 'A'.repeat(40), 'g'.repeat(40), null, undefined]) {
    await assert.rejects(
      () =>
        resolveHelixSha(
          { ...authority, pinned_commit: badPin },
          {
            argv: ['node', 'scripts/sync-helix-projection.mjs'],
            env: {},
            fetchImpl: async () => {
              throw new Error('must not fall back to commit_api_url on malformed pinned_commit');
            },
          },
        ),
      /pinned_commit/,
    );
  }

  await assert.rejects(
    () =>
      resolveHelixSha(authority, {
        argv: ['node', 'scripts/sync-helix-projection.mjs'],
        env: { HELIX_ROOT_SHA: 'not-a-sha' },
        fetchImpl: async () => {
          throw new Error('must not fetch');
        },
      }),
    /HELIX_ROOT_SHA/,
  );
});

test('resolveHelixSha queries commit_api_url only on --refresh-latest or HELIX_REFRESH_LATEST=1 and supports --write-pin', async () => {
  const { resolveHelixSha, writePinnedCommit } = await import('../scripts/sync-helix-projection.mjs');
  const latestSha = 'b'.repeat(40);
  const authority = {
    commit_api_url: 'https://api.github.com/repos/GlacierEQ/job-app-helix/commits/main',
    pinned_commit: EXPECTED_PIN,
  };

  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({ sha: latestSha }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const viaFlag = await resolveHelixSha(authority, {
    argv: ['node', 'scripts/sync-helix-projection.mjs', '--refresh-latest'],
    env: {},
    fetchImpl: fakeFetch,
  });
  assert.equal(viaFlag, latestSha);
  assert.equal(calls.length, 1);

  const viaEnv = await resolveHelixSha(authority, {
    argv: ['node', 'scripts/sync-helix-projection.mjs'],
    env: { HELIX_REFRESH_LATEST: '1' },
    fetchImpl: fakeFetch,
  });
  assert.equal(viaEnv, latestSha);
  assert.equal(calls.length, 2);

  const tempDir = await mkdtemp(path.join(tmpdir(), 'helix-pin-write-'));
  try {
    const pointerCopy = path.join(tempDir, 'portfolio-source.json');
    const originalText = await readFile(path.join(ROOT, 'portfolio-source.json'), 'utf8');
    await writeFile(pointerCopy, originalText, 'utf8');
    await writePinnedCommit(pointerCopy, latestSha);
    const updated = JSON.parse(await readFile(pointerCopy, 'utf8'));
    assert.equal(updated.authority.pinned_commit, latestSha);
    assert.equal(updated.consumer, 'GlacierEQ/job-application');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('Helix sync workflow keeps PR and push runs pinned while opting scheduled/manual runs into refresh', async () => {
  const syncWorkflow = await readFile(
    path.join(ROOT, '.github/workflows/helix-projection-sync.yml'),
    'utf8',
  );
  assert.match(syncWorkflow, /HELIX_REFRESH_LATEST/);
  assert.match(syncWorkflow, /schedule/);
  assert.match(syncWorkflow, /workflow_dispatch/);
});
