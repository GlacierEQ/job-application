import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BINARY_EXTS = new Set(['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.woff', '.woff2', '.ico']);

function trackedTextFiles() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((file) => file && !BINARY_EXTS.has(path.extname(file).toLowerCase()));
}

test('zero tracked text files contain workstation or home-directory paths', async () => {
  const workstationPattern = /\/Users\/|\/home\/[A-Za-z0-9_.-]+\/|C:\\Users\\|~\/(?:GlacierEQ_Swarm|job-app|workspace|\.config)\b/;
  const selfRel = 'tests/audit-claims-and-paths.test.mjs';
  const hits = [];

  for (const rel of trackedTextFiles()) {
    if (rel === selfRel) continue;
    const text = await readFile(path.join(ROOT, rel), 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      if (workstationPattern.test(line)) {
        hits.push(`${rel}:${idx + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }

  assert.deepEqual(hits, [], `workstation paths leaked in tracked files:\n${hits.join('\n')}`);
});

test('PROJECT_MANIFEST.yaml accurately records public visibility for GlacierEQ/job-application', async () => {
  const manifest = await readFile(path.join(ROOT, 'PROJECT_MANIFEST.yaml'), 'utf8');
  assert.doesNotMatch(manifest, /visibility:\s*["']?PRIVATE["']?/i);
  assert.doesNotMatch(manifest, /is_private:\s*true/i);
  assert.match(manifest, /visibility:\s*"PUBLIC"/);
  assert.match(manifest, /is_private:\s*false/);
});

test('legacy outreach, negotiation, showcase, and audit templates have zero unsupported deployment/count/rental claims', async () => {
  const legacyDocs = [
    'OUTREACH_STRATEGY.md',
    'SALARY_NEGOTIATION.md',
    'PROJECT_SHOWCASE.md',
    'GITHUB_README.md',
    'STRATEGIC_APPLICATION_PLAN.md',
    'TECHNICAL_BRIEF.md',
    'TECHNICAL_DEEP_DIVE_COOLING.md',
    'TECHNICAL_DEEP_DIVE_POWER.md',
    'TECHNICAL_DEEP_DIVE_WATER.md',
    'CASE_STUDY_WATER.md',
    'XAI_COLOSSUS_AUDIT.md',
    'XAI_COLUSSUS_AUDIT.md',
    'RESUME_STRATEGIC.md',
    'SKILLS_MATRIX.md',
    'REFERENCE_LETTER_TEMPLATE.md',
    'COVER_LETTER.md',
    'COVER_LETTERS_CUSTOM.md',
    'INTERVIEW_PREP.md',
    'JOB_SEARCH_STRATEGY.md',
    'LINKEDIN_PROFILE.md',
    'FOLLOW_UP_TEMPLATES.md',
    'ENGINEERING_INNOVATIONS.md',
  ];

  const forbiddenClaims = [
    /\b3-hour deploys\b/i,
    /\b10-minute deploys\b/i,
    /\b3 hours to 10 minutes\b/i,
    /\b27 repositories in one session\b/i,
    /\b27 repos(?:itories)?\b/i,
    /\b1,052\b/,
    /\b43k\s*(?:LOC|lines)\b/i,
    /\b43,874\b/,
    /\bRenting Colossus\b/i,
    /\brent Colossus\b/i,
    /\brenting capacity at Colossus\b/i,
    /\bAnthropic renting ALL compute\b/i,
    /\bGoogle renting some capacity\b/i,
    /\bBuilt infrastructure for 200k GPUs\b/i,
    /\bI build infrastructure that scales to 200,000\+\s*GPUs\b/i,
    /\bI Scale to 200k GPUs\b/i,
    /\b200k GPU experience\b/i,
    /casey@hi-classhomeservices\.com/i,
  ];

  const violations = [];
  for (const rel of legacyDocs) {
    const text = await readFile(path.join(ROOT, rel), 'utf8');
    if (rel !== 'XAI_COLOSSUS_AUDIT.md' && !text.includes('RETIRED HISTORICAL DRAFT')) {
      violations.push(`${rel}: missing RETIRED HISTORICAL DRAFT notice`);
    }
    for (const pattern of forbiddenClaims) {
      const match = text.match(pattern);
      if (match) {
        violations.push(`${rel}: matched forbidden legacy claim ${pattern} ("${match[0]}")`);
      }
    }
  }

  assert.deepEqual(violations, [], `unreconciled legacy claims:\n${violations.join('\n')}`);
});
